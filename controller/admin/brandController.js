const Brand = require("../../model/brandModel");

const addBrand = async (req, res) => {
  const brandName = req.body.brandName;
  console.log("hiadfhasdf", brandName);

  if (!brandName) {
    return res.send("Brand name is required");
  }
  const brand = await Brand.findOne({
    brandName: { $regex: new RegExp(brandName, "i") },
  });
  console.log(brand);
  if (brand) {
    return console.log("brand exist");
  }
  const newBrand = new Brand({ brandName });

  try {
    await newBrand.save();
    res.redirect("/admin/brands");
  } catch (error) {
    console.error(error);
    res.status(500).send("Error adding brand");
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
      res.status(404).json({ success: false, message: "Brand not found" });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching brand" });
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
    res.status(500).json({ success: false, message: "Error updating brand" });
  }
};

module.exports = { addBrand, deleteBrand, restoreBrand, updateBrand, getBrand };
