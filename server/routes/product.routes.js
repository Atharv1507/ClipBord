import express from "express";
import { getAllProducts, getProductById } from "../controllers/product.controller.js";

const productRoutes=express.Router()

// Products are created and edited only from the admin dashboard (/admin/products).
productRoutes.get('/getAll',getAllProducts)
productRoutes.get('/getproduct/:id',getProductById)
export default productRoutes