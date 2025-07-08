import SubCategory from "../models/subCategory.modal.js"; 
import Category from "../models/category.modal.js";


// Create a new subcategory
const createSubCategory = async (req, res) => {
  try {
    const { categoryId, name, description , price} = req.body;
    
    // Check if category exists (optional, but good for integrity)
    const category = await Category.findById(categoryId);
    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    const newSubCategory = new SubCategory({
      categoryId,
      name,
      description,
      price,
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

const getSubCategoriesByCategoryName = async (req, res) => {
  try {
    const { categoryName } = req.body;  // Now accessing category name from request body

    if (!categoryName) {
      return res.status(400).json({ message: "Category name is required in the request body" });
    }

    // console.log("Received categoryName:", categoryName);

    // Step 1: Find the category document by its name
    const category = await Category.findOne({ name: categoryName });

    if (!category) {
      // console.log(`Category "${categoryName}" not found`);
      return res.status(404).json({ message: "Category not found" });
    }

    // console.log("Category found:", category);

    // Step 2: Find subcategories using the category's _id
    const subCategories = await SubCategory.find({ categoryId: category._id });

    if (subCategories.length === 0) {
      // console.log(`No subcategories found for category "${categoryName}"`);
      return res.status(404).json({ message: "No subcategories found for this category" });
    }

    // console.log("Found subcategories:", subCategories);

    // Step 3: Return the subcategories in the response
    res.status(200).json(subCategories);
  } catch (error) {
    console.error("Error fetching subcategories:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

const markAllSubCategoriesTradable = async (req, res) => {
  try {
    // Update all subcategories to set isTradable to true
    const result = await SubCategory.updateMany({}, { isTradable: true });

    res.status(200).json({
      message: 'All subcategories marked as tradable successfully.',
      updatedCount: result.nModified,
    });
  } catch (error) {
    console.error('Error updating subcategories:', error);
    res.status(500).json({ message: 'An error occurred while updating subcategories.', error });
  }
};

const updatePriceForAllSubCategories = async (req, res) => {
  try {
    // Update the price field for all subcategories to 100
    const result = await SubCategory.updateMany({}, { price: 100 });

    res.status(200).json({
      message: "Price updated to 100 for all subcategories successfully.",
      modifiedCount: result.nModified, // Number of documents modified
    });
  } catch (error) {
    console.error("Error updating prices:", error);
    res.status(500).json({ message: "An error occurred while updating prices.", error });
  }
};

const uploadSubCategoryImage = async (req, res) => {
  try {
    const { subcategoryId, image } = req.body;

    // Validate the required fields
    if (!subcategoryId || !image) {
      return res.status(400).json({ message: 'Subcategory ID and image are required.' });
    }

    // Find the subcategory by ID
    const subCategory = await SubCategory.findById(subcategoryId);

    if (!subCategory) {
      return res.status(404).json({ message: 'Subcategory not found.' });
    }

    // Update the image field
    subCategory.image = image;

    // Save the updated document
    await subCategory.save();

    return res.status(200).json({
      message: 'Image uploaded successfully.',
      subCategory,
    });
  } catch (error) {
    console.error('Error uploading image:', error);
    return res.status(500).json({ message: 'Internal server error.', error: error.message });
  }
};

const updateAllSubCategoryImages = async (req, res) => {
  try {
    const { base64Image } = req.body;

    if (!base64Image) {
      return res.status(400).json({ message: 'Base64 image string is required' });
    }

    // Update all category images
    const result = await SubCategory.updateMany({}, { image: base64Image });

    res.status(200).json({
      message: `Updated images for ${result.modifiedCount} categories successfully`,
    });
  } catch (error) {
    console.error('Error updating category images:', error);
    res.status(500).json({ message: 'Failed to update category images', error: error.message });
  }
};

export {
  createSubCategory,
  getAllSubCategories,
  getSubCategoryById,
  updateSubCategory,
  deleteSubCategory,
  getSubCategoriesByCategoryId,
  getSubCategoriesByCategoryName,
  markAllSubCategoriesTradable,
  updatePriceForAllSubCategories,
  uploadSubCategoryImage,
  updateAllSubCategoryImages
};
