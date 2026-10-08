// The one reply for an unexpected error. The details go to the server log;
// the client only learns that something went wrong, not what or where.
export const serverError=(res,err)=>{
    console.error(err)
    return res.status(500).json({message:"Internal server error"})
}
