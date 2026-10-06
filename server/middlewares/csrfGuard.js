// CSRF guard: the auth cookie is sameSite 'none', so other sites can make the
// browser send it. Our client adds an X-Requested-With header to every request.
// A plain HTML form can't set custom headers, and a cross-site fetch that sets
// one triggers a CORS preflight, which our cors() config rejects for unknown
// origins. So only our own client can get a write request through.
// Unlike checking for JSON, this also works for FormData uploads and bodyless posts.
const SAFE_METHODS = ['GET', 'HEAD', 'OPTIONS']

export const csrfGuard = (req, res, next) => {
    if (SAFE_METHODS.includes(req.method)) {
        return next()
    }
    if (req.get('X-Requested-With') !== 'XMLHttpRequest') {
        return res.status(403).json({ message: "Missing X-Requested-With header" })
    }
    next()
}
