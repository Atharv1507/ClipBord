import express from 'express'
import { checkout, getLastAddress, getMyOrders, verifyPayment } from '../controllers/order.controller.js';
import { isAuthenticated } from '../middlewares/authMiddleware.js';

const orderRoutes = express.Router();

orderRoutes.post('/checkout',isAuthenticated,checkout)
orderRoutes.post('/verify',isAuthenticated,verifyPayment)
orderRoutes.get('/my',isAuthenticated,getMyOrders)
orderRoutes.get('/last-address',isAuthenticated,getLastAddress)

export default orderRoutes
