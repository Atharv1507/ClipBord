import mongoose from "mongoose";
import { Product } from "../models/product.model.js";
import { Order } from "../models/order.model.js";
import { imageStore } from "../utils/uploadCloudinary.js";
import { MAX_IMAGES } from "../middlewares/upload.middleware.js";

// The dashboard's product endpoints. Every route here already passed
// requireAdmin (see routes/admin.routes.js).

const CATEGORIES = Product.schema.path("category").enumValues;
const SIZES = ["S", "M", "L", "XL"];
const PAGE_SIZE = 20;

// Products made before galleries have only `image`; show it as a one-photo
// gallery so the form always works with `images`.
const withGallery = (product) => ({
  ...product,
  images: product.images?.length ? product.images : [{ url: product.image }],
});

const fail = (status, message) => Object.assign(new Error(message), { status });

// Checks every text field before anything is uploaded, so a typo never
// leaves orphan photos on Cloudinary. Throws a 400 with a readable message.
const readProductFields = (body) => {
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name || name.length > 120) {
    throw fail(400, "Name is required (up to 120 characters)");
  }

  const price = Number(body.price);
  // Whole rupees or paise, nothing finer, so price * 100 is always exact.
  if (!Number.isFinite(price) || price <= 0 || Math.abs(price * 100 - Math.round(price * 100)) > 1e-6) {
    throw fail(400, "Price must be a positive amount in rupees");
  }

  const category = body.category;
  if (!CATEGORIES.includes(category)) {
    throw fail(400, `Category must be one of: ${CATEGORIES.join(", ")}`);
  }

  const description = typeof body.description === "string" ? body.description.trim() : "";
  if (description.length > 2000) {
    throw fail(400, "Description can be up to 2000 characters");
  }

  // Form data only carries strings, so sizes arrive as JSON: '{"S":10,"M":4}'.
  let rawSizes;
  try {
    rawSizes = JSON.parse(body.sizes ?? "{}");
  } catch {
    throw fail(400, "Invalid stock format");
  }
  if (!rawSizes || typeof rawSizes !== "object" || Array.isArray(rawSizes)) {
    throw fail(400, "Invalid stock format");
  }
  const sizes = {};
  for (const size of SIZES) {
    const value = rawSizes[size] ?? 0;
    if (!Number.isInteger(value) || value < 0) {
      throw fail(400, `Stock for ${size} must be a whole number, 0 or more`);
    }
    sizes[size] = value;
  }

  return { name, price, category, description, sizes };
};

// Deletes photos we just uploaded when the save didn't go through.
const discard = (images) =>
  Promise.allSettled(images.filter((img) => img.publicId).map((img) => imageStore.destroy(img.publicId)));

// Uploads all files at once. allSettled waits for every upload even if one
// fails, so we know exactly which ones made it and can clean those up.
const uploadAll = async (files) => {
  const results = await Promise.allSettled(files.map((file) => imageStore.upload(file.buffer)));
  const uploaded = results
    .filter((r) => r.status === "fulfilled")
    .map((r) => ({ url: r.value.secure_url, publicId: r.value.public_id }));

  if (uploaded.length !== files.length) {
    await discard(uploaded);
    throw fail(502, "Image upload failed, please try again");
  }
  return uploaded;
};

// After an edit removes photos, delete them from Cloudinary, except any an
// order still shows (orders keep the cover URL they were bought with).
const deleteRemoved = async (images) => {
  for (const img of images) {
    if (!img.publicId) continue;
    try {
      if (await Order.exists({ "items.image": img.url })) continue;
      await imageStore.destroy(img.publicId);
    } catch (err) {
      // The product is already saved; a leftover file only costs storage.
      console.error(`Could not delete image ${img.publicId}:`, err.message);
    }
  }
};

const sendError = (res, err) => {
  if (err.status) {
    return res.status(err.status).json({ message: err.message });
  }
  if (err.name === "ValidationError") {
    return res.status(400).json({ message: err.message });
  }
  console.error(err);
  return res.status(500).json({ message: "Internal server error" });
};

const findProduct = async (id) => {
  if (!mongoose.isValidObjectId(id)) return null;
  return Product.findById(id).lean();
};

// GET /admin/products?search=&category=&status=active|archived|all&page=
export const listProducts = async (req, res) => {
  try {
    let page = parseInt(req.query.page);
    if (isNaN(page) || page < 1) page = 1;

    const filter = {};
    if (typeof req.query.search === "string" && req.query.search.trim()) {
      // Escaped, so "(" or "." in a search are plain characters, not regex.
      const escaped = req.query.search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      filter.name = { $regex: escaped, $options: "i" };
    }
    if (CATEGORIES.includes(req.query.category)) {
      filter.category = req.query.category;
    }
    if (req.query.status === "active") filter.archived = { $ne: true };
    if (req.query.status === "archived") filter.archived = true;

    const [products, total] = await Promise.all([
      Product.find(filter)
        .sort({ createdAt: -1, _id: -1 })
        .skip((page - 1) * PAGE_SIZE)
        .limit(PAGE_SIZE)
        .lean(),
      Product.countDocuments(filter),
    ]);

    return res.status(200).json({
      products: products.map(withGallery),
      page,
      totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
      total,
    });
  } catch (err) {
    return sendError(res, err);
  }
};

// GET /admin/products/:id
export const getProduct = async (req, res) => {
  try {
    const product = await findProduct(req.params.id);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }
    return res.status(200).json({ product: withGallery(product) });
  } catch (err) {
    return sendError(res, err);
  }
};

// POST /admin/products  (multipart: fields + images[])
export const createProduct = async (req, res) => {
  let uploaded = [];
  try {
    const values = readProductFields(req.body);
    const files = req.files ?? [];
    if (files.length === 0) {
      throw fail(400, "Add at least one image");
    }

    uploaded = await uploadAll(files);
    // The model's hook sets `image` (the cover) to the first photo.
    const product = await Product.create({ ...values, images: uploaded });

    return res.status(201).json({ product: withGallery(product.toObject()) });
  } catch (err) {
    await discard(uploaded);
    return sendError(res, err);
  }
};

// Reads imageOrder, the gallery as it should be after the edit, e.g.
//   ["existing:clipBoard/product-images/abc", "new:0", "existing:.../def"]
// - "existing:<publicId>" keeps a photo the product already has
// - "existing-url:<url>"  same, for older photos saved without a publicId
// - "new:<n>"             the n-th file uploaded in newImages
// Throws 400 unless it's 1-8 entries, every existing one belongs to this
// product (once), and every uploaded file is used exactly once.
const readImageOrder = (raw, currentImages, fileCount) => {
  let order;
  try {
    order = JSON.parse(raw ?? "");
  } catch {
    throw fail(400, "Invalid image order");
  }
  if (!Array.isArray(order) || order.length < 1 || order.length > MAX_IMAGES) {
    throw fail(400, `A product needs 1 to ${MAX_IMAGES} images`);
  }

  const usedExisting = new Set();
  const usedNew = new Set();
  const plan = order.map((token) => {
    if (typeof token !== "string") throw fail(400, "Invalid image order");

    if (token.startsWith("new:")) {
      const index = Number(token.slice(4));
      if (!Number.isInteger(index) || index < 0 || index >= fileCount || usedNew.has(index)) {
        throw fail(400, "Invalid image order");
      }
      usedNew.add(index);
      return { newIndex: index };
    }

    let existing;
    if (token.startsWith("existing:")) {
      const publicId = token.slice(9);
      existing = currentImages.find((img) => img.publicId && img.publicId === publicId);
    } else if (token.startsWith("existing-url:")) {
      const url = token.slice(13);
      existing = currentImages.find((img) => img.url === url);
    }
    if (!existing || usedExisting.has(existing.url)) {
      throw fail(400, "Invalid image order");
    }
    usedExisting.add(existing.url);
    return { existing };
  });

  if (usedNew.size !== fileCount) {
    throw fail(400, "Every uploaded image must be placed in the gallery");
  }
  return plan;
};

// PATCH /admin/products/:id  (multipart: fields + newImages[] + imageOrder + updatedAt)
export const updateProduct = async (req, res) => {
  let uploaded = [];
  try {
    const product = await findProduct(req.params.id);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    const values = readProductFields(req.body);
    const files = req.files ?? [];
    const currentImages = withGallery(product).images;
    const plan = readImageOrder(req.body.imageOrder, currentImages, files.length);

    // The version of the product the form was loaded from. If a purchase or
    // another edit changed it since, saving would overwrite that change
    // (e.g. put back stock that was just sold).
    const loadedAt = new Date(req.body.updatedAt);
    if (isNaN(loadedAt)) {
      throw fail(400, "Missing product version, reload and try again");
    }
    const STALE = "This product changed since you opened it (maybe an order came in). Reload to see the latest, then save again.";
    if (product.updatedAt.getTime() !== loadedAt.getTime()) {
      throw fail(409, STALE);
    }

    uploaded = await uploadAll(files);
    const images = plan.map((step) => (step.existing ? step.existing : uploaded[step.newIndex]));

    // Saves only if updatedAt is still what the form loaded. updateOne skips
    // the model's hook, so the cover is set here explicitly.
    const result = await Product.updateOne(
      { _id: product._id, updatedAt: loadedAt },
      { $set: { ...values, images, image: images[0].url } },
      { runValidators: true }
    );
    if (result.matchedCount === 0) {
      throw fail(409, STALE);
    }
    uploaded = []; // saved: no longer ours to clean up

    const kept = new Set(images.map((img) => img.url));
    await deleteRemoved(currentImages.filter((img) => !kept.has(img.url)));

    const updated = await Product.findById(product._id).lean();
    return res.status(200).json({ product: withGallery(updated) });
  } catch (err) {
    await discard(uploaded);
    return sendError(res, err);
  }
};

// PATCH /admin/products/:id/archive  { archived: true | false }
export const setArchived = async (req, res) => {
  try {
    if (typeof req.body.archived !== "boolean") {
      return res.status(400).json({ message: "archived must be true or false" });
    }
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({ message: "Product not found" });
    }
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { $set: { archived: req.body.archived } },
      { returnDocument: "after" }
    ).lean();
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }
    return res.status(200).json({ product: withGallery(product) });
  } catch (err) {
    return sendError(res, err);
  }
};
