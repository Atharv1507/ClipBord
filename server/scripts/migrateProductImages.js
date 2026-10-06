// One-off: gives every product made before galleries an `images` list built
// from its single `image`, including the Cloudinary publicId so the dashboard
// can delete that photo later.
//
//   node scripts/migrateProductImages.js           # dry run: shows what would change
//   node scripts/migrateProductImages.js --apply   # writes the changes
//
// Safe to run twice: products that already have images are skipped. The shop
// works without running it (old products fall back to their single image);
// it only makes old photos deletable from the dashboard.

import dotenv from "dotenv";
import mongoose from "mongoose";
import { Product } from "../models/product.model.js";

dotenv.config({ override: false });

const APPLY = process.argv.includes("--apply");

// https://res.cloudinary.com/<cloud>/image/upload/<transforms>/v1790688386/clipBoard/product-images/abc.png
//   -> clipBoard/product-images/abc
// The id is everything after the version segment, without the extension.
// URLs without a version segment are left without a publicId (still usable,
// just not deletable from the dashboard).
export const publicIdFromUrl = (url) => {
    const match = /\/upload\/(?:[^?#]*?\/)?v\d+\/([^?#]+?)(?:\.[a-z0-9]+)?(?:[?#].*)?$/i.exec(url ?? "");
    return match ? decodeURIComponent(match[1]) : null;
};

const main = async () => {
    await mongoose.connect(process.env.dbUrl);
    const missing = { $or: [{ images: { $exists: false } }, { images: { $size: 0 } }] };
    const products = await Product.find(missing).select("name image").lean();

    let changed = 0;
    let withoutId = 0;
    for (const product of products) {
        if (!product.image) continue;
        const publicId = publicIdFromUrl(product.image);
        if (!publicId) withoutId++;
        const images = [publicId ? { url: product.image, publicId } : { url: product.image }];
        console.log(`${APPLY ? "update" : "would update"} ${product._id} ${product.name} -> ${publicId ?? "(no publicId)"}`);
        if (APPLY) {
            // Same condition again, so a product edited meanwhile isn't overwritten.
            await Product.updateOne({ _id: product._id, ...missing }, { $set: { images } });
        }
        changed++;
    }

    console.log(`\n${changed} product(s) ${APPLY ? "updated" : "to update"}, ${withoutId} without a publicId.`);
    if (!APPLY && changed) console.log("Dry run only. Run again with --apply to write.");
    await mongoose.disconnect();
};

// Only run when executed directly (the test imports publicIdFromUrl).
if (import.meta.url === `file://${process.argv[1]}`) {
    main().catch(async (err) => {
        console.error(err);
        await mongoose.disconnect();
        process.exitCode = 1;
    });
}
