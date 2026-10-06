import cloudinary from "./cloudinary.js";

const uploadToCloudinary = (buffer) => {
    return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
            {
                folder: "clipBoard/product-images",
                resource_type: "image",
            },
            (error, result) => {
                if (error) {
                    reject(error);
                    return;
                }

                resolve(result);
            }
        );
        uploadStream.end(buffer);
    });
};

// Removes a photo from Cloudinary by its public id. "not found" counts as done,
// so deleting twice is harmless.
export const deleteFromCloudinary = async (publicId) => {
    const result = await cloudinary.uploader.destroy(publicId, { resource_type: "image" });
    if (result.result !== "ok" && result.result !== "not found") {
        throw new Error(`Cloudinary delete failed for ${publicId}: ${result.result}`);
    }
    return result;
};

// The admin controller calls these through one object, so tests can swap in
// fakes without uploading anything real.
export const imageStore = {
    upload: uploadToCloudinary,
    destroy: deleteFromCloudinary,
};

export default uploadToCloudinary;