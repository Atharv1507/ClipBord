import jwt from 'jsonwebtoken'
import customer from '../models/customer.model.js'

export const isAuthenticated =async (req,res ,next)=>{
    const token=req.cookies.token

    if(!token){
        return res.status(401).json({message:"Unauthorized access"})
    }
try{
    const decode= jwt.verify(token,process.env.JWT_SECRET)
    const Customer = await customer.findOne({_id:decode.customerId})
    
    if(!Customer){
        return res.status(404).json({message:"User not found"})
    }
    req.customer=Customer
    next()
}
catch(err){
    return res.status(401).json({message:"Invalid Token"})
}

}