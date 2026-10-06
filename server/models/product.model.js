import mongoose from "mongoose";

// One photo in the gallery. publicId is Cloudinary's id for the file, needed
// to delete it later; products made before galleries existed may not have one.
const productImageSchema=new mongoose.Schema({
    url:{type:String,required:true},
    publicId:{type:String}
},{_id:false})

const productSchema= new mongoose.Schema({
    name:{
        type:String,
        required:true
    },
    price:{
        type:Number,required:true
    },
    // The cover photo, always the same as images[0].url. Kept as its own field
    // so cards, bag, wishlist, search and orders keep reading one string.
    image:{
        type:String,required:true
    },
    // The full gallery, in display order. Up to 8.
    images:{
        type:[productImageSchema],
        validate:[(images)=>images.length<=8,'A product can have at most 8 images']
    },
    // Hidden from the shop but kept, so past orders and links still work.
    archived:{
        type:Boolean,
        default:false
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

// Keeps the cover in sync on create()/save(). A product from before galleries
// (image only) gets that image as its one-photo gallery.
// Writes through updateOne() skip this hook, so they must set `image` themselves.
productSchema.pre('validate',function(){
    if(this.images?.length){
        this.image=this.images[0].url
    }else if(this.image){
        this.images=[{url:this.image}]
    }
})

// The shop lists active products newest first.
productSchema.index({archived:1,createdAt:-1})

export const Product =mongoose.model('product',productSchema)