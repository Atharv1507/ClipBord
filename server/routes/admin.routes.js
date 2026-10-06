import express from 'express'
import { requireAdmin } from '../middlewares/requireAdmin.js'
import { bumpAdminTokenVersion } from '../models/adminSession.model.js'
import { adminCookieOptions } from '../utils/adminConfig.js'
import adminProductRoutes from './admin.products.routes.js'
import adminOrderRoutes from './admin.orders.routes.js'

// Everything under /admin. requireAdmin runs first for every route, before
// any body or file is read, so outsiders get a 404 and nothing else.
const adminRoutes = express.Router();

adminRoutes.use(requireAdmin)

adminRoutes.get('/me',(req,res)=>res.status(200).json({admin:true,email:req.admin.email}))

// Bumping the version revokes this token and any copy of it.
adminRoutes.post('/logout',async(req,res)=>{
    await bumpAdminTokenVersion()
    const { maxAge, ...clearOptions } = adminCookieOptions
    res.clearCookie('adminToken',clearOptions)
    res.status(200).json({message:"Logged out"})
})

adminRoutes.use('/products',adminProductRoutes)
// Orders router defines /orders/... and /stats itself.
adminRoutes.use(adminOrderRoutes)

export default adminRoutes
