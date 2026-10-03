import express from'express'
import { addToWishlist, getWishlist, getWishlistIds, removeFromWishlist } from '../controllers/wishlist.controller.js';
import { isAuthenticated } from '../middlewares/authMiddleware.js';

const wishlistRoutes = express.Router();

wishlistRoutes.get('/ids',isAuthenticated,getWishlistIds)
wishlistRoutes.get('/getWishlist',isAuthenticated,getWishlist)
wishlistRoutes.post('/add',isAuthenticated,addToWishlist)
wishlistRoutes.post('/remove',isAuthenticated,removeFromWishlist)

export default wishlistRoutes
