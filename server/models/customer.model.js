import mongoose from "mongoose";

const customerSchema=new mongoose.Schema({
    fullName:{
        type:String,
        required:true,
        trim:true,
        maxlength:80
    },
    email:{
        type:String,
        required:true,
        unique:true,
        trim:true,
        lowercase:true,
        maxlength:254
    },
    password:{
        type:String,
        required:true,
        select:false
    },
    phone:{
        type:String,
        required:true
    },
    // stored in every JWT; bumping it (on logout) invalidates all existing tokens
    tokenVersion:{
        type:Number,
        default:0
    },
},{timestamps:true })

const customer=mongoose.model('customer',customerSchema)

export default customer