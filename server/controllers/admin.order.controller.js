import mongoose from "mongoose";
import { Order } from "../models/order.model.js";
import { Product } from "../models/product.model.js";
import { issueRefund } from "../utils/markOrderPaid.js";

const PAGE_SIZE = 20;
const PAYMENT_STATUSES = Order.schema.path("paymentStatus").enumValues;
const FULFILLMENT_STATUSES = Order.schema.path("fulfillmentStatus").enumValues;
const OBJECT_ID = /^[0-9a-f]{24}$/i;
const IST_OFFSET = 5.5 * 60 * 60 * 1000;
const DAY = 24 * 60 * 60 * 1000;

// Everything the list and the overview show per order.
const LIST_FIELDS =
  "createdAt paidAt amount currency paymentStatus fulfillmentStatus cancelReason razorpayRefundId refundRequestedAt items shippingAddress customer courier trackingNumber";

const toListItem = (order) => ({
  ...order,
  itemCount: order.items.reduce((sum, item) => sum + item.quantity, 0),
});

const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Turns the search box into a filter. The same box takes a full order id, the
// short #XXXXXXXX reference shown to customers, a phone number or a name.
const searchFilter = (raw) => {
  const search = raw.trim();
  if (OBJECT_ID.test(search)) return { _id: search };

  const short = search.match(/^#?([0-9a-f]{8})$/i);
  if (short) {
    // The short reference is the id's last 8 characters, so match the end of it.
    return { $expr: { $regexMatch: { input: { $toString: "$_id" }, regex: `${short[1].toLowerCase()}$` } } };
  }

  const digits = search.replace(/[\s+-]/g, "");
  if (/^\d+$/.test(digits)) return { "shippingAddress.phone": { $regex: escapeRegex(digits.slice(-10)) } };

  return { "shippingAddress.fullName": { $regex: escapeRegex(search), $options: "i" } };
};

// Every order received, newest first. Abandoned checkouts are left out unless
// asked for, so the list is what was actually paid.
export const listOrders = async (req, res) => {
  try {
    const { paymentStatus, fulfillmentStatus, search } = req.query;

    if (paymentStatus !== undefined && !PAYMENT_STATUSES.includes(paymentStatus)) {
      return res.status(400).json({ message: "Invalid payment status" });
    }
    if (fulfillmentStatus !== undefined && !FULFILLMENT_STATUSES.includes(fulfillmentStatus)) {
      return res.status(400).json({ message: "Invalid fulfillment status" });
    }

    const filter = { paymentStatus: paymentStatus ?? { $in: ["paid", "refunded"] } };
    if (fulfillmentStatus) filter.fulfillmentStatus = fulfillmentStatus;
    if (typeof search === "string" && search.trim()) Object.assign(filter, searchFilter(search));

    let page = parseInt(req.query.page);
    if (isNaN(page) || page < 1) page = 1;

    const [orders, total] = await Promise.all([
      Order.find(filter)
        .select(LIST_FIELDS)
        .populate("customer", "fullName email")
        .sort({ createdAt: -1, _id: -1 })
        .skip((page - 1) * PAGE_SIZE)
        .limit(PAGE_SIZE)
        .lean(),
      Order.countDocuments(filter),
    ]);

    return res.status(200).json({
      orders: orders.map(toListItem),
      page,
      totalPages: Math.ceil(total / PAGE_SIZE),
      total,
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

export const getOrder = async (req, res) => {
  try {
    if (!OBJECT_ID.test(req.params.id)) {
      return res.status(404).json({ message: "Order not found" });
    }
    const order = await Order.findById(req.params.id).populate("customer", "fullName email phone").lean();
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }
    return res.status(200).json({ order: toListItem(order) });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// Explains a refused status change in terms of where the order actually is.
const conflictMessage = async (id, wanted) => {
  const current = await Order.findById(id).select("paymentStatus fulfillmentStatus").lean();
  if (!current) return "Order not found";
  if (current.paymentStatus !== "paid") return `Can't mark as ${wanted}: this order is ${current.paymentStatus}`;
  return `Can't mark as ${wanted}: this order is ${current.fulfillmentStatus}`;
};

// Moves an order one step: processing -> shipped -> delivered. Each step is a
// single update that only matches the step before it, so a double click or a
// cancel arriving at the same moment can't skip or undo a step.
export const updateOrderStatus = async (req, res) => {
  try {
    const { fulfillmentStatus } = req.body;
    if (!OBJECT_ID.test(req.params.id)) {
      return res.status(404).json({ message: "Order not found" });
    }

    let from;
    const set = { fulfillmentStatus };

    if (fulfillmentStatus === "shipped") {
      const courier = typeof req.body.courier === "string" ? req.body.courier.trim() : "";
      const trackingNumber = typeof req.body.trackingNumber === "string" ? req.body.trackingNumber.trim() : "";
      if (!courier || courier.length > 60 || !trackingNumber || trackingNumber.length > 60) {
        return res.status(400).json({ message: "Courier and tracking number are required (up to 60 characters each)" });
      }
      from = "processing";
      Object.assign(set, { courier, trackingNumber, shippedAt: new Date() });
    } else if (fulfillmentStatus === "delivered") {
      from = "shipped";
      set.deliveredAt = new Date();
    } else {
      return res.status(400).json({ message: "Status can only be changed to shipped or delivered" });
    }

    const order = await Order.findOneAndUpdate(
      { _id: req.params.id, paymentStatus: "paid", fulfillmentStatus: from },
      { $set: set },
      { returnDocument: "after" }
    ).lean();

    if (!order) {
      return res.status(409).json({ message: await conflictMessage(req.params.id, fulfillmentStatus) });
    }
    return res.status(200).json({ order: toListItem(order) });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// Cancels a paid order that hasn't shipped: the money goes back and the stock
// goes back on the shelf. This is the only place stock is ever restored.
export const cancelOrder = async (req, res) => {
  if (!OBJECT_ID.test(req.params.id)) {
    return res.status(404).json({ message: "Order not found" });
  }

  const session = await mongoose.startSession();
  let order;
  try {
    // Claim and restock together: either both happen or neither does.
    await session.withTransaction(async () => {
      const now = new Date();
      order = await Order.findOneAndUpdate(
        { _id: req.params.id, paymentStatus: "paid", fulfillmentStatus: "processing" },
        {
          $set: {
            paymentStatus: "refunded",
            fulfillmentStatus: "cancelled",
            cancelReason: "admin",
            cancelledAt: now,
            // Tells the reconcile job this refund is in flight right now.
            refundRequestedAt: now,
          },
        },
        { returnDocument: "after", session }
      );
      if (!order) return;

      for (const item of order.items) {
        await Product.updateOne(
          { _id: item.product },
          { $inc: { [`sizes.${item.size}`]: item.quantity } },
          { session }
        );
      }
    });
  } catch (err) {
    await session.endSession();
    return res.status(500).json({ message: err.message });
  }
  await session.endSession();

  if (!order) {
    return res.status(409).json({ message: await conflictMessage(req.params.id, "cancelled") });
  }

  // The order is already cancelled and restocked. If the refund call fails,
  // the reconcile job retries it, so this isn't an error for the admin.
  try {
    await issueRefund(order);
  } catch (err) {
    console.error(`Refund for cancelled order ${order._id} failed:`, err.error?.description || err.message);
    return res.status(200).json({
      order: toListItem(order.toObject()),
      refundPending: true,
      message: "Order cancelled. The refund didn't go through yet and will be retried automatically.",
    });
  }

  return res.status(200).json({ order: toListItem(order.toObject()) });
};

// Midnight in India for the day `now` falls on, as a real instant. The server
// runs in UTC, so a plain "start of today" would be 5:30am IST.
export const istMidnight = (now = new Date()) => {
  const ist = new Date(now.getTime() + IST_OFFSET);
  return new Date(Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), ist.getUTCDate()) - IST_OFFSET);
};

const SIZES = ["S", "M", "L", "XL"];

// The dashboard's front page in one request.
export const getStats = async (req, res) => {
  try {
    const now = Date.now();
    const today = istMidnight(new Date(now));
    const week = new Date(now - 7 * DAY);
    const month = new Date(now - 30 * DAY);

    const sumSince = (since) => ({ $sum: { $cond: [{ $gte: ["$paidAt", since] }, "$amount", 0] } });

    const [revenueRows, statusRows, refundedCount, refundPending, products, recent] = await Promise.all([
      // Refunded money isn't revenue, so only orders still 'paid' count.
      Order.aggregate([
        { $match: { paymentStatus: "paid" } },
        { $group: { _id: null, all: { $sum: "$amount" }, today: sumSince(today), week: sumSince(week), month: sumSince(month) } },
      ]),
      Order.aggregate([
        { $match: { paymentStatus: { $in: ["paid", "refunded"] } } },
        { $group: { _id: "$fulfillmentStatus", count: { $sum: 1 } } },
      ]),
      Order.countDocuments({ paymentStatus: "refunded" }),
      Order.countDocuments({ paymentStatus: "refunded", razorpayRefundId: { $exists: false } }),
      Product.find({ archived: { $ne: true } }).select("name image sizes").lean(),
      Order.find({ paymentStatus: { $in: ["paid", "refunded"] } })
        .select(LIST_FIELDS)
        .populate("customer", "fullName email")
        .sort({ createdAt: -1, _id: -1 })
        .limit(5)
        .lean(),
    ]);

    const revenue = { today: 0, week: 0, month: 0, all: 0, ...(revenueRows[0] ?? {}) };
    delete revenue._id;

    const counts = { processing: 0, shipped: 0, delivered: 0, cancelled: 0, refunded: refundedCount };
    for (const { _id, count } of statusRows) {
      if (_id in counts && _id !== "refunded") counts[_id] = count;
    }

    // 1-3 left is "running low". 0 is listed apart: it can also mean the size
    // was never stocked, which isn't urgent the same way.
    const lowStock = [];
    const soldOut = [];
    for (const product of products) {
      for (const size of SIZES) {
        const left = product.sizes?.[size] ?? 0;
        const entry = { _id: product._id, name: product.name, image: product.image, size };
        if (left === 0) soldOut.push(entry);
        else if (left <= 3) lowStock.push({ ...entry, left });
      }
    }
    lowStock.sort((a, b) => a.left - b.left);

    return res.status(200).json({
      revenue,
      counts,
      refundPending,
      lowStock: lowStock.slice(0, 20),
      soldOut: soldOut.slice(0, 20),
      recent: recent.map(toListItem),
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};
