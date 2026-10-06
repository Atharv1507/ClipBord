import express from 'express'
import { cancelOrder, getOrder, getStats, listOrders, updateOrderStatus } from '../controllers/admin.order.controller.js';

// Mounted inside admin.routes.js, which has already checked requireAdmin.
const adminOrderRoutes = express.Router();

adminOrderRoutes.get('/stats',getStats)
adminOrderRoutes.get('/orders',listOrders)
adminOrderRoutes.get('/orders/:id',getOrder)
adminOrderRoutes.patch('/orders/:id/status',updateOrderStatus)
adminOrderRoutes.post('/orders/:id/cancel',cancelOrder)

export default adminOrderRoutes
