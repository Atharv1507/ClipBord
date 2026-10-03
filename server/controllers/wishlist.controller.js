import mongoose from "mongoose";
import { Wishlist } from "../models/wishlist.model.js";
import { Product } from "../models/product.model.js";


export const getWishlistIds = async (req, res) => {
  try {
    const wishlist = await Wishlist.findOne({ customer: req.customer._id });
    return res.status(200).json({ ids: wishlist ? wishlist.products : [] });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

export const addToWishlist = async (req, res) => {
  try {
    const { productId } = req.body;

    if (!mongoose.isValidObjectId(productId)) {
      return res.status(400).json({ message: "Invalid product" });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    // upsert creates the wishlist on the first save; $addToSet skips the id if it's already there.
    const wishlist = await Wishlist.findOneAndUpdate(
      { customer: req.customer._id },
      { $addToSet: { products: productId } },
      { new: true, upsert: true }
    );

    return res.status(200).json({ message: "Added to wishlist", ids: wishlist.products });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

export const removeFromWishlist = async (req, res) => {
  try {
    const { productId } = req.body;

    if (!mongoose.isValidObjectId(productId)) {
      return res.status(400).json({ message: "Invalid product" });
    }

    const wishlist = await Wishlist.findOneAndUpdate(
      { customer: req.customer._id },
      { $pull: { products: productId } },
      { new: true }
    );

    return res.status(200).json({ message: "Removed from wishlist", ids: wishlist ? wishlist.products : [] });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// The full products, for the wishlist page.
export const getWishlist = async (req, res) => {
  try {
    const wishlist = await Wishlist.findOne({ customer: req.customer._id }).populate(
      "products",
      "name price image category"
    );

    if (!wishlist) {
      return res.status(200).json({ products: [] });
    }

    // A product deleted after it was saved populates as null; drop it.
    const products = wishlist.products.filter(Boolean);
    if (products.length !== wishlist.products.length) {
      wishlist.products = products;
      await wishlist.save();
    }

    return res.status(200).json({ products });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};
