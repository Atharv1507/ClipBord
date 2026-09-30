// Adds the sample catalogue in products.json through the real create endpoint
// (POST /products/create), exactly like the admin form would: multipart form data
// with the image file, name, price, desc, category and sizes (as a JSON string).
//
//   node scripts/seed/seedProducts.js                  # server must be running
//   API_URL=http://localhost:8000 node scripts/seed/seedProducts.js
//
// Images come from images/<slug>.png (run generateImages.py first). A product whose
// name is already in the shop is skipped, so running this twice doesn't duplicate
// anything. The created ids are saved to seed-output.json.

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const API_URL = process.env.API_URL ?? "http://localhost:8000";

async function alreadyExists(name) {
  const url = new URL("/products/getAll", API_URL);
  url.searchParams.set("search", name);
  url.searchParams.set("limit", "50");
  const res = await fetch(url);
  if (!res.ok) throw new Error(`getAll failed with ${res.status}`);
  const data = await res.json();
  return data.Allproducts.find((p) => p.name === name) ?? null;
}

async function createProduct(product) {
  const image = await readFile(path.join(HERE, "images", `${product.slug}.png`));

  const form = new FormData();
  form.append("name", product.name);
  form.append("price", String(product.price));
  form.append("desc", product.desc);
  form.append("category", product.category);
  form.append("sizes", JSON.stringify(product.sizes));
  form.append("image", new Blob([image], { type: "image/png" }), `${product.slug}.png`);

  const res = await fetch(new URL("/products/create", API_URL), { method: "POST", body: form });
  const data = await res.json().catch(() => ({}));
  if (res.status !== 201) {
    throw new Error(`${res.status} ${data.message ?? JSON.stringify(data)}`);
  }
  return data.prod;
}

async function main() {
  const products = JSON.parse(await readFile(path.join(HERE, "products.json"), "utf8"));
  const results = [];
  let failed = 0;

  // One at a time, so the image uploads don't all hit Cloudinary at once.
  for (const [i, product] of products.entries()) {
    const label = `[${String(i + 1).padStart(2)}/${products.length}] ${product.name}`;
    try {
      const existing = await alreadyExists(product.name);
      if (existing) {
        console.log(`${label}: already there, skipped (${existing._id})`);
        results.push({ slug: product.slug, id: existing._id, status: "skipped" });
        continue;
      }
      const created = await createProduct(product);
      console.log(`${label}: created ${created._id} (₹${created.price})`);
      results.push({ slug: product.slug, id: created._id, image: created.image, status: "created" });
    } catch (err) {
      failed++;
      console.error(`${label}: FAILED ${err.message}`);
      results.push({ slug: product.slug, status: "failed", error: err.message });
    }
  }

  await writeFile(path.join(HERE, "seed-output.json"), JSON.stringify(results, null, 2) + "\n");
  const created = results.filter((r) => r.status === "created").length;
  console.log(`\n${created} created, ${results.length - created - failed} skipped, ${failed} failed`);
  if (failed) process.exitCode = 1;
}

main();
