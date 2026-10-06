// Adds the sample catalogue in products.json through the admin create endpoint
// (POST /admin/products), exactly like the dashboard's product form: it logs in
// as the admin first, then sends multipart form data with the image file(s),
// name, price, description, category and sizes (as a JSON string).
//
//   ADMIN_EMAIL=... ADMIN_PASSWORD=... node scripts/seed/seedProducts.js   # server must be running
//   API_URL=http://localhost:8000 ADMIN_EMAIL=... ADMIN_PASSWORD=... node scripts/seed/seedProducts.js
//
// Images come from images/<slug>.png (run generateImages.py first). A product whose
// name already exists (archived ones included) is skipped, so running this twice
// doesn't duplicate anything. The created ids are saved to seed-output.json.

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const API_URL = process.env.API_URL ?? "http://localhost:8000";

// Set after login: the admin cookie plus the header csrfGuard requires.
let headers = { "X-Requested-With": "XMLHttpRequest" };

async function loginAsAdmin() {
  const { ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    throw new Error("Set ADMIN_EMAIL and ADMIN_PASSWORD to seed products");
  }
  const res = await fetch(new URL("/customer/login", API_URL), {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.admin) {
    throw new Error(`Admin login failed (${res.status} ${data.message ?? ""})`);
  }
  // Node's fetch has no cookie jar, so the cookie is carried by hand.
  const cookie = res.headers.getSetCookie().find((c) => c.startsWith("adminToken="));
  if (!cookie) throw new Error("Admin login returned no adminToken cookie");
  headers = { ...headers, Cookie: cookie.split(";")[0] };
}

async function alreadyExists(name) {
  const url = new URL("/admin/products", API_URL);
  url.searchParams.set("search", name);
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`admin product list failed with ${res.status}`);
  const data = await res.json();
  return data.products.find((p) => p.name === name) ?? null;
}

async function createProduct(product) {
  const image = await readFile(path.join(HERE, "images", `${product.slug}.png`));

  const form = new FormData();
  form.append("name", product.name);
  form.append("price", String(product.price));
  form.append("description", product.desc);
  form.append("category", product.category);
  form.append("sizes", JSON.stringify(product.sizes));
  // Repeat "images" once per photo; the server reads them as an array.
  form.append("images", new Blob([image], { type: "image/png" }), `${product.slug}.png`);

  const res = await fetch(new URL("/admin/products", API_URL), { method: "POST", headers, body: form });
  const data = await res.json().catch(() => ({}));
  if (res.status !== 201) {
    throw new Error(`${res.status} ${data.message ?? JSON.stringify(data)}`);
  }
  return data.product;
}

async function main() {
  await loginAsAdmin();
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

main().catch((err) => {
  console.error(err.message);
  process.exitCode = 1;
});
