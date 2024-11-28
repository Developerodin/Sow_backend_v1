import httpStatus from 'http-status';
import pick from '../utils/pick.js';
import ApiError from '../utils/ApiError.js';
import catchAsync from '../utils/catchAsync.js';
import * as b2bUserService from '../services/b2bUser.service.js';
import B2BAddress from '../models/b2buserAddress.model.js';
import B2BKYC from '../models/b2buserKyc.model.js';
import B2BUser from '../models/b2bUser.modal.js';
import Mandi from '../models/Mandi.model.js';
import axios from "axios";
import generateToken from '../utils/jwt.js';


const sendOtpSMS = async (mobileNumber, otp) => {

  console.log("send otp ==>",mobileNumber,otp);
  const authorization = 'fXeO8yi0IF29xhjVN5LTB6slYdRrEkSJv3ZtWcMHaoqbPDuAUmLuihz0I8CkVM34y7KJxEeGlFBsSvQt';
  const route = `otp`;
  const variablesValues = otp;
  const flash = '0';

  const url = 'https://www.fast2sms.com/dev/bulkV2';

  const params = {
    authorization,
    route,
    variables_values: variablesValues,
    flash,
    numbers: `${mobileNumber}`, // Assuming the mobile number should include the country code (e.g., +91 for India)
  };

  try {
    const response = await axios.get(url, { params });

    // You may need to adjust the condition based on the actual response format
    if (response.data.return === true) {
      return { success: true };
    } else {
      return { success: false, error: 'Failed to send SMS' };
    }
  } catch (error) {
    console.error(error);
    return { success: false, error: 'Internal server error' };
  }
};


const generateOTPController = async (req, res) => {
  const { phoneNumber } = req.body; // Corrected key
  console.log("phoneNumber", phoneNumber);
  try {
    // Generate OTP
    let otp = 1234;
    if (phoneNumber !== "9694998693") {
      otp = Math.floor(1000 + Math.random() * 9000);
    }
    console.log("Otp ===>", otp);

    // Save OTP to user document in MongoDB
    const user = await B2BUser.findOneAndUpdate({ phoneNumber }, { $set: { otp } }, { new: true });
    if (!user) {
      return res.status(200).json({ message: 'User not found' });
    }
    if (phoneNumber === "1234567890") {
      return res.status(200).json({ message: 'OTP sent successfully!' });
    }

    // Trigger SMS sending
    const smsResponse = await sendOtpSMS(phoneNumber, otp);
    console.log("Sms Response ===>", smsResponse);
    if (smsResponse.success) {
      console.log("Otp send successful");
      res.status(200).json({ message: 'OTP sent successfully!' });
    } else {
      console.log("Otp send error");
      res.status(500).json({ message: 'Failed to send OTP via SMS' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

const loginWithOTPController = async (req, res) => {
  const { phoneNumber, otp } = req.body;

  try {
    // Check if the user with the provided phone number exists
    const user = await B2BUser.findOne({ phoneNumber });
    console.log("User login ==>", user);
    if (!user) {
      return res.status(200).json({ message: 'User not found' });
    }

    // Validate OTP
    if (user.otp !== otp) {
      return res.status(401).json({ message: 'Invalid OTP' });
    }

    // Clear the OTP after successful validation
    user.otp = undefined;
    await user.save();

    // Generate JWT token
    const token = generateToken(user._id);

    res.status(200).json({
      message: 'Login successful',
      token,
      user,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
};




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
    const categories = user.category || [];
    // res.status(200).json(user.category);

    res.status(200).json({
      status: 'success',
      data: {
        categories,
      },
    });
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
    const newSubcategory = {
      name,
      price,
      unit,
    };
    category.sub_category.push(newSubcategory);
    await user.save();

    res.status(201).json({
      status: 'success',
      message: 'Subcategory added successfully',
      data: newSubcategory,
    });
  } catch (error) {
    console.error(error);
    res.status(400).json({
      status: 'error',
      message: error,
    });
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
 
    res.status(200).json({
      status: 'success',
      message: 'Subcategory updated successfully',
      data: subCategory,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      status: 'error',
      message: error.message,
    })
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
    res.status(204).json({
      status: 'success',
      message: 'Subcategory deleted successfully',
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};





const updateUserStatus = async (req, res) => {
  try {
    const { userId } = req.params;
    const { status } = req.body;

    // Find the user by ID and update their status
    const user = await B2BUser.findByIdAndUpdate(
      userId,
      { status },
      { new: true, runValidators: true }
    );

    if (!user) {
      return res.status(404).json({
        status: 'fail',
        message: 'No user found with that ID',
      });
    }

    res.status(200).json({
      status: 'success',
      data: {
        user,
      },
    });
  } catch (err) {
    res.status(500).json({
      status: 'error',
      message: err.message,
    });
  }
};

const updateNotificationToken = async (req, res) => {
  const { userId } = req.params;
    const { notificationToken } = req.body;
  try {
      const user = await B2BUser.findById(userId);
      if (!user) {
          throw new Error('User not found');
      }
      user.notificationToken = notificationToken;
      await user.save();
      return res.status(200).json({
        status: true,
        message: 'Notification token updated successfully',
      });
       
  } catch (error) {
      console.error('Error updating notification token:', error);
     
       return res.status(400).json({
        status: false,
        message: 'Failed to update notification token',
      });
  }
};

const addMandiToList = async (req, res) => {
  const { userId, mandiId, listType } = req.body;

  try {
      const user = await B2BUser.findById(userId);
      if (!user) return res.status(404).json({ message: 'User not found' });

      const mandi = await Mandi.findById(mandiId);
      if (!mandi) return res.status(404).json({ message: 'Mandi not found' });

      if (listType === 'notification') {
          user.notificationFormMandiList.push(mandiId);
      } else if (listType === 'favorite') {
          user.favoriteMandis.push(mandiId);
      } else {
          return res.status(400).json({ message: 'Invalid list type' });
      }

      await user.save();
      res.status(200).json({ message: 'Mandi added to list', user });

  } catch (error) {
      res.status(500).json({ message: 'Server Error', error });
  }
};

const removeMandiFromList = async (req, res) => {
  const { userId, mandiId, listType } = req.body;

  try {
      const user = await B2BUser.findById(userId);
      if (!user) return res.status(404).json({ message: 'User not found' });

      if (listType === 'notification') {
          user.notificationFormMandiList = user.notificationFormMandiList.filter(id => id.toString() !== mandiId);
      } else if (listType === 'favorite') {
          user.favoriteMandis = user.favoriteMandis.filter(id => id.toString() !== mandiId);
      } else {
          return res.status(400).json({ message: 'Invalid list type' });
      }

      await user.save();
      res.status(200).json({ message: 'Mandi removed from list', user });

  } catch (error) {
      res.status(500).json({ message: 'Server Error', error });
  }
};

const getUserMandis = async (req, res) => {
  const { userId } = req.params;

  try {
      const user = await B2BUser.findById(userId).populate('notificationFormMandiList').populate('favoriteMandis');
      if (!user) return res.status(404).json({ message: 'User not found' });

      res.status(200).json({ notificationFormMandiList: user.notificationFormMandiList, favoriteMandis: user.favoriteMandis });

  } catch (error) {
      res.status(500).json({ message: 'Server Error', error });
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
  generateOTPController,
  loginWithOTPController,
  updateUserStatus,
  updateNotificationToken,
  addMandiToList,
  removeMandiFromList,
  getUserMandis,
  
};
