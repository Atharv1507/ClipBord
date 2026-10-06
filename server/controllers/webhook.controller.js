import crypto from "crypto";
import { Order } from "../models/order.model.js";
import { markOrderPaid } from "../utils/markOrderPaid.js";

// Razorpay signs the exact bytes it sent with the webhook secret (set when
// the webhook is added in the dashboard; separate from the API key secret).
// Re-encoding parsed JSON can change those bytes, which is why the route
// receives the raw body.
const isValidWebhookSignature = (rawBody, signature) => {
  const expected = crypto
    .createHmac("sha256", process.env.RAZORPAY_WEBHOOK_SECRET)
    .update(rawBody)
    .digest("hex");

  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
};

// Razorpay calling us directly, server to server. This is the backup for
// /orders/verify: it still arrives if the customer closed the tab right after
// paying. No login cookie here; the signature is what proves who's calling.
//
// Status codes matter: any 2xx tells Razorpay "got it, stop". Anything else
// makes it retry later, so 5xx is only for errors worth retrying.
export const razorpayWebhook = async (req, res) => {
  const signature = req.get("X-Razorpay-Signature");

  if (!Buffer.isBuffer(req.body) || typeof signature !== "string" || !isValidWebhookSignature(req.body, signature)) {
    return res.status(400).json({ message: "Invalid signature" });
  }

  let event;
  try {
    event = JSON.parse(req.body.toString("utf8"));
  } catch {
    return res.status(400).json({ message: "Invalid body" });
  }

  try {
    switch (event.event) {
      case "payment.captured":
      case "order.paid": {
        const payment = event.payload?.payment?.entity;
        if (!payment?.order_id) break;

        const order = await Order.findOne({ razorpayOrderId: payment.order_id });
        // Not one of ours (another app on the same Razorpay account); retrying won't help.
        if (!order) break;

        if (payment.amount !== order.amount || payment.currency !== order.currency) {
          console.error(`Webhook amount mismatch on order ${order._id}: got ${payment.amount} ${payment.currency}`);
          break;
        }

        // Safe to call even if /orders/verify already did: it returns 'already'.
        await markOrderPaid(payment.order_id, payment.id);
        break;
      }

      case "payment.failed": {
        const payment = event.payload?.payment?.entity;
        if (!payment?.order_id) break;

        // Only an order still waiting can be marked failed. The customer can
        // retry inside the same popup, and a later success still goes through
        // because markOrderPaid also accepts 'failed' orders.
        await Order.updateOne(
          { razorpayOrderId: payment.order_id, paymentStatus: "created" },
          { $set: { paymentStatus: "failed" } }
        );
        break;
      }

      // Any other event we don't act on; acknowledge so it isn't resent.
      default:
        break;
    }

    return res.status(200).json({ received: true });
  } catch (err) {
    // A database hiccup or similar: let Razorpay retry later.
    console.error("Webhook processing failed:", err);
    return res.status(500).json({ message: "Webhook processing failed" });
  }
};
