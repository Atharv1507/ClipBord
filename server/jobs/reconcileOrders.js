import { Order } from "../models/order.model.js";
import razorpay from "../utils/razorpay.js";
import { issueRefund, markOrderPaid } from "../utils/markOrderPaid.js";

const MINUTE = 60 * 1000;
const RUN_EVERY = 10 * MINUTE;
// Younger orders may still be open in the popup; leave them to verify/webhook.
const GRACE = 15 * MINUTE;
// Unpaid this long means the checkout was abandoned.
const EXPIRE_AFTER = 24 * 60 * MINUTE;
// Per run, so a backlog can't flood Razorpay's API.
const BATCH = 50;
// A refund requested this recently may still be on its way back from
// Razorpay; retrying it now could refund the customer twice.
const REFUND_IN_FLIGHT = 5 * MINUTE;

// Safety net for when both /orders/verify and the webhook were missed (tab
// closed, server down, webhook not set up yet). Razorpay is the source of
// truth, so each run asks it what really happened and catches our database up.
// Every step goes through the same idempotent code, so a run that overlaps
// verify or the webhook changes nothing twice.

// 1. Orders still waiting for money: paid after all, or abandoned?
const settleUnpaidOrders = async () => {
  const orders = await Order.find({
    paymentStatus: { $in: ["created", "failed"] },
    fulfillmentStatus: "pending",
    createdAt: { $lt: new Date(Date.now() - GRACE) },
  })
    .sort({ createdAt: 1 })
    .limit(BATCH);

  for (const order of orders) {
    try {
      // Checkout crashed before Razorpay had an order; it can never be paid.
      if (!order.razorpayOrderId) {
        await Order.updateOne({ _id: order._id }, { $set: { fulfillmentStatus: "cancelled" } });
        continue;
      }

      const { items: payments } = await razorpay.orders.fetchPayments(order.razorpayOrderId);
      let payment = payments.find(
        (p) =>
          (p.status === "captured" || p.status === "authorized") &&
          p.amount === order.amount &&
          p.currency === order.currency
      );

      if (payment) {
        // Same as verify: approved but not yet taken, so take it.
        if (payment.status === "authorized") {
          payment = await razorpay.payments.capture(payment.id, payment.amount, payment.currency);
        }
        const result = await markOrderPaid(order.razorpayOrderId, payment.id);
        console.log(`Reconcile: order ${order._id} ${result.status} (payment ${payment.id})`);
        continue;
      }

      // Nothing paid and too old: stop checking it. paymentStatus is left as is,
      // so if a very late payment still arrives, markOrderPaid can claim it.
      if (order.createdAt < new Date(Date.now() - EXPIRE_AFTER)) {
        await Order.updateOne(
          { _id: order._id, paymentStatus: { $in: ["created", "failed"] } },
          { $set: { fulfillmentStatus: "cancelled" } }
        );
      }
    } catch (err) {
      // One bad order shouldn't stop the rest; it's retried next run.
      console.error(`Reconcile: order ${order._id} failed:`, err.error?.description || err.message);
    }
  }
};

// 2. Out-of-stock orders whose refund call failed (no refund id saved).
const retryMissingRefunds = async () => {
  const orders = await Order.find({
    paymentStatus: "refunded",
    razorpayRefundId: { $exists: false },
    razorpayPaymentId: { $exists: true },
    // No refundRequestedAt: refunded before that field existed, so not in flight.
    $or: [
      { refundRequestedAt: { $exists: false } },
      { refundRequestedAt: { $lt: new Date(Date.now() - REFUND_IN_FLIGHT) } },
    ],
  }).limit(BATCH);

  for (const order of orders) {
    try {
      // The refund may have gone through with only our save failing. Check
      // first so the customer is never refunded twice.
      const { items: existing } = await razorpay.payments.fetchMultipleRefund(order.razorpayPaymentId);
      let refund = existing.find((r) => r.status !== "failed");

      if (refund) {
        await Order.updateOne({ _id: order._id }, { $set: { razorpayRefundId: refund.id } });
      } else {
        refund = await issueRefund(order);
      }
      console.log(`Reconcile: refund ${refund.id} recorded for order ${order._id}`);
    } catch (err) {
      console.error(`Reconcile: refund for order ${order._id} failed:`, err.error?.description || err.message);
    }
  }
};

let running = false;

const reconcileOrders = async () => {
  // A slow run must not overlap the next one.
  if (running) return;
  running = true;
  try {
    await settleUnpaidOrders();
    await retryMissingRefunds();
  } catch (err) {
    console.error("Reconcile run failed:", err.message);
  } finally {
    running = false;
  }
};

export const startReconcileJob = () => {
  reconcileOrders();
  return setInterval(reconcileOrders, RUN_EVERY);
};

export { reconcileOrders };
