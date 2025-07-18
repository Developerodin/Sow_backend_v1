import SubCategory from "../models/subCategory.modal.js"; 
import Category from "../models/category.modal.js";


// Create a new subcategory
const createSubCategory = async (req, res) => {
  console.log("createSubCategory", req.body);
  try {
    const { categoryId, name, description, price, image, imageKey } = req.body;
    
    // Check if category exists (optional, but good for integrity)
    const category = await Category.findById(categoryId);
    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    const subCategoryData = {
      categoryId,
      name,
      description,
      price,
      ...(image && { image }),
      ...(imageKey && { imageKey })
    };

    const newSubCategory = new SubCategory(subCategoryData);

    await newSubCategory.save();
    res.status(201).json(newSubCategory);
  } catch (error) {
    console.log("error", error);
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
    const { name, description, price, image, imageKey, isTradable } = req.body;
    
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (price !== undefined) updateData.price = price;
    if (image !== undefined) updateData.image = image;
    if (imageKey !== undefined) updateData.imageKey = imageKey;
    if (isTradable !== undefined) updateData.isTradable = isTradable;
    
    const updatedSubCategory = await SubCategory.findByIdAndUpdate(
      req.params.id,
      updateData,
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
    const { subcategoryId, image, imageKey } = req.body;

    // Validate the required fields
    if (!subcategoryId) {
      return res.status(400).json({ message: 'Subcategory ID is required.' });
    }

    // Find the subcategory by ID
    const subCategory = await SubCategory.findById(subcategoryId);

    if (!subCategory) {
      return res.status(404).json({ message: 'Subcategory not found.' });
    }

    // Update the image and imageKey fields
    if (image !== undefined) subCategory.image = image;
    if (imageKey !== undefined) subCategory.imageKey = imageKey;

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
    const { image, imageKey } = req.body;

    if (!image && !imageKey) {
      return res.status(400).json({ message: 'At least image or imageKey is required' });
    }

    const updateData = {};
    if (image !== undefined) updateData.image = image;
    if (imageKey !== undefined) updateData.imageKey = imageKey;

    // Update all subcategory images
    const result = await SubCategory.updateMany({}, updateData);

    res.status(200).json({
      message: `Updated images for ${result.modifiedCount} subcategories successfully`,
    });
  } catch (error) {
    console.error('Error updating subcategory images:', error);
    res.status(500).json({ message: 'Failed to update subcategory images', error: error.message });
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
