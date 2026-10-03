import express from'express'
import { addToCart, getCart, removeFromCart, removeItem } from '../controllers/cart.controller.js';
import { isAuthenticated } from '../middlewares/authMiddleware.js';

const cartRoutes = express.Router();

cartRoutes.post('/addToCart',isAuthenticated,addToCart)
cartRoutes.post('/removeFromCart',isAuthenticated,removeFromCart)
cartRoutes.post('/removeItem',isAuthenticated,removeItem)
cartRoutes.get('/getCart',isAuthenticated,getCart)

export default cartRoutes