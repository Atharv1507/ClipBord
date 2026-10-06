import express from "express"
import dotenv from "dotenv"
import mongoose from "mongoose"
import cookieParser from "cookie-parser"
import customerRouter from "./routes/customer.route.js"
import cors from 'cors'
import productRoutes from "./routes/product.routes.js"
import cartRoutes from "./routes/cart.routes.js"
import wishlistRoutes from "./routes/wishlist.routes.js"
import orderRoutes from "./routes/order.routes.js"
import webhookRoutes from "./routes/webhook.routes.js"
import { startReconcileJob } from "./jobs/reconcileOrders.js"
import adminRoutes from "./routes/admin.routes.js"
import { warnIfAdminEmailTaken } from "./utils/adminConfig.js"
import { notFound } from "./utils/notFound.js"
import { csrfGuard } from "./middlewares/csrfGuard.js"
import { apiLimiter } from "./middlewares/rateLimit.js"

dotenv.config()
const app=express()
// Railway sits one proxy in front of us; trust its X-Forwarded-For so req.ip
// is the real client IP, otherwise every user shares one rate limit bucket
app.set('trust proxy',1)

mongoose.connect(process.env.dbUrl).then(()=>{
    console.log("DB connected")
    // Catches up any payment that both verify and the webhook missed
    startReconcileJob()
    warnIfAdminEmailTaken().catch((err)=>console.log(err))
}).catch((err)=>{
    console.log(err)
})

const allowedOrigins=(process.env.CLIENT_URL||'http://localhost:5173').split(',').map(o=>o.trim())

app.use(cors({
    origin:allowedOrigins,
    credentials:true
}))
// Razorpay's server calls this, not our client, so it goes first: it needs the
// raw body (before express.json), has no X-Requested-With (before csrfGuard),
// and comes from a few Razorpay IPs (before the per-IP limit). Its signature
// check replaces all three.
app.use('/payments',webhookRoutes)
app.use(apiLimiter)
app.use(express.json())
app.use(cookieParser())
// after cors() so preflights are answered first; blocks cross-site write requests
app.use(csrfGuard)
app.use('/customer',customerRouter)
app.use('/products',productRoutes)
app.use('/cart',cartRoutes)
app.use('/wishlist',wishlistRoutes)
app.use('/orders',orderRoutes)
app.use('/admin',adminRoutes)

app.get('/health',(req,res)=>{
    // readyState 1 = connected
    if(mongoose.connection.readyState!==1){
        return res.status(503).json({message:'db unavailable'})
    }
    res.status(200).json({message:'ok'})
})
// Last: anything no route matched. JSON instead of Express's HTML page, and
// the same body admin routes send to non-admins.
app.use(notFound)

// Errors thrown by middleware (e.g. malformed JSON) as JSON too.
app.use((err,req,res,next)=>{
    const status=err.status||err.statusCode||500
    if(status>=500) console.log(err)
    res.status(status).json({message:status>=500?'Internal server error':err.message})
})

app.listen(process.env.PORT,()=>{
    console.log('Listening on port',process.env.PORT)
})