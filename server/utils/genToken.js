import jwt from 'jsonwebtoken'

export const genToken=(customerId)=>{
    const token=jwt.sign({customerId},process.env.JWT_SECRET ,{expiresIn:'10d'})
    return token
}