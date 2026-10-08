import mongoose from "mongoose";
import { Product } from "../models/product.model.js";
import { serverError } from "../utils/serverError.js";

// Allowed values come straight from the schema, so the controller never
// drifts out of sync with the model if an enum value is added later.
const CATEGORIES = Product.schema.path("category").enumValues;

const DEFAULT_LIMIT = 12;
const MAX_LIMIT = 50;

// Turns a comma-separated query param into a clean list of strings.
// ?category=Tshirt,Joggers -> ["Tshirt", "Joggers"]. A repeated key
// (?category=Tshirt&category=Joggers) arrives as an array, so its string parts
// are joined first. Anything else (missing, objects) gives an empty list.
const toList = (value) => {
  let raw = "";
  if (typeof value === "string") {
    raw = value;
  } else if (Array.isArray(value)) {
    raw = value.filter((v) => typeof v === "string").join(",");
  }
  return raw
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
};

// Reads a price bound. Only a plain, finite, non-negative number counts;
// "abc", "-5", "" or a repeated key are ignored (returns null).
const toPrice = (value) => {
  if (typeof value !== "string" || value.trim() === "") {
    return null;
  }
  const num = Number(value);
  if (!Number.isFinite(num) || num < 0) {
    return null;
  }
  return num;
};

export const getAllProducts = async (req, res) => {
  try {
    // 1. Read page & limit from the query string (?page=2&limit=12).
    //    Query params always arrive as strings, so parse them. Anything
    //    missing or invalid ("abc", "-5", "0") falls back to a safe value.
    let page = parseInt(req.query.page);
    if (isNaN(page) || page < 1) {
      page = 1;
    }

    let limit = parseInt(req.query.limit);
    if (isNaN(limit) || limit < 1) {
      limit = DEFAULT_LIMIT;
    }
    if (limit > MAX_LIMIT) {
      limit = MAX_LIMIT;
    }

    // 2. How many documents to jump over to reach this page.
    //    page 1 -> skip 0, page 2 -> skip 12, page 3 -> skip 24 ...
    const skip = (page - 1) * limit;

    // 3. Optional search (?search=jog). Matches any product whose name
    //    contains the text, ignoring case, so "jog" finds "Joggers".
    //    ?search=a&search=b arrives as an array, so only a string is used.
    //    No search means an empty filter, which lists everything.
    //    Capped at 120 characters (the longest a product name can be) and
    //    escaped, so "(" or "." are plain characters and a crafted pattern
    //    can't make the database do heavy regex work.
    let search = "";
    if (typeof req.query.search === "string") {
      search = req.query.search.trim().slice(0, 120);
    }
    const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const searchFilter = search
      ? { name: { $regex: escaped, $options: "i" } }
      : {};

    // 4. Optional category filter (?category=Tshirt,Sweat Shirt). Category
    //    names must match the enum exactly ("Sweat Shirt", not "sweatshirt").
    //    If nothing valid is left, the filter is skipped instead of matching nothing.
    const categories = [...new Set(toList(req.query.category))].filter((c) =>
      CATEGORIES.includes(c)
    );
    const categoryFilter = categories.length
      ? { category: { $in: categories } }
      : {};

    // 5. Optional price range (?minPrice=500&maxPrice=2000). Either bound
    //    can be used alone. If they are the wrong way round, swap them so
    //    ?minPrice=2000&maxPrice=500 still means "500 to 2000".
    let minPrice = toPrice(req.query.minPrice);
    let maxPrice = toPrice(req.query.maxPrice);
    if (minPrice !== null && maxPrice !== null && minPrice > maxPrice) {
      [minPrice, maxPrice] = [maxPrice, minPrice];
    }
    const priceRange = {};
    if (minPrice !== null) priceRange.$gte = minPrice;
    if (maxPrice !== null) priceRange.$lte = maxPrice;
    const priceFilter = Object.keys(priceRange).length
      ? { price: priceRange }
      : {};

    // 6. Every filter is ANDed together. Each one only touches its own
    //    field, so spreading them into one object is the same as $and.
    // Archived products are hidden from the shop. $ne also matches older
    // products that have no archived field at all.
    const activeFilter = { archived: { $ne: true } };
    const filter = {
      ...activeFilter,
      ...searchFilter,
      ...categoryFilter,
      ...priceFilter,
    };

    // 7. Facet counts for the sidebar. Each group uses the search plus the
    //    OTHER active filter, but not its own. That way ticking "Tshirt" still
    //    shows how many "Joggers" there are, so the user can widen the
    //    selection instead of seeing zeros everywhere.
    const categoryFacetMatch = { ...activeFilter, ...searchFilter, ...priceFilter };
    const priceFacetMatch = { ...activeFilter, ...searchFilter, ...categoryFilter };

    // 8. Fetch this page's products, the total count and the two facets
    //    at the same time, since none of them depends on another.
    //    Sorting by createdAt + _id keeps the order stable between requests,
    //    so no product repeats or goes missing across pages. The listing only
    //    needs card fields (_id is included by default); full details come
    //    from getProductById.
    const [Allproducts, total, categoryGroups, priceGroups] =
      await Promise.all([
        Product.find(filter)
          .select("name price image category")
          .sort({ createdAt: -1, _id: -1 })
          .skip(skip)
          .limit(limit),
        Product.countDocuments(filter),
        Product.aggregate([
          { $match: categoryFacetMatch },
          { $group: { _id: "$category", count: { $sum: 1 } } },
        ]),
        Product.aggregate([
          { $match: priceFacetMatch },
          {
            $group: {
              _id: null,
              min: { $min: "$price" },
              max: { $max: "$price" },
            },
          },
        ]),
      ]);

    // 9. Count the matching products so the frontend knows how many pages exist.
    const totalPages = Math.ceil(total / limit);

    // 10. Shape the facets so every category is always present (0 when no
    //     product has it), which keeps the sidebar layout steady.
    const toCounts = (values, groups) => {
      const counts = Object.fromEntries(values.map((v) => [v, 0]));
      for (const { _id, count } of groups) {
        if (Object.hasOwn(counts, _id)) counts[_id] = count;
      }
      return counts;
    };
    const facets = {
      category: toCounts(CATEGORIES, categoryGroups),
      price: {
        min: priceGroups[0]?.min ?? null,
        max: priceGroups[0]?.max ?? null,
      },
    };

    return res.status(200).json({
      message: "All Products listed",
      Allproducts,
      page,
      limit,
      total,
      totalPages,
      hasMore: page < totalPages,
      facets,
    });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const getProductById = async (req,res)=>{
  try{
    const productId=req.params.id
    if(!mongoose.isValidObjectId(productId)){
      return res.status(404).json({message:"Product not found"})
    }
    const found= await Product.findById(productId).lean()
    if(!found){
      return res.status(404).json({message:"Product not found"})
    }
    // Archived products still load (old links, wishlists, past orders) with
    // archived: true, so the page can say "No longer available".
    // Products from before galleries show their one image as the gallery.
    const prod={...found, archived:found.archived===true, images:found.images?.length?found.images:[{url:found.image}]}
    return res.status(200).json({message:"Product Found", prod})
  }
  catch(err){
    return serverError(res, err)
  }
}
