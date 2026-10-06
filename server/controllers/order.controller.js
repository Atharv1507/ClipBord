import crypto from "crypto";
import { Cart } from "../models/cart.model.js";
import { Order } from "../models/order.model.js";
import razorpay from "../utils/razorpay.js";
import { markOrderPaid } from "../utils/markOrderPaid.js";

// Razorpay signs `order_id|payment_id` with our key secret. Only someone with
// the secret (Razorpay or us) can produce this, so a match proves the payment
// came from Razorpay and wasn't made up in the browser.
const isValidSignature = (razorpayOrderId, razorpayPaymentId, signature) => {
  const expected = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(`${razorpayOrderId}|${razorpayPaymentId}`)
    .digest("hex");

  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  // timingSafeEqual takes the same time however many characters match, so an
  // attacker can't guess the signature one character at a time. It throws on
  // different lengths, hence the length check first.
  return a.length === b.length && crypto.timingSafeEqual(a, b);
};

// Turns the customer's cart into an order and a matching Razorpay order.
// Everything about money comes from the database, never from the request:
// the client only sends where to ship.
export const checkout = async (req, res) => {
  let order;
  try {
    const { shippingAddress } = req.body;

    if (!shippingAddress) {
      return res.status(400).json({ message: "Shipping address required" });
    }

    const cart = await Cart.findOne({ customer: req.customer._id }).populate(
      "items.product",
      "name price image sizes archived"
    );

    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ message: "Your bag is empty" });
    }

    const items = [];
    for (const item of cart.items) {
      // A product deleted after it was added populates as null; an archived
      // one is no longer sold either.
      if (!item.product || item.product.archived) {
        return res
          .status(400)
          .json({ message: "An item in your bag is no longer available" });
      }

      const available = item.product.sizes[item.size];
      if (available < item.quantity) {
        return res.status(400).json({
          message: `Only ${available} left of ${item.product.name} in size ${item.size}`,
        });
      }

      items.push({
        product: item.product._id,
        name: item.product.name,
        image: item.product.image,
        size: item.size,
        quantity: item.quantity,
        price: item.product.price,
      });
    }

    const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const amount = Math.round(subtotal * 100); // rupees -> paise

    // Saved before talking to Razorpay so our order id can be the receipt.
    order = await Order.create({
      customer: req.customer._id,
      items,
      shippingAddress,
      amount,
    });

    const razorpayOrder = await razorpay.orders.create({
      amount,
      currency: order.currency,
      receipt: order._id.toString(),
      notes: { customerId: req.customer._id.toString() },
    });

    order.razorpayOrderId = razorpayOrder.id;
    await order.save();

    // Everything the browser needs to open the Razorpay popup.
    return res.status(201).json({
      orderId: order._id,
      razorpayOrderId: razorpayOrder.id,
      amount,
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
      prefill: {
        name: req.customer.fullName,
        email: req.customer.email,
        contact: req.customer.phone,
      },
    });
  } catch (err) {
    if (err.name === "ValidationError") {
      return res.status(400).json({ message: err.message });
    }

    // Razorpay failed after our order was saved; remove it so it isn't left
    // as an order that can never be paid.
    if (order && !order.razorpayOrderId) {
      await Order.deleteOne({ _id: order._id }).catch(() => {});
    }

    // The Razorpay SDK puts its reason in err.error.description.
    const message = err.error?.description || err.message;
    return res.status(500).json({ message });
  }
};

// Called by the browser after the Razorpay popup reports success. The popup's
// word alone proves nothing, so each claim is checked before trusting it.
export const verifyPayment = async (req, res) => {
  try {
    const {
      razorpay_order_id: razorpayOrderId,
      razorpay_payment_id: razorpayPaymentId,
      razorpay_signature: signature,
    } = req.body;

    // Must be plain strings: an object like { $ne: null } would otherwise be
    // read by Mongo as a query operator and match someone else's order.
    if (
      typeof razorpayOrderId !== "string" ||
      typeof razorpayPaymentId !== "string" ||
      typeof signature !== "string"
    ) {
      return res.status(400).json({ message: "Invalid payment details" });
    }

    if (!isValidSignature(razorpayOrderId, razorpayPaymentId, signature)) {
      return res.status(400).json({ message: "Payment could not be verified" });
    }

    // Filtering by customer too means nobody can confirm another user's order.
    const order = await Order.findOne({
      razorpayOrderId,
      customer: req.customer._id,
    });

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    // A repeated request (double click, retry, the webhook got there first)
    // changes nothing.
    if (order.paymentStatus === "paid") {
      if (order.razorpayPaymentId === razorpayPaymentId) {
        return res.status(200).json({ message: "Payment already confirmed", orderId: order._id });
      }
      return res.status(409).json({ message: "Order already paid" });
    }

    // Ask Razorpay directly what was actually paid.
    let payment = await razorpay.payments.fetch(razorpayPaymentId);

    if (
      payment.order_id !== order.razorpayOrderId ||
      payment.amount !== order.amount ||
      payment.currency !== order.currency
    ) {
      return res.status(400).json({ message: "Payment does not match this order" });
    }

    // 'authorized' means the bank approved but the money isn't taken yet;
    // capturing takes it. With auto-capture on this is usually already done.
    if (payment.status === "authorized") {
      payment = await razorpay.payments.capture(payment.id, payment.amount, payment.currency);
    }

    if (payment.status !== "captured") {
      return res.status(400).json({ message: `Payment ${payment.status}` });
    }

    const result = await markOrderPaid(order.razorpayOrderId, payment.id);

    if (result.status === "refunded") {
      return res.status(409).json({
        message: "Sorry, an item sold out while you were paying. Your payment has been refunded.",
        orderId: order._id,
      });
    }

    return res.status(200).json({ message: "Payment verified", orderId: order._id });
  } catch (err) {
    const message = err.error?.description || err.message;
    return res.status(500).json({ message });
  }
};

// The customer's orders for the profile page, newest first. Only orders that
// got as far as a payment are shown; 'created' ones are checkouts that were
// abandoned or are still in the popup.
export const getMyOrders = async (req, res) => {
  try {
    const orders = await Order.find({
      customer: req.customer._id,
      paymentStatus: { $in: ["paid", "refunded"] },
    })
      .select("items shippingAddress amount currency paymentStatus fulfillmentStatus razorpayPaymentId paidAt createdAt courier trackingNumber shippedAt deliveredAt cancelledAt cancelReason")
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    return res.status(200).json({ orders });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// The address from the customer's newest order, to pre-fill the next checkout.
// Abandoned checkouts count too: it's still the address they last typed.
export const getLastAddress = async (req, res) => {
  try {
    const order = await Order.findOne({ customer: req.customer._id })
      .select("shippingAddress")
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({ address: order?.shippingAddress ?? null });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};
