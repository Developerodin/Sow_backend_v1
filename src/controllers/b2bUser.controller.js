import httpStatus from 'http-status';
import pick from '../utils/pick.js';
import ApiError from '../utils/ApiError.js';
import catchAsync from '../utils/catchAsync.js';
import * as b2bUserService from '../services/b2bUser.service.js';
import B2BAddress from '../models/b2buserAddress.model.js';
import B2BKYC from '../models/b2buserKyc.model.js';
import B2BUser from '../models/b2bUser.modal.js';

/**
 * Create a new B2B user
 */
const createB2BUser = catchAsync(async (req, res) => {
  const user = await b2bUserService.createB2BUser(req.body);
  res.status(httpStatus.CREATED).send(user);
});

/**
 * Get all B2B users with filtering and pagination
 */
const getB2BUsers = catchAsync(async (req, res) => {
  const filter = pick(req.query, ['name', 'phoneNumber', 'email', 'role']);
  const options = pick(req.query, ['sortBy', 'limit', 'page']);
  const result = await b2bUserService.queryB2BUsers(filter, options);
  res.send(result);
});

/**
 * Get a single B2B user by ID
 */
const getB2BUser = catchAsync(async (req, res) => {
  const user = await b2bUserService.getB2BUserById(req.params.userId);
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'B2B User not found');
  }
  res.send(user);
});

/**
 * Update a B2B user by ID
 */
const updateB2BUser = catchAsync(async (req, res) => {
  const user = await b2bUserService.updateB2BUserById(req.params.userId, req.body);
  res.send(user);
});

/**
 * Delete a B2B user by ID
 */
const deleteB2BUser = catchAsync(async (req, res) => {
  await b2bUserService.deleteB2BUserById(req.params.userId);
  res.status(httpStatus.NO_CONTENT).send();
});

// Address

const addB2BAddress = async (req, res) => {
  try {
    const { userId, latitude, longitude, googleAddress, buildingName, roadArea, note, addressType } = req.body;
     console.log(userId, latitude, longitude, googleAddress, buildingName)
    const address = new B2BAddress({
      userId,
      latitude,
      longitude,
      googleAddress,
      buildingName,
      roadArea,
      note,
      addressType,
    });

    await address.save();
    res.status(201).json({ success: true, message: 'Address added successfully', data: address });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

 const deleteB2BAddress = async (req, res) => {
  try {
    const { id } = req.params;

    const address = await B2BAddress.findByIdAndDelete(id);

    if (!address) {
      return res.status(404).json({ success: false, message: 'Address not found' });
    }

    res.status(200).json({ success: true, message: 'Address deleted successfully' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

 const updateB2BAddress = async (req, res) => {
  try {
    const { id } = req.params;

    const updatedAddress = await B2BAddress.findByIdAndUpdate(id, req.body, { new: true });

    if (!updatedAddress) {
      return res.status(404).json({ success: false, message: 'Address not found' });
    }

    res.status(200).json({ success: true, message: 'Address updated successfully', data: updatedAddress });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};


const getB2BAllAddressesByUserId = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({ success: false, message: '"userId" is required' });
    }

    const addresses = await B2BAddress.find({ userId });

    if (addresses.length === 0) {
      return res.status(404).json({ success: false, message: 'No addresses found for this user' });
    }

    res.status(200).json({ success: true, data: addresses });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};


// KYC

const addB2BKycDetails = async (req, res) => {
  try {
    const { userId, panNumber, gstinNumber, panImage, gstinImage } = req.body;

    const kyc = new B2BKYC({
      userId,
      panNumber,
      gstinNumber,
      panImage,
      gstinImage,
    });

    await kyc.save();
    res.status(201).json({ success: true, message: 'KYC details added successfully', data: kyc });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

 const deleteB2BKycDetails = async (req, res) => {
  try {
    const { id } = req.params;

    const kyc = await B2BKYC.findByIdAndDelete(id);

    if (!kyc) {
      return res.status(404).json({ success: false, message: 'KYC details not found' });
    }

    res.status(200).json({ success: true, message: 'KYC details deleted successfully' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

 const updateB2BKycDetails = async (req, res) => {
  try {
    const { id } = req.params;

    const updatedKyc = await B2BKYC.findByIdAndUpdate(id, req.body, { new: true });

    if (!updatedKyc) {
      return res.status(404).json({ success: false, message: 'KYC details not found' });
    }

    res.status(200).json({ success: true, message: 'KYC details updated successfully', data: updatedKyc });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

 const getB2BKycDetailsByUserId = async (req, res) => {
  try {
    const { userId } = req.params;

    const kycDetails = await B2BKYC.findOne({ userId });

    if (!kycDetails) {
      return res.status(404).json({ success: false, message: 'KYC details not found for this user' });
    }

    res.status(200).json({ success: true, data: kycDetails });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// category 

const createCategory = async (req, res) => {
  try {
    const { userId } = req.params;
    const { name } = req.body;

    const user = await B2BUser.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.category.push({ name });
    await user.save();

    res.status(201).json(user.category);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get all categories for a B2B user
const getAllCategories = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await B2BUser.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json(user.category);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get a category by ID for a B2B user
const getCategoryById = async (req, res) => {
  try {
    const { userId, categoryId } = req.params;

    const user = await B2BUser.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const category = user.category.id(categoryId);
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

    res.status(200).json(category);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


const updateCategory = async (req, res) => {
  try {
    const { userId, categoryId } = req.params;
    const { name } = req.body;

    const user = await B2BUser.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const category = user.category.id(categoryId);
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

    category.name = name;
    category.updatedAt = Date.now();

    await user.save();
    res.status(200).json(category);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


const deleteCategory = async (req, res) => {
  try {
    const { userId, categoryId } = req.params;

    const user = await B2BUser.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const category = user.category.id(categoryId);
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

    category.remove();
    await user.save();
    res.status(204).json({ message: 'Category deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


const addSubCategory = async (req, res) => {
  try {
    const { userId, categoryId } = req.params;
    const { name, price, unit } = req.body;

    const user = await B2BUser.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const category = user.category.id(categoryId);
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

    category.sub_category.push({ name, price, unit });
    await user.save();

    res.status(201).json(category.sub_category);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


const updateSubCategory = async (req, res) => {
  try {
    const { userId, categoryId, subCategoryId } = req.params;
    const { name, price, unit } = req.body;

    const user = await B2BUser.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const category = user.category.id(categoryId);
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

    const subCategory = category.sub_category.id(subCategoryId);
    if (!subCategory) {
      return res.status(404).json({ message: 'Subcategory not found' });
    }

   
    subCategory.history.push({
      price: subCategory.price,
      unit: subCategory.unit,
      status: 'inactive',
      updatedAt: subCategory.updatedAt,
    });

    
    subCategory.name = name;
    subCategory.price = price;
    subCategory.unit = unit;
    subCategory.status = 'active';
    subCategory.updatedAt = Date.now();

    await user.save();
    res.status(200).json(subCategory);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete a subcategory by ID for a B2B user
const deleteSubCategory = async (req, res) => {
  try {
    const { userId, categoryId, subCategoryId } = req.params;

    const user = await B2BUser.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const category = user.category.id(categoryId);
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

    const subCategory = category.sub_category.id(subCategoryId);
    if (!subCategory) {
      return res.status(404).json({ message: 'Subcategory not found' });
    }

    subCategory.remove();
    await user.save();
    res.status(204).json({ message: 'Subcategory deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


export {
  createB2BUser,
  getB2BUsers,
  getB2BUser,
  updateB2BUser,
  deleteB2BUser,
  updateB2BAddress,
  deleteB2BAddress,
  addB2BAddress,
  deleteB2BKycDetails,
  addB2BKycDetails,
  getB2BAllAddressesByUserId,
  getB2BKycDetailsByUserId,
  updateB2BKycDetails,
  createCategory,
  getAllCategories,
  getCategoryById,
  updateCategory,
  deleteCategory,
  addSubCategory,
  updateSubCategory,
  deleteSubCategory,
};
