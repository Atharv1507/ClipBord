import dotenv from "dotenv";
import customer from "../models/customer.model.js";

dotenv.config({ override: false });

// A bcrypt hash looks like $2b$12$ + 53 characters. Anything else usually
// means the value got mangled (e.g. `$` eaten by a shell export).
const BCRYPT_HASH=/^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/

const email=(process.env.ADMIN_EMAIL||'').trim().toLowerCase()
const passwordHash=process.env.ADMIN_PASSWORD_HASH||''
const jwtSecret=process.env.ADMIN_JWT_SECRET||''

const problems=[]
if(!email) problems.push('ADMIN_EMAIL is missing')
if(!BCRYPT_HASH.test(passwordHash)) problems.push('ADMIN_PASSWORD_HASH is missing or not a bcrypt hash (run scripts/hashAdminPassword.js)')
if(jwtSecret.length<32) problems.push('ADMIN_JWT_SECRET is missing or shorter than 32 characters')

// Admin login switches off instead of crashing the shop when misconfigured.
export const adminConfig={
    enabled:problems.length===0,
    email,
    passwordHash,
    jwtSecret
}

if(!adminConfig.enabled){
    console.warn(`Admin login disabled: ${problems.join('; ')}`)
}

export const ADMIN_SESSION_MS=8*60*60*1000 // 8 hours

// path '/admin' means the browser only sends this cookie to admin endpoints.
export const adminCookieOptions={
    httpOnly:true,
    secure:true,
    sameSite:'none',
    path:'/admin',
    maxAge:ADMIN_SESSION_MS
}

export const isAdminEmail=(value)=>
    adminConfig.enabled && typeof value==='string' && value.trim().toLowerCase()===adminConfig.email

// Admin login is checked before customer login, so a customer account with
// the same email could never log in. Worth knowing about at startup.
export const warnIfAdminEmailTaken=async()=>{
    if(!adminConfig.enabled) return
    const escaped=adminConfig.email.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')
    const taken=await customer.exists({email:new RegExp(`^${escaped}$`,'i')})
    if(taken){
        console.warn(`A customer account uses ADMIN_EMAIL (${adminConfig.email}); it can't log in as a customer.`)
    }
}
