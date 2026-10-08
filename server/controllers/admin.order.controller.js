import mongoose from "mongoose";
import { Order } from "../models/order.model.js";
import { Product } from "../models/product.model.js";
import { serverError } from "../utils/serverError.js";
import { issueRefund } from "../utils/markOrderPaid.js";
import razorpay from "../utils/razorpay.js";

const PAGE_SIZE = 20;
const PAYMENT_STATUSES = Order.schema.path("paymentStatus").enumValues;
const FULFILLMENT_STATUSES = Order.schema.path("fulfillmentStatus").enumValues;
const RETURN_STATUSES = Order.schema.path("returnStatus").enumValues;
const OBJECT_ID = /^[0-9a-f]{24}$/i;
const IST_OFFSET = 5.5 * 60 * 60 * 1000;
const DAY = 24 * 60 * 60 * 1000;

// Everything the list and the overview show per order.
const LIST_FIELDS =
  "createdAt paidAt amount currency paymentStatus fulfillmentStatus cancelReason razorpayRefundId refundRequestedAt items shippingAddress customer courier trackingNumber returnStatus refundedAmount";

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
    // The dashboard sends every filter, with "" meaning "any", so blanks count as not set.
    const blankToUndefined = (value) => (value === "" ? undefined : value);
    const paymentStatus = blankToUndefined(req.query.paymentStatus);
    const fulfillmentStatus = blankToUndefined(req.query.fulfillmentStatus);
    const returnStatus = blankToUndefined(req.query.returnStatus);
    const { search } = req.query;

    if (paymentStatus !== undefined && !PAYMENT_STATUSES.includes(paymentStatus)) {
      return res.status(400).json({ message: "Invalid payment status" });
    }
    if (fulfillmentStatus !== undefined && !FULFILLMENT_STATUSES.includes(fulfillmentStatus)) {
      return res.status(400).json({ message: "Invalid fulfillment status" });
    }
    // 'any' = orders with at least one item returned.
    if (returnStatus !== undefined && returnStatus !== "any" && !RETURN_STATUSES.includes(returnStatus)) {
      return res.status(400).json({ message: "Invalid return status" });
    }

    const filter = { paymentStatus: paymentStatus ?? { $in: ["paid", "refunded"] } };
    if (fulfillmentStatus) filter.fulfillmentStatus = fulfillmentStatus;
    if (returnStatus) filter.returnStatus = returnStatus === "any" ? { $in: ["partial", "full"] } : returnStatus;
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
    return serverError(res, err);
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
    return serverError(res, err);
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
    return serverError(res, err);
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
    return serverError(res, err);
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

class ReturnError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

const cleanNote = (note) => (typeof note === "string" ? note.trim().slice(0, 300) : undefined) || undefined;

// Records items coming back after delivery. The admin picks lines and how many
// of each, and chooses every time whether they go back into stock. No money
// moves here; refunds are their own action.
//
// Body: { items: [{ index, quantity }], restock: boolean, note? }
// `index` is the line's position in order.items.
export const markReturned = async (req, res) => {
  if (!OBJECT_ID.test(req.params.id)) {
    return res.status(404).json({ message: "Order not found" });
  }

  const { items, restock, note } = req.body;
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ message: "Pick at least one item that came back" });
  }
  if (typeof restock !== "boolean") {
    return res.status(400).json({ message: "Say whether the items go back into stock" });
  }
  const seen = new Set();
  for (const line of items) {
    if (!Number.isInteger(line?.index) || !Number.isInteger(line?.quantity) || line.quantity < 1 || seen.has(line.index)) {
      return res.status(400).json({ message: "Each returned item needs a line and a whole quantity of at least 1" });
    }
    seen.add(line.index);
  }

  const session = await mongoose.startSession();
  let order;
  try {
    // Read, check and write in one transaction: two returns recorded at the
    // same moment can't both count the same units, because Mongo retries the
    // second one and it then sees the first one's numbers.
    await session.withTransaction(async () => {
      order = await Order.findOne({ _id: req.params.id }).session(session);
      if (!order) throw new ReturnError(404, "Order not found");
      if (order.paymentStatus !== "paid" || order.fulfillmentStatus !== "delivered") {
        throw new ReturnError(409, `Returns can only be recorded for delivered orders; this one is ${
          order.paymentStatus !== "paid" ? order.paymentStatus : order.fulfillmentStatus
        }`);
      }

      const logged = [];
      for (const { index, quantity } of items) {
        const line = order.items[index];
        if (!line) throw new ReturnError(400, "That item isn't in this order");
        const left = line.quantity - (line.returnedQuantity ?? 0);
        if (quantity > left) {
          throw new ReturnError(400, `Only ${left} of ${line.name} (${line.size}) can still be returned`);
        }
        line.returnedQuantity = (line.returnedQuantity ?? 0) + quantity;
        logged.push({ product: line.product, name: line.name, size: line.size, quantity });

        if (restock) {
          await Product.updateOne({ _id: line.product }, { $inc: { [`sizes.${line.size}`]: quantity } }, { session });
        }
      }

      order.returns.push({ items: logged, restocked: restock, note: cleanNote(note) });
      const everything = order.items.every((line) => line.returnedQuantity >= line.quantity);
      order.returnStatus = everything ? "full" : "partial";
      await order.save({ session });
    });
  } catch (err) {
    await session.endSession();
    if (err instanceof ReturnError) return res.status(err.status).json({ message: err.message });
    return serverError(res, err);
  }
  await session.endSession();

  return res.status(200).json({ order: toListItem(order.toObject()) });
};

// Refunds any amount of a delivered order, up to what hasn't been refunded yet.
// Separate from returns on purpose: refund without a return (e.g. a damaged
// item kept), or record a return and refund later or not at all.
//
// Body: { amount (rupees), note? }
export const refundAmount = async (req, res) => {
  if (!OBJECT_ID.test(req.params.id)) {
    return res.status(404).json({ message: "Order not found" });
  }

  const rupees = Number(req.body.amount);
  const paise = Math.round(rupees * 100);
  if (!Number.isFinite(rupees) || Math.abs(rupees * 100 - paise) > 1e-6 || paise < 100) {
    return res.status(400).json({ message: "Enter an amount of at least ₹1, up to 2 decimal places" });
  }
  const note = cleanNote(req.body.note);
  const refundId = new mongoose.Types.ObjectId();

  // Reserve the amount before calling Razorpay, in one conditional update:
  // two clicks at once can never refund more than the order was worth.
  const order = await Order.findOneAndUpdate(
    {
      _id: req.params.id,
      paymentStatus: "paid",
      fulfillmentStatus: "delivered",
      razorpayPaymentId: { $exists: true },
      $expr: { $lte: [{ $add: [{ $ifNull: ["$refundedAmount", 0] }, paise] }, "$amount"] },
    },
    {
      $inc: { refundedAmount: paise },
      $push: { refunds: { _id: refundId, amount: paise, note, status: "pending" } },
    },
    { returnDocument: "after" }
  );

  if (!order) {
    const current = await Order.findById(req.params.id).select("paymentStatus fulfillmentStatus amount refundedAmount").lean();
    if (!current) return res.status(404).json({ message: "Order not found" });
    if (current.paymentStatus !== "paid" || current.fulfillmentStatus !== "delivered") {
      return res.status(409).json({ message: "Refunds here are for delivered orders; cancel & refund handles unshipped ones" });
    }
    const left = (current.amount - (current.refundedAmount ?? 0)) / 100;
    return res.status(409).json({ message: `Only ₹${left} of this order is left to refund` });
  }

  const markProcessed = (razorpayRefundId) =>
    Order.findOneAndUpdate(
      { _id: order._id, "refunds._id": refundId },
      { $set: { "refunds.$.status": "processed", "refunds.$.razorpayRefundId": razorpayRefundId } },
      { returnDocument: "after" }
    ).lean();

  try {
    const refund = await razorpay.payments.refund(order.razorpayPaymentId, {
      amount: paise,
      notes: { reason: "Return / adjustment", orderId: order._id.toString() },
    });
    const updated = await markProcessed(refund.id);
    return res.status(200).json({ order: toListItem(updated) });
  } catch (err) {
    // The call failed, but it may have gone through anyway (e.g. a timeout).
    // Razorpay's own total says which, so we never undo a real refund.
    try {
      const payment = await razorpay.payments.fetch(order.razorpayPaymentId);
      if ((payment.amount_refunded ?? 0) >= order.refundedAmount) {
        const { items: refunds } = await razorpay.payments.fetchMultipleRefund(order.razorpayPaymentId);
        const match = refunds?.find((r) => r.amount === paise);
        const updated = await markProcessed(match?.id);
        return res.status(200).json({ order: toListItem(updated) });
      }
    } catch {
      // Can't tell; fall through and release the reservation.
    }

    await Order.updateOne(
      { _id: order._id },
      { $inc: { refundedAmount: -paise }, $pull: { refunds: { _id: refundId } } }
    );
    return res.status(502).json({ message: `Refund failed: ${err.error?.description || err.message}. Nothing was refunded; try again.` });
  }
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

    // What was kept: the order total minus anything refunded after delivery.
    const net = { $subtract: ["$amount", { $ifNull: ["$refundedAmount", 0] }] };
    const sumSince = (since) => ({ $sum: { $cond: [{ $gte: ["$paidAt", since] }, net, 0] } });

    const [revenueRows, statusRows, refundedCount, refundPending, returnedCount, products, recent] = await Promise.all([
      // Refunded money isn't revenue, so only orders still 'paid' count.
      Order.aggregate([
        { $match: { paymentStatus: "paid" } },
        { $group: { _id: null, all: { $sum: net }, today: sumSince(today), week: sumSince(week), month: sumSince(month) } },
      ]),
      Order.aggregate([
        { $match: { paymentStatus: { $in: ["paid", "refunded"] } } },
        { $group: { _id: "$fulfillmentStatus", count: { $sum: 1 } } },
      ]),
      Order.countDocuments({ paymentStatus: "refunded" }),
      Order.countDocuments({ paymentStatus: "refunded", razorpayRefundId: { $exists: false } }),
      Order.countDocuments({ returnStatus: { $in: ["partial", "full"] } }),
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

    const counts = { processing: 0, shipped: 0, delivered: 0, cancelled: 0, refunded: refundedCount, returned: returnedCount };
    for (const { _id, count } of statusRows) {
      if (_id in counts && _id !== "refunded" && _id !== "returned") counts[_id] = count;
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
    return serverError(res, err);
  }
};
