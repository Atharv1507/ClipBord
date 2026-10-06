import mongoose from "mongoose";

// The admin isn't a customer document, so its token version lives here: a
// single document, bumped on logout, which makes every older admin token invalid.
const adminSessionSchema=new mongoose.Schema({
    key:{
        type:String,
        default:'admin',
        unique:true
    },
    tokenVersion:{
        type:Number,
        default:0
    }
})

export const AdminSession=mongoose.model('adminSession',adminSessionSchema)

export const getAdminTokenVersion=async()=>{
    const session=await AdminSession.findOneAndUpdate(
        {key:'admin'},
        {$setOnInsert:{key:'admin',tokenVersion:0}},
        {upsert:true,returnDocument:'after'}
    )
    return session.tokenVersion
}

export const bumpAdminTokenVersion=async()=>{
    await AdminSession.updateOne({key:'admin'},{$inc:{tokenVersion:1}},{upsert:true})
}
