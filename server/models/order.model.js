import mongoose from "mongoose";

// A copy of each cart item at the moment of checkout. Name, image and price are
// stored here (not populated) so later product edits never change a past order.
const orderItemSchema=new mongoose.Schema({
    product:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'product',
        required:true
    },
    name:{
        type:String,
        required:true
    },
    image:{
        type:String,
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
    },
    // Unit price in rupees, same unit as Product.price
    price:{
        type:Number,
        required:true,
        min:0
    },
    // How many of this line came back after delivery.
    returnedQuantity:{
        type:Number,
        default:0,
        min:0
    }
},{_id:false})

// One return recorded from the dashboard: which lines came back, how many,
// and whether they went back into stock.
const returnSchema=new mongoose.Schema({
    items:[{
        _id:false,
        product:{type:mongoose.Schema.Types.ObjectId,ref:'product'},
        name:String,
        size:String,
        quantity:Number
    }],
    restocked:{type:Boolean,default:false},
    note:{type:String,trim:true,maxlength:300},
    createdAt:{type:Date,default:Date.now}
})

// A refund of part (or all) of a delivered order. Kept apart from returns:
// recording a return never moves money, and a refund doesn't need a return.
const refundSchema=new mongoose.Schema({
    amount:{type:Number,required:true}, // paise
    razorpayRefundId:{type:String},
    // pending while the Razorpay call is in flight
    status:{type:String,enum:['pending','processed'],default:'pending'},
    note:{type:String,trim:true,maxlength:300},
    createdAt:{type:Date,default:Date.now}
})

const shippingAddressSchema=new mongoose.Schema({
    fullName:{type:String,required:true,trim:true},
    phone:{type:String,required:true,match:/^[6-9]\d{9}$/},
    line1:{type:String,required:true,trim:true},
    line2:{type:String,trim:true},
    city:{type:String,required:true,trim:true},
    state:{type:String,required:true,trim:true},
    pincode:{type:String,required:true,match:/^\d{6}$/},
    country:{type:String,default:'India'}
},{_id:false})

const orderSchema=new mongoose.Schema({
    customer:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'customer',
        required:true
    },
    items:{
        type:[orderItemSchema],
        validate:[(items)=>items.length>0,'Order needs at least one item']
    },
    shippingAddress:{
        type:shippingAddressSchema,
        required:true
    },
    // Total in paise (₹1 = 100), exactly what Razorpay charges. Kept as a whole
    // number so it can be compared to Razorpay's amount without rounding.
    amount:{
        type:Number,
        required:true,
        min:100,
        validate:[Number.isInteger,'Amount must be whole paise']
    },
    currency:{
        type:String,
        default:'INR'
    },
    // Is the money in? Only verify / webhook move this past 'created'.
    paymentStatus:{
        type:String,
        enum:['created','paid','failed','refunded'],
        default:'created'
    },
    // Where is the parcel? This is what the customer tracks on their profile.
    fulfillmentStatus:{
        type:String,
        enum:['pending','processing','shipped','delivered','cancelled'],
        default:'pending'
    },
    // Set right after the Razorpay order is created, so it's briefly empty;
    // sparse lets those empty ones skip the unique check.
    razorpayOrderId:{
        type:String,
        unique:true,
        sparse:true
    },
    // Unique so one payment can never be applied to two orders.
    razorpayPaymentId:{
        type:String,
        unique:true,
        sparse:true
    },
    razorpayRefundId:{
        type:String
    },
    paidAt:{
        type:Date
    },
    // Set by the admin when the parcel leaves; shown to the customer.
    courier:{
        type:String,
        trim:true,
        maxlength:60
    },
    trackingNumber:{
        type:String,
        trim:true,
        maxlength:60
    },
    shippedAt:{
        type:Date
    },
    deliveredAt:{
        type:Date
    },
    cancelledAt:{
        type:Date
    },
    // Why it was refunded: sold out mid-payment, or cancelled from the dashboard.
    cancelReason:{
        type:String,
        enum:['out_of_stock','admin']
    },
    // When the refund call was made; the reconcile job leaves fresh ones alone
    // so a refund still in flight isn't issued twice.
    refundRequestedAt:{
        type:Date
    },
    // After delivery: nothing back, some items back, or everything back.
    returnStatus:{
        type:String,
        enum:['none','partial','full'],
        default:'none'
    },
    returns:{
        type:[returnSchema],
        default:[]
    },
    // Refunds made after delivery, and their total in paise. The order stays
    // 'paid'; revenue counts amount minus refundedAmount.
    refunds:{
        type:[refundSchema],
        default:[]
    },
    refundedAmount:{
        type:Number,
        default:0,
        min:0
    }
},{timestamps:true})

// The profile page lists a customer's orders, newest first.
orderSchema.index({customer:1,createdAt:-1})
// The dashboard filters by status and sums revenue by payment date.
orderSchema.index({paymentStatus:1,fulfillmentStatus:1,paidAt:-1})

export const Order=mongoose.model('order',orderSchema)
