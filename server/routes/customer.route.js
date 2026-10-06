import express from "express";
import { getCustomer, loginCustomer, logoutCustomer, registerCustomer } from "../controllers/customer.controller.js";
import { isAuthenticated } from "../middlewares/authMiddleware.js";
import { adminLoginLimiter, authLimiter } from "../middlewares/rateLimit.js";

const customerRouter=express.Router()

customerRouter.post('/register',authLimiter,registerCustomer)
customerRouter.post('/login',authLimiter,adminLoginLimiter,loginCustomer)
customerRouter.get('/me',isAuthenticated,getCustomer)
customerRouter.post('/logout',logoutCustomer)
export default customerRouter