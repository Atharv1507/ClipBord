import jwt from "jsonwebtoken";
import customer from "../models/customer.model.js";
import { genToken } from "../utils/genToken.js";
import { hashPass,checkPass } from "../utils/hashPass.js";
import { adminConfig, adminCookieOptions, isAdminEmail } from "../utils/adminConfig.js";
import { getAdminTokenVersion } from "../models/adminSession.model.js";

const cookieOptions = {
    httpOnly: true,
    secure: true,
    sameSite: 'none', // client and API are on different domains in prod
    maxAge: 10 * 24 * 60 * 60 * 1000 // 10 days, same as the JWT expiry
}

// clearCookie needs the same options the cookie was set with, minus maxAge
const { maxAge: _customerMaxAge, ...clearCookieOptions } = cookieOptions

// The same reply for a wrong customer or admin password, so a failed login
// never hints which email is the admin's.
const WRONG_PASSWORD = { message: "Wrong password" }

export const registerCustomer= async (req,res)=>{
    try{
        const {email,fullName,password,phone}=req.body
        
        if(!email||!fullName||!password||!phone){
            return res.status(400).json({message:"All fields required"})
        }
        if(password.length<=6){
            return res.status(400).json({message:"Password must be greater than 6 characters"})
        }
        // The admin email is reserved; answer exactly like an existing account.
        if(isAdminEmail(email)){
            return res.status(409).json({message:"User already exists"})
        }
        const emailExists=await customer.findOne({email})
        if(emailExists){
            return res.status(409).json({message:"User already exists"})
        }

        //passwords
        const hashedPass=await hashPass(password)

        const newCustomer= await customer.create({fullName,password:hashedPass,email,phone})
        const token=genToken(newCustomer._id,newCustomer.tokenVersion)
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
        // bcrypt throws on non-strings, and an object here could be a query operator
        if(typeof email!=='string' || typeof password!=='string'){
            return res.status(400).json({message:"Invalid email or password"})
        }

        // The admin isn't a customer document: its credentials live in env vars.
        // Logging in with them opens the dashboard instead of the shop.
        if(isAdminEmail(email)){
            const correctAdminPass=await checkPass(password,adminConfig.passwordHash)
            if(!correctAdminPass){
                return res.status(401).json(WRONG_PASSWORD)
            }
            const adminToken=jwt.sign(
                {role:'admin',v:await getAdminTokenVersion()},
                adminConfig.jwtSecret,
                {algorithm:'HS256',expiresIn:'8h'}
            )
            res.cookie('adminToken',adminToken,adminCookieOptions)
            // A shopper session left in this browser would make the shop
            // still look logged in as that customer.
            res.clearCookie('token',clearCookieOptions)
            return res.status(200).json({message:"Admin logged in",admin:true})
        }

        const isCustomer=await customer.findOne({email}).select('+password')
        
       if (!isCustomer) {
            return res.status(404).json({ message: "User Not Found Please Register" })
        }
        const correctPass=await checkPass(password,isCustomer.password) 
        
        if(!correctPass){
            return res.status(401).json(WRONG_PASSWORD)
        }
        const token=genToken(isCustomer._id,isCustomer.tokenVersion)

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
export const logoutCustomer = async (req, res) => {
    try {
        const token = req.cookies.token
        if (token) {
            try {
                const decode = jwt.verify(token, process.env.JWT_SECRET)
                // bump the version so this token, and any stolen copy of it, stops working
                await customer.updateOne({ _id: decode.customerId }, { $inc: { tokenVersion: 1 } })
            } catch (err) {
                // token already expired or invalid, nothing to revoke
            }
        }
        res.clearCookie('token', clearCookieOptions)
        return res.status(200).json({ message: "User Logged Out" })
    }
    catch (error) {
        res.status(500).json({ message: 'Internal Server Error', error: error })
    }
}