import multer from 'multer'

// Files are kept in memory (a Buffer per file) just long enough to stream them
// to Cloudinary; nothing is written to the server's disk.
const storage = multer.memoryStorage()

// Photos only. SVG is left out on purpose: it's a text format that can carry
// scripts, so it's not safe to serve as a product image.
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif']

const fileFilter = (req, file, cb) => {
    if (ALLOWED_TYPES.includes(file.mimetype)) {
        cb(null, true)
    } else {
        // Reported through handleUpload as a 400
        cb(new multer.MulterError('LIMIT_UNEXPECTED_FILE', 'type'), false)
    }
}

export const MAX_IMAGES = 8

const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB per photo (the dashboard shrinks them first)
        files: MAX_IMAGES,         // 8 x 5MB = 40MB in memory at most per request
        fields: 20,                // text fields (name, price, sizes, ...)
        fieldSize: 64 * 1024       // 64KB per text field
    }
})

// Turns multer's error codes into messages a person can act on.
const messageFor = (err) => {
    if (err.code === 'LIMIT_UNEXPECTED_FILE' && err.field === 'type') {
        return 'Only JPEG, PNG, WebP or AVIF images can be uploaded'
    }
    switch (err.code) {
        case 'LIMIT_FILE_SIZE': return 'Each image must be 5MB or smaller'
        case 'LIMIT_FILE_COUNT': return `A product can have at most ${MAX_IMAGES} images`
        case 'LIMIT_UNEXPECTED_FILE': return `Too many images, or images sent in the wrong field (at most ${MAX_IMAGES})`
        case 'LIMIT_FIELD_COUNT': return 'Too many form fields'
        case 'LIMIT_FIELD_VALUE': return 'A form field is too long'
        default: return 'The upload could not be read'
    }
}

// upload.array(field, 8) accepts up to 8 files under one field name and puts
// them in req.files (an array). Wrapped so a bad upload answers 400 JSON
// instead of falling through to the generic error handler.
export const handleUpload = (field) => {
    const middleware = upload.array(field, MAX_IMAGES)
    return (req, res, next) => {
        middleware(req, res, (err) => {
            if (!err) return next()
            if (err instanceof multer.MulterError) {
                return res.status(400).json({ message: messageFor(err) })
            }
            next(err)
        })
    }
}

export default upload
