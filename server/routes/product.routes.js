import express from "express";
import { createProducts, getAllProducts, getProductById } from "../controllers/product.controller.js";
import upload from "../middlewares/upload.middleware.js";

const productRoutes=express.Router()

productRoutes.post('/create',upload.single('image'),createProducts)
productRoutes.get('/getAll',getAllProducts)
productRoutes.get('/getproduct/:id',getProductById)
export default productRoutes