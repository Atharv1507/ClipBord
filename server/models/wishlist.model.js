import mongoose from "mongoose";

const wishlistSchema=new mongoose.Schema({
    customer:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'customer',
        required:true,
        unique:true
    },
    products:{
        type:[{
            type:mongoose.Schema.Types.ObjectId,
            ref:'product'
        }],
        default:[]
    }
},{timestamps:true})

export const Wishlist=mongoose.model('wishlist',wishlistSchema)
