const Category = require('../../model/categoryModel');

const addCategory= async (req,res)=>{
    try{
    const {categoryName}= req.body
    const categoryExist = await Category.findOne({ categoryName: { $regex: new RegExp(`^${categoryName}$`, 'i') } });
    
    if(categoryExist){
        return res.json({success:false,message:"Category already exist"})
    }
    const newCategory = new Category({
        categoryName:categoryName
    });
    await newCategory.save();
    res.json({success:true,message:"category added successFully"});
           
}catch(error){
    res.json({success:false,message:"something went wrong"})
}
}

const categoryPg = async (req,res)=>{
    res.render('admin/category')
};


const categoryListing = async (req,res)=>{
try{
const categoryList =await Category.find({})
res.json(categoryList);
}catch(error){
console.log(error)
}
}


const categoryDelete = async (req, res) => {
  try {
    
    const { id } = req.params; 
    const category = await Category.findById(id); 
    if (category) {
      category.isDeleted = !category.isDeleted; 
      await category.save(); 
      res.json({ success: true, message: `Category ${category.isDeleted ? 'deleted' : 'restored'} successfully!` });
    } else {
      res.json({ success: false, message: "Category not found" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};


  const editCategory = async (req, res) => {
    try {
      const { categoryId } = req.params;
      const { categoryName } = req.body;
        const category = await Category.findById(categoryId);
        if (!category) {
        return res.status(404).json({ success: false, message: "Category not found" });
      }
        category.categoryName = categoryName;
      await category.save();
        res.json({ success: true, message: "Category updated successfully" });
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  };

  
module.exports = {addCategory,categoryPg,categoryListing,categoryDelete,editCategory}