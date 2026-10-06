// The one "not found" reply for the whole API. Admin routes send exactly this
// to anyone who isn't the admin, so they can't be told apart from a typo'd URL.
export const NOT_FOUND_BODY={message:"Not found"}

export const notFound=(req,res)=>res.status(404).json(NOT_FOUND_BODY)
