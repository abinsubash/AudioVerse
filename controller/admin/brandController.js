const Brand = require("../../model/brandModel");

const addBrand = async (req, res) => {
  const { brandName } = req.body;

  if (!brandName) {
    return res.json({ success: false, message: "Brand name is required" });
  }

  // Check if the brand already exists
  const existingBrand = await Brand.findOne({
    brandName: { $regex: new RegExp(brandName, "i") },
  });

  if (existingBrand) {
    return res.json({ success: false, message: "Brand already exists" });
  }

  // Create new brand
  const newBrand = new Brand({ brandName });

  try {
    await newBrand.save();
    return res.json({ success: true, message: "Brand added successfully" });
  } catch (error) {
    console.error(error);
    return res.json({ success: false, message: "An error occurred" });
  }
};


const deleteBrand = async (req, res) => {
  try {
    const brandId = req.params.id;
    await Brand.findByIdAndUpdate(brandId, { isDeleted: true });
    res.json({ success: true, message: "Brand deleted successfully" });
  } catch (error) {
    res.json({ success: false, message: "Error deleting brand" });
  }
};

const restoreBrand = async (req, res) => {
  try {
    const brandId = req.params.id;
    await Brand.findByIdAndUpdate(brandId, { isDeleted: false });
    res.json({ success: true, message: "Brand restored successfully" });
  } catch (error) {
    res.json({ success: false, message: "Error restoring brand" });
  }
};

const getBrand = async (req, res) => {
  try {
    const brand = await Brand.findById(req.params.id);
    if (brand) {
      res.json({ success: true, brand });
    } else {
      res.json({ success: false, message: "Brand not found" });
    }
  } catch (error) {
    console.log(error)
    res.render("layout/404");
  }
};

const updateBrand = async (req, res) => {
  try {
    const { brandName } = req.body;
    const brandId = req.params.id;

    const brand = await Brand.findById(brandId);
    if (!brand) {
      return res
        .status(404)
        .json({ success: false, message: "Brand not found" });
    }

    const existingBrand = await Brand.findOne({
      brandName: { $regex: new RegExp("^" + brandName + "$", "i") },
    });

    if (existingBrand) {
      return res.json({ success: false, message: "Brand name already exists" });
    }

    if (brandName) {
      brand.brandName = brandName;
    }

    await brand.save();
    res.json({ success: true, message: "Brand updated successfully" });
  } catch (error) {
    console.error("Error updating brand:", error);
    res.render("layout/404");
  }
};

module.exports = { addBrand, deleteBrand, restoreBrand, updateBrand, getBrand };
