import dotenv from "dotenv";
import Razorpay from "razorpay";


dotenv.config({ override: false });

const requiredRazorpayEnv = [
    "RAZORPAY_KEY_ID",
    "RAZORPAY_KEY_SECRET",
    "RAZORPAY_WEBHOOK_SECRET"
];

const missingRazorpayEnv = requiredRazorpayEnv.filter(
    (key) => !process.env[key]
);

if (missingRazorpayEnv.length > 0) {
    throw new Error(
        `Missing Razorpay environment variables: ${missingRazorpayEnv.join(", ")}`
    );
}

// Server-only client. The secret signs every API call and verifies payment
// signatures, so it must never be sent to the browser.
const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
});

export default razorpay;
