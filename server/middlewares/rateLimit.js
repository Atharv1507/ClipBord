import { rateLimit } from 'express-rate-limit'
import { isAdminEmail } from '../utils/adminConfig.js'

// Counts requests per IP inside a time window; once over the limit the client
// gets 429 Too Many Requests until the window resets.

// Every route: high enough for normal browsing, stops scripts hammering the API
export const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    limit: 300,
    standardHeaders: 'draft-8', // send RateLimit headers so clients can see what's left
    legacyHeaders: false, // drop the old X-RateLimit-* headers
    message: { message: "Too many requests, please try again later" }
})

// Login and register: strict, so passwords can't be brute forced
export const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    limit: 10,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { message: "Too many attempts, please try again in 15 minutes" }
})

// Admin login only: ONE shared bucket for every IP, counting failed attempts.
// authLimiter is per IP, so someone rotating IPs could keep guessing the admin
// password; this caps the total guesses worldwide. Successful logins don't
// count, and customer logins skip it entirely.
export const adminLoginLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    limit: 20,
    keyGenerator: () => 'admin-login',
    skip: (req) => !isAdminEmail(req.body?.email),
    skipSuccessfulRequests: true,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { message: "Too many attempts, please try again later" }
})
