import mongoose from "mongoose";

// One entry per product + size combination. Price isn't stored here;
// populate `product` to read the current price and stock.
const cartItemSchema=new mongoose.Schema({
    product:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'product',
        required:true
    },
    size:{
        type:String,
        enum:['S','M','L','XL'],
        required:true
    },
    quantity:{
        type:Number,
        required:true,
        min:1
    }
})

const cartSchema=new mongoose.Schema({
    customer:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'customer',
        required:true,
        unique:true
    },
    items:{
        type:[cartItemSchema],
        default:[]
    }
},{timestamps:true})

export const Cart=mongoose.model('cart',cartSchema)
