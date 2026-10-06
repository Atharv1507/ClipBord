import express from 'express'
import { createProduct, getProduct, listProducts, setArchived, updateProduct } from '../controllers/admin.product.controller.js';
import { handleUpload } from '../middlewares/upload.middleware.js';

// Mounted at /admin/products, behind requireAdmin, so multer only ever reads
// files from the admin.
const router = express.Router();

router.get('/',listProducts)
router.get('/:id',getProduct)
router.post('/',handleUpload('images'),createProduct)
router.patch('/:id',handleUpload('newImages'),updateProduct)
router.patch('/:id/archive',setArchived)

export default router
