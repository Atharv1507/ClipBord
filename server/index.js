import express from "express"
import dotenv from "dotenv"
import mongoose from "mongoose"
import cookieParser from "cookie-parser"
import customerRouter from "./routes/customer.route.js"
import cors from 'cors'
import productRoutes from "./routes/product.routes.js"

dotenv.config()
const app=express()

mongoose.connect(process.env.dbUrl).then(()=>{
    console.log("DB connected")
}).catch((err)=>{
    console.log(err)
})

const allowedOrigins=(process.env.CLIENT_URL||'http://localhost:5173').split(',').map(o=>o.trim())

app.use(cors({
    origin:allowedOrigins,
    credentials:true
}))
app.use(express.json())
app.use(cookieParser())
app.use('/customer',customerRouter)
app.use('/products',productRoutes)

app.get('/health',(req,res)=>{
    res.status(200).json({message:'ok'})
})
app.listen(process.env.PORT,()=>{
    console.log('Listening on port',process.env.PORT)
})