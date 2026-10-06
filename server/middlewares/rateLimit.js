import { rateLimit } from 'express-rate-limit'

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
