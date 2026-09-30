import express from "express";
import { getCustomer, loginCustomer, logoutCustomer, registerCustomer } from "../controllers/customer.controller.js";
import { isAuthenticated } from "../middlewares/authMiddleware.js";

const customerRouter=express.Router()

customerRouter.post('/register',registerCustomer)
customerRouter.post('/login',loginCustomer)
customerRouter.get('/me',isAuthenticated,getCustomer)
customerRouter.post('/logout',logoutCustomer)
export default customerRouter