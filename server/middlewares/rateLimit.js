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

// Admin login only, two layers, both counting failed attempts on the admin
// email. Successful logins don't count, and customer logins skip both.
//
// Per IP: one person guessing from one address is stopped after 5 tries, and
// their requests never reach the shared bucket below, so they can't use it to
// lock the real admin out.
export const adminLoginIpLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    limit: 5,
    skip: (req) => !isAdminEmail(req.body?.email),
    skipSuccessfulRequests: true,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { message: "Too many attempts, please try again later" }
})

// Shared by every IP: caps total guesses worldwide, so rotating IPs can't keep
// guessing. Locking the admin out now takes 10+ different IPs in an hour.
export const adminLoginLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    limit: 50,
    keyGenerator: () => 'admin-login',
    skip: (req) => !isAdminEmail(req.body?.email),
    skipSuccessfulRequests: true,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { message: "Too many attempts, please try again later" }
})
