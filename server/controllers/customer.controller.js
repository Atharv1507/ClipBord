import customer from "../models/customer.model.js";
import { genToken } from "../utils/genToken.js";
import { hashPass,checkPass } from "../utils/hashPass.js";

const cookieOptions = {
    httpOnly: true,
    secure: true,
    maxAge: 10 * 24 * 60 * 60 * 1000 // 10 days, same as the JWT expiry
}

export const registerCustomer= async (req,res)=>{
    try{
        const {email,fullName,password,phone}=req.body
        
        if(!email||!fullName||!password||!phone){
            return res.status(400).json({message:"All fields required"})
        }
        if(password.length<=6){
            return res.status(400).json({message:"Password must be greater than 6 characters"})
        }
        const emailExists=await customer.findOne({email})
        console.log(emailExists)
        if(emailExists){
            return res.status(409).json({message:"User already exists"})
        }

        //passwords
        const hashedPass=await hashPass(password)

        const newCustomer= await customer.create({fullName,password:hashedPass,email,phone})
        const token=genToken(newCustomer._id)
        // select:false doesn't apply to create(), so strip the hash before responding
        newCustomer.password=undefined
        res.cookie('token',token,cookieOptions)
        return res.status(201).json({message:"User Created", data:{newCustomer}})
    }
    catch(err){
        res.status(500).json({message:"Internal Server Error"})
        console.log(err)
    }
}

export const loginCustomer= async(req,res)=>{
    try{
        const {email,password}=req.body

        if(!email ||!password){
            return res.status(400).json("All fields required")
        }
        const isCustomer=await customer.findOne({email}).select('+password')
        
       if (!isCustomer) {
            return res.status(404).json({ message: "User Not Found Please Register" })
        }
        const correctPass=await checkPass(password,isCustomer.password) 
        
        if(!correctPass){
            return res.status(401).json({message:"Wrong password"})
        }
        const token=genToken(isCustomer._id)

        res.cookie('token',token,cookieOptions)
        return res.status(200).json({ message: "User Logged IN"})
    }
    catch (error) {
        res.status(500).json({ message: 'Internal Server Errorr', error: error })
    }
}

export const getCustomer=(req,res)=>{
        res.status(200).json({ message: "User Authenticated", userData: req.customer })

}
export const logoutCustomer = (req, res) => {
    try {
        res.clearCookie('token', cookieOptions)
        return res.status(200).json({ message: "User Logged Out" })
    }
    catch (error) {
        res.status(500).json({ message: 'Internal Server Error', error: error })
    }
}