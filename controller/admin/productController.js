const Product = require('../../model/productModel');
const Variant = require('../../model/variantModel');
const Brand = require('../../model/brandModel');
const Category = require('../../model/categoryModel');
const fs = require('fs');

const productPage = async (req, res) => {
    try {
        
        const products = await Product.find({})
            .populate('productBrand')
            .populate('category') 
            .exec();
        res.render('admin/product', { products });
    } catch (error) {
        console.error('Error fetching products:', error);
    }
};

const addProductPage = async (req, res) => {
    try {
        const brand = await Brand.find({ isDeleted: false });
        const category = await Category.find({ isDeleted: false });
        res.render('admin/addProduct',{brands:brand,categorys:category});
        } catch (error) {
        console.error(error);
    }
};




const addProduct = async (req, res) => {
    try {
        const { productName, brandName, categoryName, description, variants } = req.body;

        console.log(req.files)
        const images = req.files;
        const productExist = await Product.findOne({productName:productName})
        if (productExist) {
            return console.log("product is exist ")
        }
        const variantImagesMap = {};
        const newProduct = new Product({
            productName: productName,
            productBrand: brandName,
            description: description,
            category: categoryName,
            variants: []
        });

        await newProduct.save();
        const product = await Product.findOne({ productName: productName });

        images.forEach((image) => {
            const match = image.fieldname.match(/variants\[(\d+)\]\[images\]\[\]/);

            if (match) {
                const variantIndex = parseInt(match[1], 10);

                if (!variantImagesMap[variantIndex]) {
                    variantImagesMap[variantIndex] = [];
                }

                const relativePath = image.path
                    .replace(/\\/g, '/') 
                    .replace(/^.*?\/public/, ''); 

                variantImagesMap[variantIndex].push(relativePath);
            }
        });

        for (const [index, variant] of (variants || []).entries()) {
            if (!variant) {
                console.warn(`Variant at index ${index} is undefined or null`);
                continue;
            }

            const variantData = {
                color: (variant.color || '').trim(),
                price: Number((variant.price || '').replace(/,/g, '')),
                stock: Number(variant.stock || 0),
                images: variantImagesMap[index] || []
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
        console.error('Error occurred:', error);
        res.status(500).send('Something went wrong');
    }
};



  const viewProduct = async (req, res) => {
    const { id } = req.params;

    try {
        const product = await Product.findOne({ _id: id })
            .populate('productBrand')
            .populate('variants')
            .populate('category')
            .exec();
        
        if (!product) {
            return res.status(404).send('Product not found');
        }

        res.render('admin/VariantView', { product });
    } catch (error) {
        console.error('Error fetching product:', error);
        res.status(500).send('Internal Server Error');
    }
};



const editProductPage = async (req, res) => {
    const productId = req.params.id;

    try {
        const product = await Product.findById(productId);
        const brands = await Brand.find({});
        const categories = await Category.find({});
        
        res.render('admin/editProduct', {
            product: product,
            brands: brands,
            categories: categories
        });
    } catch (error) {
        console.error('Error fetching product data:', error);
    }
};

const updateProduct = async (req, res) => {
    const productId = req.params.id;
    const { productName, brandName, categoryName, description } = req.body;
    
    try {
         await Product.updateOne({_id:productId},{
            productName:productName,
            productBrand:brandName,
            category:categoryName,
            description:description,
         });
        
        res.redirect('/admin/product');
    } catch (error) {
        console.error('Error updating product:', error);
        res.status(500).send('Server error');
    }
};

const editVariant = async (req,res)=>{
    const {variantId,productId} = req.query
    const product = await Product.findOne({_id:productId})
    const variant = await Variant.findOne({_id:variantId});
   
    res.render('admin/editVariant',{variants:variant,productId});
}



const updateVariant = async (req, res) => {
    const { productId, variantId } = req.query;
    const { color, price, stock, imagesToRemove } = req.body;
    const files = req.files; 

    try {
        const variant = await Variant.findById(variantId);
        if (!variant) {
            return res.status(404).json({ message: 'Variant not found' });
        }

        let images = variant.images || [];

        if (images.length > 0) {
            images.splice(0, 1); 
        }

        if (imagesToRemove && Array.isArray(imagesToRemove)) {
            images = images.filter(image => !imagesToRemove.includes(image));
        }
        if (files && files.length > 0) {
            const newImages = files.map(file => {
                return `/uploads/${file.filename}`; 
            });
            images.push(...newImages);
        }

        console.log("This is images after update", images);

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
        console.error('Error updating variant:', error);
        res.status(500).json({ message: 'Internal Server Error' });
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
  
        res.json({ success: true, message: `Product ${product.isDeleted ? 'deleted' : 'restored'} successfully!` });
      } else {
        res.json({ success: false, message: 'Product not found' });
      }
    } catch (error) {
      console.error('Error toggling product:', error);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  };
  

module.exports = { 
    productPage, 
    addProductPage, 
    addProduct,
    viewProduct,
    editProductPage,
    updateProduct,
    editVariant,
    updateVariant,
    isDeleted
};
