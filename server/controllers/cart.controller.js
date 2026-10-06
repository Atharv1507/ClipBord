import { Cart } from "../models/cart.model.js";
import { Product } from "../models/product.model.js";

const sizes = Cart.schema.path("items").schema.path("size").enumValues;

export const addToCart = async (req, res) => {
  try {
    const { productId, size } = req.body;
    const quantity = Number(req.body.quantity) || 1;

    if (!productId || !sizes.includes(size) || quantity < 1) {
      return res
        .status(400)
        .json({ message: "Invalid product, size or quantity" });
    }

    const product = await Product.findById(productId);

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }
    // Hidden from the shop by the admin, so it can't be bought any more.
    if (product.archived) {
      return res.status(404).json({ message: "This product is no longer available" });
    }
    let cart = await Cart.findOne({ customer: req.customer._id });
    if (!cart) {
      cart = new Cart({ customer: req.customer._id, items: [] });
    }
    const exsisting = cart.items.find((item) => 
      item.product.equals(productId) && item.size === size
    );
    const newQuantity = (exsisting ? exsisting.quantity : 0) + quantity;

    if (product.sizes[size] < newQuantity) {
      return res
        .status(400)
        .json({ message: `Only ${product.sizes[size]} left in size ${size}` });
    }
    if (exsisting) {
      exsisting.quantity = newQuantity;
    } else {
      cart.items.push({ product: productId, size, quantity });
    }
    await cart.save();
    const count = cart.items.reduce((sum, item) => sum + item.quantity, 0);

    return res.status(200).json({ message: "Added to cart", cart: { items: cart.items, count } });

  } 
  catch (err) 
    {
    return res.status(500).json({ message: err.message });
  }
};
export const removeFromCart= async(req,res)=>{
    try{
        const{productId ,size }= req.body
        const quantity =Number(req.body.quantity)

    if (!productId || !sizes.includes(size) || quantity < 0) {
      return res
        .status(400)
        .json({ message: "Invalid product, size or quantity" });
    }
    let cart = await Cart.findOne({customer:req.customer._id})
    
    if (!cart) {
      return res.status(404).json({ message: "Cart is empty" });
    }

    const exists = cart.items.find((item)=> item.product.equals(productId) && item.size===size )

    if(!exists)
        {return res.status(400).json({ message: `No product in the cart` });}
    

    if (exists.quantity > 1) {
      exists.quantity -= 1;
    } 
    else {
      cart.items.pull(exists._id);
    }
    await cart.save()
    const count = cart.items.reduce((sum, item) => sum + item.quantity, 0);
    return res.status(200).json({ message: "Removed from cart", cart: { items: cart.items, count } });
    }
    catch (err) 
    {
    return res.status(500).json({ message: err.message });
  }
}

// Removes a whole item (every unit of one product + size), unlike removeFromCart
// which takes away one at a time.
export const removeItem = async (req, res) => {
  try {
    const { itemId } = req.body;

    if (!itemId) {
      return res.status(400).json({ message: "Item id required" });
    }

    const cart = await Cart.findOne({ customer: req.customer._id });
    if (!cart || !cart.items.id(itemId)) {
      return res.status(404).json({ message: "Item not in cart" });
    }

    cart.items.pull(itemId);
    await cart.save();

    const count = cart.items.reduce((sum, item) => sum + item.quantity, 0);
    return res.status(200).json({ message: "Removed from cart", cart: { items: cart.items, count } });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

export const getCart = async (req, res) => {
  try {
    const cart = await Cart.findOne({ customer: req.customer._id }).populate(
      "items.product",
      "name price image category sizes archived"
    );

    // No cart yet is just an empty cart, not an error.
    if (!cart) {
      return res.status(200).json({ cart: { items: [], count: 0, subtotal: 0 } });
    }

    // A product deleted after it was added populates as null; drop those items.
    const removed = cart.items.filter((item) => !item.product);
    if (removed.length) {
      removed.forEach((item) => cart.items.pull(item._id));
      await cart.save();
    }

    const items = cart.items.map((item) => ({
      _id: item._id,
      product: {
        _id: item.product._id,
        name: item.product.name,
        price: item.product.price,
        image: item.product.image,
        category: item.product.category,
        archived: item.product.archived === true,
      },
      size: item.size,
      quantity: item.quantity,
      // Stock can drop after the item was added, so the page can warn before checkout.
      // An archived product counts as sold out, so checkout is blocked until it's removed.
      available: item.product.archived ? 0 : item.product.sizes[item.size],
      lineTotal: item.product.price * item.quantity,
    }));

    const count = items.reduce((sum, item) => sum + item.quantity, 0);
    const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0);

    return res.status(200).json({ cart: { items, count, subtotal } });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};
