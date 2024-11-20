import SubCategory from "../models/subCategory.modal.js"; 
import Category from "../models/category.modal.js";

// Create a new subcategory
const createSubCategory = async (req, res) => {
  try {
    const { categoryId, name, description } = req.body;
    
    // Check if category exists (optional, but good for integrity)
    const category = await Category.findById(categoryId);
    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    const newSubCategory = new SubCategory({
      categoryId,
      name,
      description,
    });

    await newSubCategory.save();
    res.status(201).json(newSubCategory);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getSubCategoriesByCategoryId = async (req, res) => {
    try {
      const categoryId = req.params.categoryId;
      
      // Find subcategories by categoryId
      const subCategories = await SubCategory.find({ categoryId }).populate('categoryId', 'name');
      
      if (subCategories.length === 0) {
        return res.status(404).json({ message: "No subcategories found for this category" });
      }
      
      res.status(200).json(subCategories);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  };

// Get all subcategories
const getAllSubCategories = async (req, res) => {
  try {
    const subCategories = await SubCategory.find().populate('categoryId', 'name'); // Populating categoryId to show category name
    res.status(200).json(subCategories);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get a specific subcategory by ID
const getSubCategoryById = async (req, res) => {
  try {
    const subCategory = await SubCategory.findById(req.params.id).populate('categoryId', 'name');
    if (!subCategory) {
      return res.status(404).json({ message: "SubCategory not found" });
    }
    res.status(200).json(subCategory);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update a subcategory by ID
const updateSubCategory = async (req, res) => {
  try {
    const updatedSubCategory = await SubCategory.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true }
    );
    if (!updatedSubCategory) {
      return res.status(404).json({ message: "SubCategory not found" });
    }
    res.status(200).json(updatedSubCategory);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete a subcategory by ID
const deleteSubCategory = async (req, res) => {
  try {
    const deletedSubCategory = await SubCategory.findByIdAndDelete(req.params.id);
    if (!deletedSubCategory) {
      return res.status(404).json({ message: "SubCategory not found" });
    }
    res.status(200).json({ message: "SubCategory deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export {
  createSubCategory,
  getAllSubCategories,
  getSubCategoryById,
  updateSubCategory,
  deleteSubCategory,
  getSubCategoriesByCategoryId
};
