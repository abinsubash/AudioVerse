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
const categoryPg = async (req, res) => {
  const searchCategory =req.query.searchCategory||''
  const page = parseInt(req.query.page) || 1;
  const limit = 10;
  const skip = (page - 1) * limit; 

  try {
    const categories = await Category.find({
      categoryName: { 
        $regex: new RegExp(searchCategory, 'i')  
      }
    })
      .skip(skip)
      .limit(limit);
    
    const totalCategories = await Category.countDocuments(); 
    const totalPages = Math.ceil(totalCategories / limit); 

    res.render('admin/category', {
      categories: categories,
      currentPage: page,
      totalPages: totalPages,
      searchCategory:searchCategory
    });
  } catch (error) {
    console.log('Error fetching categories:', error);
  }
};




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
    res.render("layout/404");
  }
};


const editCategory = async (req, res) => {
  try {
      const { categoryId } = req.params;
      const { categoryName } = req.body;

      // Check if the category exists
      const category = await Category.findById(categoryId);
      if (!category) {
          return res.status(404).json({ success: false, message: "Category not found" });
      }

      const existingCategory = await Category.findOne({
          categoryName: { $regex: new RegExp('^' + categoryName + '$', 'i') },
          _id: { $ne: categoryId }
      });

      if (existingCategory) {
          return res.json({ success: false, message: 'Category name already exists' });
      }

      category.categoryName = categoryName;

      await category.save();
      res.json({ success: true, message: "Category updated successfully" });
  } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, message: "Internal server error" });
  }
};

  
module.exports = {addCategory,categoryPg,categoryDelete,editCategory}