import express from 'express'
import { razorpayWebhook } from '../controllers/webhook.controller.js';

const webhookRoutes = express.Router();

// express.raw keeps the body as the exact bytes Razorpay sent (a Buffer),
// which the signature check needs. No isAuthenticated: Razorpay has no login.
webhookRoutes.post('/webhook',express.raw({type:'application/json'}),razorpayWebhook)

export default webhookRoutes
