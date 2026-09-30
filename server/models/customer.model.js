import mongoose from "mongoose";

const customerSchema=new mongoose.Schema({
    fullName:{
        type:String,
        required:true
    },
    email:{
        type:String,
        required:true,
        unique:true
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
},{timestamps:true })

const customer=mongoose.model('customer',customerSchema)

export default customer