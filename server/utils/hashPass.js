import bcrypt from "bcrypt"

export const hashPass=async (password)=>{
    const salt=await bcrypt.genSalt(12)
    const hashedPass=await bcrypt.hash(password,salt)
    return hashedPass
}

export const checkPass=async (password,hashedPass)=>{
    return await bcrypt.compare(password,hashedPass)
}