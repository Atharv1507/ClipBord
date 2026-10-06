import mongoose from "mongoose";
import { Cart } from "../models/cart.model.js";
import { Order } from "../models/order.model.js";
import { Product } from "../models/product.model.js";
import razorpay from "./razorpay.js";

class OutOfStockError extends Error {}

// The note on each Razorpay refund, by why the order was refunded, so the
// Razorpay dashboard says why the money went back.
const REFUND_REASONS = {
  out_of_stock: "Out of stock",
  admin: "Cancelled by store",
};

// Orders refunded before cancelReason existed were all sold-out refunds.
export const refundReason = (order) => REFUND_REASONS[order.cancelReason] ?? REFUND_REASONS.out_of_stock;

// Refunds the full amount of an order that's already been claimed as
// 'refunded', and records the refund id. Shared by the sold-out path, the
// admin cancel and the reconcile job's retry.
export const issueRefund = async (order) => {
  const refund = await razorpay.payments.refund(order.razorpayPaymentId, {
    amount: order.amount,
    notes: { reason: refundReason(order), orderId: order._id.toString() },
  });
  await Order.updateOne({ _id: order._id }, { $set: { razorpayRefundId: refund.id } });
  order.razorpayRefundId = refund.id;
  return refund;
};

// The one place an order becomes paid. Both /orders/verify and the Razorpay
// webhook call this, often for the same payment, so calling it twice must be
// harmless.
//
// Returns { status, order } where status is:
//   'paid'     - this call marked it paid
//   'already'  - an earlier call already handled it
//   'refunded' - stock ran out, so the payment was refunded
export const markOrderPaid = async (razorpayOrderId, razorpayPaymentId) => {
  const session = await mongoose.startSession();
  try {
    let result;

    // Everything inside either all happens or none of it does. If two calls
    // race, Mongo lets one finish and retries the other, which then sees the
    // order is no longer 'created' and does nothing.
    await session.withTransaction(async () => {
      // Claiming the order only if it's still waiting is what makes repeats
      // harmless: a second call matches nothing. 'failed' counts as waiting
      // because the customer can retry a failed payment in the same popup.
      const order = await Order.findOneAndUpdate(
        { razorpayOrderId, paymentStatus: { $in: ["created", "failed"] } },
        {
          $set: {
            paymentStatus: "paid",
            fulfillmentStatus: "processing",
            razorpayPaymentId,
            paidAt: new Date(),
          },
        },
        { returnDocument: "after", session }
      );

      if (!order) {
        result = { status: "already", order: await Order.findOne({ razorpayOrderId }).session(session) };
        return;
      }

      for (const item of order.items) {
        const stockPath = `sizes.${item.size}`;
        // Only decrements if enough is left, so two buyers can't both get the
        // last piece. A miss means it sold out while this customer was paying.
        const updated = await Product.updateOne(
          { _id: item.product, [stockPath]: { $gte: item.quantity } },
          { $inc: { [stockPath]: -item.quantity } },
          { session }
        );
        if (updated.modifiedCount === 0) {
          // Throwing aborts the transaction, undoing every change above.
          throw new OutOfStockError(`${item.name} (${item.size}) sold out`);
        }
      }

      // Removes only what was bought, so anything added to the bag after
      // checkout started stays there.
      await Cart.updateOne(
        { customer: order.customer },
        {
          $pull: {
            items: { $or: order.items.map((item) => ({ product: item.product, size: item.size })) },
          },
        },
        { session }
      );

      result = { status: "paid", order };
    });

    return result;
  } catch (err) {
    if (err instanceof OutOfStockError) {
      return refundOrder(razorpayOrderId, razorpayPaymentId);
    }
    throw err;
  } finally {
    await session.endSession();
  }
};

// The customer paid but we can't ship, so the money goes back.
const refundOrder = async (razorpayOrderId, razorpayPaymentId) => {
  // Claim first, same as above, so a racing call can't refund twice.
  const now = new Date();
  const order = await Order.findOneAndUpdate(
    { razorpayOrderId, paymentStatus: { $in: ["created", "failed"] } },
    {
      $set: {
        paymentStatus: "refunded",
        fulfillmentStatus: "cancelled",
        razorpayPaymentId,
        cancelReason: "out_of_stock",
        cancelledAt: now,
        // Tells the reconcile job this refund is in flight right now.
        refundRequestedAt: now,
      },
    },
    { returnDocument: "after" }
  );

  if (!order) {
    return { status: "already", order: await Order.findOne({ razorpayOrderId }) };
  }

  // If this call fails the order stays 'refunded' with no refund id, which the
  // reconciliation job (step 9) looks for and retries.
  await issueRefund(order);

  return { status: "refunded", order };
};
