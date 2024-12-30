import Category from '../models/category.modal.js';

// Create a new category
const createCategory = async (req, res) => {
  try {
    const category = await Category.create(req.body);
    res.status(201).json(category);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Get all categories
const getCategories = async (req, res) => {
  try {
    const categories = await Category.find().sort({ createdAt: -1 });
    res.status(200).json(categories);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get a category by ID
const getCategoryById = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }
    res.status(200).json(category);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update a category by ID
const updateCategoryById = async (req, res) => {
  try {
    const category = await Category.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }
    res.status(200).json(category);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Delete a category by ID
const deleteCategoryById = async (req, res) => {
  try {
    const category = await Category.findByIdAndDelete(req.params.id);
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }
    res.status(200).json({ message: 'Category deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateCategoryImage = async (req, res) => {
  const { categoryId, imageString } = req.body;

  // Validate input
  if (!categoryId || !imageString) {
    return res.status(400).json({ message: 'Category ID and image string are required.' });
  }

  try {
    // Find the category by ID
    const category = await Category.findById(categoryId);
    if (!category) {
      return res.status(404).json({ message: 'Category not found.' });
    }

    // Update the image field with the base64 string
    category.image = imageString;

    // Save the updated category
    await category.save();

    res.status(200).json({ message: 'Category image updated successfully.', category });
  } catch (error) {
    console.error('Error updating category image:', error);
    res.status(500).json({ message: 'An error occurred while updating the category image.' });
  }
};

const updateAllCategoryImages = async (req, res) => {
  try {
    const { base64Image } = req.body;

    if (!base64Image) {
      return res.status(400).json({ message: 'Base64 image string is required' });
    }

    // Update all category images
    const result = await Category.updateMany({}, { image: base64Image });

    res.status(200).json({
      message: `Updated images for ${result.modifiedCount} categories successfully`,
    });
  } catch (error) {
    console.error('Error updating category images:', error);
    res.status(500).json({ message: 'Failed to update category images', error: error.message });
  }
};

export {
  createCategory,
  getCategories,
  getCategoryById,
  updateCategoryById,
  deleteCategoryById,
  updateCategoryImage,
  updateAllCategoryImages
};
