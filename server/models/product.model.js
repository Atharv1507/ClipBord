import mongoose from "mongoose";

const productSchema= new mongoose.Schema({
    name:{
        type:String,
        required:true
    },
    price:{
        type:Number,required:true
    },
    image:{
        type:String,required:true
    },
    category:{
        type:String,
        enum:['Tshirt', "Sweat Shirt" ,'Joggers'],
        required:true
    },
    description:{
        type:String
    },
    sizes:{
        S:{type:Number,default:0,min:0},
        M:{type:Number,default:0,min:0},
        L:{type:Number,default:0,min:0},
        XL:{type:Number,default:0,min:0}
    }
},{timestamps:true})

export const Product =mongoose.model('product',productSchema)