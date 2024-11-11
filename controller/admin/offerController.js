const res = require("express/lib/response");
const Category = require("../../model/categoryModel");
const Offer = require("../../model/offerModel");
const Product = require("../../model/productModel");
const Variant = require('../../model/variantModel')
const cron = require('node-cron')
const offer = async (req, res) => {
  try {
    const category = await Category.find({}).populate("offerId");
    const product = await Product.find({})
      .populate("productBrand")
      .populate("category")
      .populate('offerId')

    const offer = await Offer.find({});
    res.render("admin/offer", {
      categories: category,
      products: product,
      offers: offer,
    });
  } catch (error) {
    console.log(error);
  }
};

const addOffer = async (req, res) => {
  try {
    console.log(req.body);

    const { offerName, offerPercentage, startDate, endDate } = req.body;

    const newOffer = new Offer({
      offerName,
      offerPercentage,
      startDate,
      endDate,
    });

    await newOffer.save();

    res
      .status(200)
      .json({ success: true, message: "Offer created successfully" });
  } catch (error) {
    console.error(error);
  }
};

const editOffer = async (req, res) => {
  const { offerId, offerName, offerPercentage, startDate, endDate } = req.body;

  try {
    await Offer.findByIdAndUpdate(offerId, {
      offerName,
      offerPercentage,
      startDate,
      endDate,
    });
    res.status(200).json({ message: "Offer updated successfully" });
  } catch (error) {
    res.render("layout/404");
  }
};

const deleteOffer = async (req, res) => {
  try {
    console.log(req.params);
    const { offerId } = req.params;
    const offer = await Offer.findOneAndDelete({ _id: offerId });
    if (!offer) {
      return res
        .status(400)
        .json({ success: false, message: "Offer not found" });
    }
    console.log(offer);

    res.status(200).json({ sucees: true, message: "Offer deleted" });
  } catch (error) {
    console.log(error);
    res.status(400).json({ success: false, message: "something went wrong" });
  }
};


const productOffer = async(req,res)=>{
  try {
    console.log(req.body);
    const { productId, offerId } = req.body;

    const product = await Product.findById(productId).populate('variants');
    if (!product) {
        return res.status(404).json({ success: false, message: "Product not found" });
    }

    let currentOfferPercentage = 0;
    if (product.offerId) {
        const currentOffer = await Offer.findById(product.offerId);
        currentOfferPercentage = currentOffer ? currentOffer.offerPercentage : 0;
    }

    const newOffer = await Offer.findById(offerId);
    if (!newOffer) {
        return res.status(404).json({ success: false, message: "Offer not found" });
    }

    if (newOffer.offerPercentage > currentOfferPercentage) {
        const variantsToUpdate = product.variants;
        for (let variant of variantsToUpdate) {
            const variantData = await Variant.findById(variant._id);
            if (variantData) {
                variantData.offerId = offerId;
                
                variantData.offerPrice = Math.round(variantData.price - (variantData.price * (newOffer.offerPercentage / 100)));                
                await variantData.save();
            }
        }

        product.offerId = offerId;
        await product.save();

        return res.status(200).json({ success: true, message: "Offer applied to all variants successfully" });
    } else {
        return res.status(400).json({ success: false, message: "New offer must have a larger percentage than the current offer." });
    }
} catch (error) {
    console.error(error);
    res.render("layout/404");
  }

}


const removeOffer = async (req, res) => {
  const { productId, offerId } = req.body;

  try {
      await Product.findByIdAndUpdate(productId, { $unset: { offerId: "" } });

      await Variant.updateMany(
          { productId: productId, offerId: offerId },
          { $unset: { offerId: "", offerPrice: "" } }
      );

      res.status(200).json({ success: true, message: "Offer removed successfully" });
  } catch (error) {
      console.error(error);
      res.render("layout/404");
    }
}

const categoryOffer = async (req, res) => {
  console.log('Route hit: applyOfferToCategory');

  const { categoryId, offerId } = req.body;
  
  try {
    const newOffer = await Offer.findById(offerId);

    if (!newOffer || isNaN(parseFloat(newOffer.offerPercentage))) {
      return res.status(404).json({ message: 'Invalid offer or offer percentage' });
    }

    const offerPercentage = parseFloat(newOffer.offerPercentage);
    
    // Update the category with the new offer
    await Category.findByIdAndUpdate(categoryId, { offerId: offerId });

    const products = await Product.find({ category: categoryId, isDeleted: false }).populate('offerId');
    
    for (let product of products) {
      let updateProductOffer = false;

      // Update product if new offer has a higher percentage or if no current offer exists
      if (product.offerId) {
        const currentOffer = product.offerId;
        if (offerPercentage > parseFloat(currentOffer.offerPercentage)) {
          updateProductOffer = true;
        }
      } else {
        updateProductOffer = true; 
      }

      if (updateProductOffer) {
        // Update the product with the new offer
        await Product.findByIdAndUpdate(product._id, { offerId: offerId });

        // Get all variants for this product
        const variants = await Variant.find({ productId: product._id, isDeleted: false });

        for (let variant of variants) {
          const variantPrice = parseFloat(variant.price);
          if (!isNaN(variantPrice)) {
            const newOfferPrice = calculateOfferPrice(offerPercentage, variantPrice);

            if (!isNaN(newOfferPrice) && newOfferPrice >= 0) {
              await Variant.findByIdAndUpdate(variant._id, {
                offerId: offerId,
                offerPrice: newOfferPrice
              });
            } else {
              console.error(`Invalid offer price for variant ${variant._id}`);
            }
          } else {
            console.error(`Invalid price for variant ${variant._id}`);
          }
        }
      }
    }

    res.status(200).json({ message: 'Offer applied to category and updated products and variants successfully.' });
  } catch (error) {
    console.error('Error applying offer:', error);
    res.render("layout/404");
  }
};




const calculateOfferPrice = (percentage, price) => {
  return Math.round(price - (price * (percentage / 100)));
};


const removeCategoryOffer = async (req, res) => {
  const { categoryId, offerId } = req.body;

  try {
      await Category.findByIdAndUpdate(categoryId, { $unset: { offerId: 1 } });

      const products = await Product.find({ category: categoryId, isDeleted: false, offerId: offerId });
      
      for (let product of products) {
          await Product.findByIdAndUpdate(product._id, { $unset: { offerId: 1 } });

          const variants = await Variant.find({ productId: product._id, isDeleted: false, offerId: offerId });

          for (let variant of variants) {
              await Variant.findByIdAndUpdate(variant._id, {
                  $unset: { offerId: 1 ,offerPrice:1},
              });
          }
      }

      res.status(200).json({ message: 'Offer removed from category successfully.' });
  } catch (error) {
      console.error('Error removing offer from category:', error);
      res.render("layout/404");
    }
};


module.exports = { offer, addOffer, editOffer, deleteOffer ,productOffer,removeOffer,categoryOffer,removeCategoryOffer};
