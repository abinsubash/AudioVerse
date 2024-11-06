const Product = require("../../model/productModel");
const Variant = require("../../model/variantModel");
const Brand = require("../../model/brandModel");
const Category = require("../../model/categoryModel");
const fs = require("fs");

const productPage = async (req, res) => {
  try {
    const searchProduct = req.query.searchProduct || ''; 
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const skip = (page - 1) * limit;
    
    // Use the searchProduct in your query
    const totalProducts = await Product.countDocuments({
      productName: {
        $regex: new RegExp(searchProduct, 'i') // Case-insensitive search for product name
      }
    });
    
    const products = await Product.find({
      productName: {
        $regex: new RegExp(searchProduct, 'i')
      }
    })
      .populate("productBrand")
      .populate("category")
      .skip(skip)
      .limit(limit)
      .exec();
    
    const totalPages = Math.ceil(totalProducts / limit);
    
    res.render("admin/product", {
      products,
      currentPage: page,
      totalPages,
      searchProduct // Pass the search term to the template
    });    
  } catch (error) {
    console.error("Error fetching products:", error);
  }
};

const addProductPage = async (req, res) => {
  try {
    const brand = await Brand.find({ isDeleted: false });
    const category = await Category.find({ isDeleted: false });
    res.render("admin/addProduct", { brands: brand, categorys: category });
  } catch (error) {
    console.error(error);
  }
};

const addProduct = async (req, res) => {
  try {
    const { productName, brandName, categoryName, description, variants } = req.body;
    const images = req.files;

    // Validate input data
    if (!productName || !brandName || !categoryName || !description || !variants) {
      return res.status(400).json({ message: 'Please fill in all required fields' });
    }

    const productExist = await Product.findOne({ productName: productName });
    if (productExist) {
      return res.status(400).json({ message: 'Product already exists' });
    }

    const variantImagesMap = {};
    const newProduct = new Product({
      productName,
      productBrand: brandName,
      description,
      category: categoryName,
      variants: [],
    });

    await newProduct.save();
    const product = await Product.findOne({ productName });

    images.forEach((image) => {
      const match = image.fieldname.match(/variants\[(\d+)\]\[images\]\[\]/);

      if (match) {
        const variantIndex = parseInt(match[1], 10);

        if (!variantImagesMap[variantIndex]) {
          variantImagesMap[variantIndex] = [];
        }

        const relativePath = image.path
          .replace(/\\/g, "/")
          .replace(/^.*?\/public/, "");

        variantImagesMap[variantIndex].push(relativePath);
      }
    });

    for (const [index, variant] of (variants || []).entries()) {
      if (!variant || !variant.color || !variant.price || !variant.stock) {
        console.warn(`Variant at index ${index} is missing required fields`);
        continue;
      }

      const variantData = {
        color: variant.color.trim(),
        price: Number(variant.price.replace(/,/g, "")),
        stock: Number(variant.stock),
        images: variantImagesMap[index] || [],
      };

      const newVariant = new Variant({
        color: variantData.color,
        price: variantData.price,
        stock: variantData.stock,
        images: variantData.images,
        productId: product._id,
      });

      await newVariant.save();
      product.variants.push(newVariant._id);
    }

    await product.save();
    res.redirect("/admin/product");
  } catch (error) {
    console.error("Error occurred:", error);
    res.status(500).json({ message: 'Something went wrong. Please try again later.' });
  }
};

const viewProduct = async (req, res) => {
  const { id } = req.params;

  try {
    const product = await Product.findOne({ _id: id })
      .populate("productBrand")
      .populate("variants")
      .populate("category")
      .exec();

    if (!product) {
      return res.send("Product not found");
    }

    res.render("admin/variantView", { product });
  } catch (error) {
    console.error("Error fetching product:", error);
    res.status(500).send("Internal Server Error");
  }
};

const editProductPage = async (req, res) => {
  const productId = req.params.id;

  try {
    const product = await Product.findById(productId);
    const brands = await Brand.find({});
    const categories = await Category.find({});

    res.render("admin/editProduct", {
      product: product,
      brands: brands,
      categories: categories,
    });
  } catch (error) {
    console.error("Error fetching product data:", error);
  }
};

const updateProduct = async (req, res) => {
  const productId = req.params.id;
  const { productName, brandName, categoryName, description } = req.body;

  try {
    await Product.updateOne(
      { _id: productId },
      {
        productName: productName,
        productBrand: brandName,
        category: categoryName,
        description: description,
      }
    );

    res.redirect("/admin/product");
  } catch (error) {
    console.error("Error updating product:", error);
    res.status(500).send("Server error");
  }
};

const editVariant = async (req, res) => {
  const { variantId, productId } = req.query;
  const product = await Product.findOne({ _id: productId });
  const variant = await Variant.findOne({ _id: variantId });

  res.render("admin/editVariant", { variants: variant, productId });
};

const updateVariant = async (req, res) =>{
  const { productId, variantId } = req.query;
  const { color, price, stock, imagesToRemove } = req.body;
  const files = req.files;
  try {
    const variant = await Variant.findById(variantId);
    if (!variant) {
      return res.status(404).json({ message: "Variant not found" });
    }

    let images = variant.images || [];
    console.log("this is images",images)
    if (files && files.length > 0) {
      if (images.length > 1) {
        images.splice(0, files.length);
      }
    }

    if (imagesToRemove && Array.isArray(imagesToRemove)){
      images = images.filter((image) => !imagesToRemove.includes(image));
    }
    if (files && files.length > 0) {
      const newImages = files.map((file) => {
        return `/uploads/${file.filename}`;
      });
      images.push(...newImages);
    }

    await Variant.updateOne(
      { _id: variantId },
      {
        color,
        price,
        stock,
        images,
      }
    );

    res.redirect(`/admin/viewProduct/${productId}`);
  } catch (error) {
    console.error("Error updating variant:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

const isDeleted = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await Product.findById(id);

    if (product) {
      // Toggle the `isDeleted` status
      product.isDeleted = !product.isDeleted;
      await product.save();

      res.json({
        success: true,
        message: `Product ${
          product.isDeleted ? "deleted" : "restored"
        } successfully!`,
      });
    } else {
      res.json({ success: false, message: "Product not found" });
    }
  } catch (error) {
    console.error("Error toggling product:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};



const addNewVariant = async (req, res) => {
  const { color, stock, price } = req.body;
  const productId = req.params.productId
  const imagePaths = req.files.map(file => {
    const relativePath = `/uploads/${file.filename}`;
    return relativePath;
  });

  try {
    const newVariant = new Variant({
      productId:productId,
      color: color,
      stock: stock,
      price: price,
      images: imagePaths
    });

    await newVariant.save();
    await Product.updateOne(
      { _id: productId }, 
      { $push: { variants: newVariant._id } } 
    );
    const proudct = await Product.findOne({_id:productId});

    res.json({success:true, message: 'Variant added successfully!' ,productId:productId });
  } catch (err) {
    console.error('Error adding variant and updating product:', err);
    res.status(500).json({ error: 'Failed to add variant or update product' });
  }
};



const newVariant =async (req,res)=>{
  const productId = req.params.productId;
  const product = await Product.findOne({_id:productId});
res.render('admin/addnewVariant',{product})
}

module.exports = {
  productPage,
  addProductPage,
  addProduct,
  viewProduct,
  editProductPage,
  updateProduct,
  editVariant,
  updateVariant,
  isDeleted,
  newVariant,
  addNewVariant
};
