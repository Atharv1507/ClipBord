import jwt from 'jsonwebtoken'
import { adminConfig } from '../utils/adminConfig.js'
import { getAdminTokenVersion } from '../models/adminSession.model.js'
import { notFound } from '../utils/notFound.js'

// Lets only the admin through. Everyone else gets the same 404 as an unknown
// URL, so admin routes can't be discovered by probing.
export const requireAdmin=async(req,res,next)=>{
    const token=req.cookies.adminToken
    if(!adminConfig.enabled || !token){
        return notFound(req,res)
    }
    try{
        const decode=jwt.verify(token,adminConfig.jwtSecret,{algorithms:['HS256']})
        if(decode.role!=='admin'){
            return notFound(req,res)
        }
        // issued before the last admin logout, so it's been revoked
        if(decode.v!==await getAdminTokenVersion()){
            return notFound(req,res)
        }
        req.admin={email:adminConfig.email}
        next()
    }
    catch{
        return notFound(req,res)
    }
}
