import jwt from 'jsonwebtoken'

// tokenVersion is checked against the customer's current one in authMiddleware,
// so bumping it in the DB revokes every token issued before
export const genToken=(customerId,tokenVersion)=>{
    const token=jwt.sign({customerId,tokenVersion},process.env.JWT_SECRET ,{expiresIn:'10d'})
    return token
}