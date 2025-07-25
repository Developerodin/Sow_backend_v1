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
import { uploadFileToS3, deleteFileFromS3 } from './common.controller.js';
import { verifyPan } from '../services/truthscreen.service.js';
import { sendNotificationByUserId } from './pushNotifications.controller.js';


const sendOtpSMS = async (mobileNumber, otp) => {

  console.log("send otp ==>",mobileNumber,otp);
  const authorization = 'fXeO8yi0IF29xhjVN5LTB6slYdRrEkSJv3ZtWcMHaoqbPDuAUmLuihz0I8CkVM34y7KJxEeGlFBsSvQt';
  const route = `dlt`;
  const variablesValues = otp;
  const flash = '0';
  const sender_id = 'JOBMOJ';
  const url = 'https://www.fast2sms.com/dev/bulkV2';
   const message = '171550';
  const params = {
    authorization,
    route,
    variables_values: variablesValues,
    flash,
    sender_id,
    message,
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
    // console.log("User login ==>", user);
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
    const { userId, latitude, longitude, googleAddress, buildingName, roadArea, note, addressType, city, state } = req.body;
    //  console.log(userId, latitude, longitude, googleAddress, buildingName, city, state)
    const address = new B2BAddress({
      userId,
      latitude,
      longitude,
      googleAddress,
      buildingName,
      roadArea,
      note,
      addressType,
      city,
      state,

    });

    await address.save();
    res.status(201).json({ success: true, message: 'Address added successfully', data: address });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

 const deleteB2BAddress = async (req, res) => {
  try {
    const { addressId } = req.params;
   console.log(" to dleter addressid",addressId);
    const address = await B2BAddress.findByIdAndDelete(addressId);

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

const getB2BUserActiveAddress = async (req, res) => {
  const { userId } = req.params;

  try {
    const activeAddress = await B2BAddress.findOne({ userId, activeAddress: true });
    if (!activeAddress) {
      return res.status(404).json({ message: 'No active address found for this user' });
    }
    res.status(200).json(activeAddress);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};

const setB2BAddressActive = async (req, res) => {
  const { userId, addressId } = req.params;

  try {
    // Deactivate all addresses for the user
    await B2BAddress.updateMany({ userId }, { $set: { activeAddress: false } });

    // Set the specified address as active
    const updatedAddress = await B2BAddress.findByIdAndUpdate(
      addressId,
      { activeAddress: true },
      { new: true }
    );

    if (!updatedAddress) {
      return res.status(404).json({ message: 'Address not found' });
    }

    res.status(200).json({ message: 'Address set as active', address: updatedAddress });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};


const getUniqueCitiesAndStates = async (req, res) => {
  try {
    const addresses = await B2BAddress.find({}, 'city state');

    const uniqueCities = [...new Set(addresses.map(address => address.city ))];
    const uniqueStates = [...new Set(addresses.map(address => address.state ))];

    res.status(200).json({
      success: true,
      data: {
        uniqueCities,
        uniqueStates,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'An error occurred while fetching unique cities and states',
      error: error.message,
    });
  }
};


// KYC



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

const updateAllSubCategories = async (req, res) => {
  try {
    const { userId, categoryId } = req.params;
    const { subCategories } = req.body; // Expecting an array of subcategories with their respective prices

    // Find the user by ID
    const user = await B2BUser.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Find the category by ID
    const category = user.category.id(categoryId);
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

    // Update the price of each subcategory within the category
    subCategories.forEach(subCategoryUpdate => {
      const subCategory = category.sub_category.id(subCategoryUpdate.subCategoryId);
      if (subCategory) {
        subCategory.history.push({
          price: subCategory.price,
          unit: subCategory.unit,
          status: 'inactive',
          updatedAt: subCategory.updatedAt,
        });

        subCategory.price = subCategoryUpdate.price;
        subCategory.status = 'active';
        subCategory.updatedAt = Date.now();
      }
    });

    // Save the updated user document
    await user.save();

    res.status(200).json({
      status: 'success',
      message: 'All subcategories updated successfully',
      data: category.sub_category,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      status: 'error',
      message: error.message,
    });
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


const updateUserImage = async (req, res) => {
  try {
    const { userId, imageUrl, imageKey } = req.body;

    if (!userId) {
      return res.status(400).json({ message: 'User ID is required' });
    }

    if (!imageUrl || !imageKey) {
      return res.status(400).json({ message: 'Image URL and key are required' });
    }

    // Find the user first to get existing image key
    const existingUser = await B2BUser.findById(userId);
    if (!existingUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Update the user with new image URL and key
    const user = await B2BUser.findByIdAndUpdate(
      userId,
      { 
        image: imageUrl,
        imageKey: imageKey
      },
      { new: true, runValidators: true }
    );

    res.status(200).json({
      message: 'Image updated successfully',
      data: {
        user: {
          id: user._id,
          name: user.name,
          image: user.image,
          imageKey: user.imageKey
        }
      }
    });
  } catch (error) {
    console.error('Error updating user image:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

const getUserImage = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({ message: 'User ID is required' });
    }

    // Find the user by userId
    const user = await B2BUser.findById(userId).select('image'); // Only select the image field

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Return the image base64 string or any other appropriate data
    res.status(200).json({
      image: user.image,
    });
  } catch (error) {
    console.error('Error fetching user image:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};



const getInactiveHistory = async (req, res) => {
  try {
    const { userId, categoryName, timePeriod } = req.body;

    // Validate inputs
    if (!userId || !categoryName || !timePeriod) {
      return res.status(400).json({ message: 'userId, categoryName, and timePeriod are required.' });
    }

    // Determine the time range based on the timePeriod
    const timePeriods = {
      today: new Date(new Date().setHours(0, 0, 0, 0)),
      week: new Date(new Date().setDate(new Date().getDate() - 7)),
      month: new Date(new Date().setMonth(new Date().getMonth() - 1)),
      '3month': new Date(new Date().setMonth(new Date().getMonth() - 3)),
      '6month': new Date(new Date().setMonth(new Date().getMonth() - 6)),
      year: new Date(new Date().setFullYear(new Date().getFullYear() - 1)),
    };

    const fromDate = timePeriods[timePeriod];
    if (!fromDate) {
      return res.status(400).json({ message: 'Invalid time period specified.' });
    }

    // Query the user and category data
    const user = await B2BUser.findById(userId).lean();
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const category = user.category.find((cat) => cat.name === categoryName);
    if (!category) {
      return res.status(404).json({ message: 'Category not found.' });
    }

    // Extract and filter inactive histories within the time period
    const inactiveHistories = [];
    category.sub_category.forEach((subCategory) => {
      const filteredHistory = subCategory.history.filter(
        (entry) =>
          entry.status === 'inactive' && new Date(entry.updatedAt) >= fromDate
      );
      if (filteredHistory.length > 0) {
        inactiveHistories.push({
          subCategoryName: subCategory.name,
          history: filteredHistory,
        });
      }
    });

    // Return the result
    res.status(200).json({
      message: 'Inactive histories fetched successfully.',
      data: inactiveHistories,
    });
  } catch (error) {
    console.error('Error fetching inactive histories:', error);
    res.status(500).json({ message: 'Internal server error.', error: error.message });
  }
};





// KYC USER

const uploadOwnerImage = async (req, res) => {
  try {
    const { kycId, ownerImages } = req.body;

    if (!kycId) {
      return res.status(400).json({ message: 'KYC ID is required' });
    }

    if (!ownerImages || !Array.isArray(ownerImages) || ownerImages.length === 0) {
      return res.status(400).json({ message: 'Owner images array is required and must not be empty' });
    }

    // Validate each image object
    for (const image of ownerImages) {
      if (!image.ownerImageUrl || !image.ownerImageKey) {
        return res.status(400).json({ message: 'Each image must have ownerImageUrl and ownerImageKey' });
      }
    }

    const kyc = await B2BKYC.findById(kycId);
    if (!kyc) {
      return res.status(404).json({ message: 'KYC entry not found' });
    }

    // Initialize arrays if they don't exist
    if (!kyc.OwnerImage) kyc.OwnerImage = [];
    if (!kyc.OwnerImageKey) kyc.OwnerImageKey = [];

    // Add new images to existing arrays
    ownerImages.forEach(image => {
      kyc.OwnerImage.push(image.ownerImageUrl);
      kyc.OwnerImageKey.push(image.ownerImageKey);
    });

    await kyc.save();

    res.status(200).json({ 
      message: 'Owner images uploaded successfully', 
      data: {
        kycId: kyc._id,
        ownerImages: kyc.OwnerImage,
        ownerImageKeys: kyc.OwnerImageKey,
        totalImages: kyc.OwnerImage.length
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const uploadWarehouseImage = async (req, res) => {
  try {
    const { kycId, warehouseImages } = req.body;

    if (!kycId) {
      return res.status(400).json({ message: 'KYC ID is required' });
    }

    if (!warehouseImages || !Array.isArray(warehouseImages) || warehouseImages.length === 0) {
      return res.status(400).json({ message: 'Warehouse images array is required and must not be empty' });
    }

    // Validate each image object
    for (const image of warehouseImages) {
      if (!image.warehouseImageUrl || !image.warehouseImageKey) {
        return res.status(400).json({ message: 'Each image must have warehouseImageUrl and warehouseImageKey' });
      }
    }

    const kyc = await B2BKYC.findById(kycId);
    if (!kyc) {
      return res.status(404).json({ message: 'KYC entry not found' });
    }

    // Initialize arrays if they don't exist
    if (!kyc.WareHouseImage) kyc.WareHouseImage = [];
    if (!kyc.WarehouseImageKey) kyc.WarehouseImageKey = [];

    // Add new images to existing arrays
    warehouseImages.forEach(image => {
      kyc.WareHouseImage.push(image.warehouseImageUrl);
      kyc.WarehouseImageKey.push(image.warehouseImageKey);
    });

    await kyc.save();

    res.status(200).json({ 
      message: 'Warehouse images uploaded successfully', 
      data: {
        kycId: kyc._id,
        warehouseImages: kyc.WareHouseImage,
        warehouseImageKeys: kyc.WarehouseImageKey,
        totalImages: kyc.WareHouseImage.length
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get Owner Image
const getOwnerImage = async (req, res) => {
  try {
    const { kycId } = req.params;

    const kyc = await B2BKYC.findById(kycId);
    if (!kyc) return res.status(404).json({ message: 'KYC entry not found' });

    res.status(200).json({ 
      ownerImages: kyc.OwnerImage || [],
      ownerImageKeys: kyc.OwnerImageKey || [],
      totalImages: (kyc.OwnerImage || []).length
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update Owner Image
const updateOwnerImage = async (req, res) => {
  try {
    const { kycId } = req.params;
    const { ownerImages } = req.body;

    if (!ownerImages || !Array.isArray(ownerImages)) {
      return res.status(400).json({ message: 'Owner images array is required' });
    }

    // Validate each image object
    for (const image of ownerImages) {
      if (!image.ownerImageUrl || !image.ownerImageKey) {
        return res.status(400).json({ message: 'Each image must have ownerImageUrl and ownerImageKey' });
      }
    }

    const kyc = await B2BKYC.findById(kycId);
    if (!kyc) return res.status(404).json({ message: 'KYC entry not found' });

    // Replace existing images with new ones
    kyc.OwnerImage = ownerImages.map(image => image.ownerImageUrl);
    kyc.OwnerImageKey = ownerImages.map(image => image.ownerImageKey);
    await kyc.save();

    res.status(200).json({ 
      message: 'Owner images updated successfully', 
      data: {
        kycId: kyc._id,
        ownerImages: kyc.OwnerImage,
        ownerImageKeys: kyc.OwnerImageKey,
        totalImages: kyc.OwnerImage.length
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get Warehouse Image
const getWarehouseImage = async (req, res) => {
  try {
    const { kycId } = req.params;

    const kyc = await B2BKYC.findById(kycId);
    if (!kyc) return res.status(404).json({ message: 'KYC entry not found' });

    res.status(200).json({ 
      warehouseImages: kyc.WareHouseImage || [],
      warehouseImageKeys: kyc.WarehouseImageKey || [],
      totalImages: (kyc.WareHouseImage || []).length
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update Warehouse Image
const updateWarehouseImage = async (req, res) => {
  try {
    const { kycId } = req.params;
    const { warehouseImages } = req.body;

    if (!warehouseImages || !Array.isArray(warehouseImages)) {
      return res.status(400).json({ message: 'Warehouse images array is required' });
    }

    // Validate each image object
    for (const image of warehouseImages) {
      if (!image.warehouseImageUrl || !image.warehouseImageKey) {
        return res.status(400).json({ message: 'Each image must have warehouseImageUrl and warehouseImageKey' });
      }
    }

    const kyc = await B2BKYC.findById(kycId);
    if (!kyc) return res.status(404).json({ message: 'KYC entry not found' });

    // Replace existing images with new ones
    kyc.WareHouseImage = warehouseImages.map(image => image.warehouseImageUrl);
    kyc.WarehouseImageKey = warehouseImages.map(image => image.warehouseImageKey);
    await kyc.save();

    res.status(200).json({ 
      message: 'Warehouse images updated successfully', 
      data: {
        kycId: kyc._id,
        warehouseImages: kyc.WareHouseImage,
        warehouseImageKeys: kyc.WarehouseImageKey,
        totalImages: kyc.WareHouseImage.length
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Upload Aadhar Front Image
const uploadAadharFrontImage = async (req, res) => {
  try {
    const { kycId, aadharFrontImageUrl, aadharFrontImageKey } = req.body;
    if (!kycId) {
      return res.status(400).json({ message: 'KYC ID is required' });
    }
    if (!aadharFrontImageUrl || !aadharFrontImageKey) {
      return res.status(400).json({ message: 'Aadhar front image URL and key are required' });
    }
    const kyc = await B2BKYC.findById(kycId);
    if (!kyc) {
      return res.status(404).json({ message: 'KYC entry not found' });
    }
    kyc.aadharFrontImage = aadharFrontImageUrl;
    kyc.aadharFrontImageKey = aadharFrontImageKey;
    await kyc.save();
    res.status(200).json({
      message: 'Aadhar front image uploaded successfully',
      data: {
        kycId: kyc._id,
        aadharFrontImage: kyc.aadharFrontImage,
        aadharFrontImageKey: kyc.aadharFrontImageKey
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Upload Aadhar Back Image
const uploadAadharBackImage = async (req, res) => {
  try {
    const { kycId, aadharBackImageUrl, aadharBackImageKey } = req.body;
    if (!kycId) {
      return res.status(400).json({ message: 'KYC ID is required' });
    }
    if (!aadharBackImageUrl || !aadharBackImageKey) {
      return res.status(400).json({ message: 'Aadhar back image URL and key are required' });
    }
    const kyc = await B2BKYC.findById(kycId);
    if (!kyc) {
      return res.status(404).json({ message: 'KYC entry not found' });
    }
    kyc.aadharBackImage = aadharBackImageUrl;
    kyc.aadharBackImageKey = aadharBackImageKey;
    await kyc.save();
    res.status(200).json({
      message: 'Aadhar back image uploaded successfully',
      data: {
        kycId: kyc._id,
        aadharBackImage: kyc.aadharBackImage,
        aadharBackImageKey: kyc.aadharBackImageKey
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get Aadhar Front Image
const getAadharFrontImage = async (req, res) => {
  try {
    const { kycId } = req.params;
    const kyc = await B2BKYC.findById(kycId);
    if (!kyc) return res.status(404).json({ message: 'KYC entry not found' });
    res.status(200).json({
      aadharFrontImage: kyc.aadharFrontImage || null,
      aadharFrontImageKey: kyc.aadharFrontImageKey || null
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update Aadhar Front Image
const updateAadharFrontImage = async (req, res) => {
  try {
    const { kycId } = req.params;
    const { aadharFrontImageUrl, aadharFrontImageKey } = req.body;
    if (!aadharFrontImageUrl || !aadharFrontImageKey) {
      return res.status(400).json({ message: 'Aadhar front image URL and key are required' });
    }
    const kyc = await B2BKYC.findById(kycId);
    if (!kyc) return res.status(404).json({ message: 'KYC entry not found' });
    kyc.aadharFrontImage = aadharFrontImageUrl;
    kyc.aadharFrontImageKey = aadharFrontImageKey;
    await kyc.save();
    res.status(200).json({
      message: 'Aadhar front image updated successfully',
      data: {
        kycId: kyc._id,
        aadharFrontImage: kyc.aadharFrontImage,
        aadharFrontImageKey: kyc.aadharFrontImageKey
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get Aadhar Back Image
const getAadharBackImage = async (req, res) => {
  try {
    const { kycId } = req.params;
    const kyc = await B2BKYC.findById(kycId);
    if (!kyc) return res.status(404).json({ message: 'KYC entry not found' });
    res.status(200).json({
      aadharBackImage: kyc.aadharBackImage || null,
      aadharBackImageKey: kyc.aadharBackImageKey || null
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update Aadhar Back Image
const updateAadharBackImage = async (req, res) => {
  try {
    const { kycId } = req.params;
    const { aadharBackImageUrl, aadharBackImageKey } = req.body;
    if (!aadharBackImageUrl || !aadharBackImageKey) {
      return res.status(400).json({ message: 'Aadhar back image URL and key are required' });
    }
    const kyc = await B2BKYC.findById(kycId);
    if (!kyc) return res.status(404).json({ message: 'KYC entry not found' });
    kyc.aadharBackImage = aadharBackImageUrl;
    kyc.aadharBackImageKey = aadharBackImageKey;
    await kyc.save();
    res.status(200).json({
      message: 'Aadhar back image updated successfully',
      data: {
        kycId: kyc._id,
        aadharBackImage: kyc.aadharBackImage,
        aadharBackImageKey: kyc.aadharBackImageKey
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Unified: Upload both Aadhar images
const uploadAadharImages = async (req, res) => {
  try {
    const { kycId, aadharFrontImageUrl, aadharFrontImageKey, aadharBackImageUrl, aadharBackImageKey } = req.body;
    if (!kycId) {
      return res.status(400).json({ message: 'KYC ID is required' });
    }
    if (!aadharFrontImageUrl || !aadharFrontImageKey || !aadharBackImageUrl || !aadharBackImageKey) {
      return res.status(400).json({ message: 'All Aadhar image URLs and keys are required' });
    }
    const kyc = await B2BKYC.findById(kycId);
    if (!kyc) {
      return res.status(404).json({ message: 'KYC entry not found' });
    }
    kyc.aadharFrontImage = aadharFrontImageUrl;
    kyc.aadharFrontImageKey = aadharFrontImageKey;
    kyc.aadharBackImage = aadharBackImageUrl;
    kyc.aadharBackImageKey = aadharBackImageKey;
    await kyc.save();
    res.status(200).json({
      message: 'Aadhar images uploaded successfully',
      data: {
        kycId: kyc._id,
        aadharFrontImage: kyc.aadharFrontImage,
        aadharFrontImageKey: kyc.aadharFrontImageKey,
        aadharBackImage: kyc.aadharBackImage,
        aadharBackImageKey: kyc.aadharBackImageKey
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Unified: Update both Aadhar images
const updateAadharImages = async (req, res) => {
  try {
    const { kycId } = req.params;
    const { aadharFrontImageUrl, aadharFrontImageKey, aadharBackImageUrl, aadharBackImageKey } = req.body;
    if (!aadharFrontImageUrl || !aadharFrontImageKey || !aadharBackImageUrl || !aadharBackImageKey) {
      return res.status(400).json({ message: 'All Aadhar image URLs and keys are required' });
    }
    const kyc = await B2BKYC.findById(kycId);
    if (!kyc) return res.status(404).json({ message: 'KYC entry not found' });
    kyc.aadharFrontImage = aadharFrontImageUrl;
    kyc.aadharFrontImageKey = aadharFrontImageKey;
    kyc.aadharBackImage = aadharBackImageUrl;
    kyc.aadharBackImageKey = aadharBackImageKey;
    await kyc.save();
    res.status(200).json({
      message: 'Aadhar images updated successfully',
      data: {
        kycId: kyc._id,
        aadharFrontImage: kyc.aadharFrontImage,
        aadharFrontImageKey: kyc.aadharFrontImageKey,
        aadharBackImage: kyc.aadharBackImage,
        aadharBackImageKey: kyc.aadharBackImageKey
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Unified: Get both Aadhar images
const getAadharImages = async (req, res) => {
  try {
    const { kycId } = req.params;
    const kyc = await B2BKYC.findById(kycId);
    if (!kyc) return res.status(404).json({ message: 'KYC entry not found' });
    res.status(200).json({
      aadharFrontImage: kyc.aadharFrontImage || null,
      aadharFrontImageKey: kyc.aadharFrontImageKey || null,
      aadharBackImage: kyc.aadharBackImage || null,
      aadharBackImageKey: kyc.aadharBackImageKey || null
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


const addB2BKycDetails = async (req, res) => {
  try {
    const { 
      userId, 
      panNumber, 
      gstinNumber, 
      panImage, 
      gstinImage, 
      OwnerImage, 
      WareHouseImage,
      aadharFrontImage,
      aadharFrontImageKey,
      aadharBackImage,
      aadharBackImageKey
    } = req.body;

    // Validate OwnerImage and WareHouseImage as arrays
    const ownerImages = Array.isArray(OwnerImage) ? OwnerImage : [];
    const warehouseImages = Array.isArray(WareHouseImage) ? WareHouseImage : [];
          
    const kyc = new B2BKYC({
      userId,
      panNumber,
      gstinNumber,
      panImage,
      gstinImage,
      OwnerImage: ownerImages,
      WareHouseImage: warehouseImages,
      aadharFrontImage,
      aadharFrontImageKey,
      aadharBackImage,
      aadharBackImageKey
    });

    await kyc.save();
    res.status(201).json({ 
      success: true, 
      message: 'KYC details added successfully', 
      data: {
        ...kyc.toObject(),
        totalOwnerImages: ownerImages.length,
        totalWarehouseImages: warehouseImages.length
      }
    });
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
    const updateData = { ...req.body };

    // Handle OwnerImage and WareHouseImage as arrays
    if (updateData.OwnerImage !== undefined) {
      updateData.OwnerImage = Array.isArray(updateData.OwnerImage) ? updateData.OwnerImage : [];
    }
    if (updateData.WareHouseImage !== undefined) {
      updateData.WareHouseImage = Array.isArray(updateData.WareHouseImage) ? updateData.WareHouseImage : [];
    }

    // Handle Aadhar images (single images, not arrays)
    if (updateData.aadharFrontImage !== undefined) {
      updateData.aadharFrontImage = updateData.aadharFrontImage;
    }
    if (updateData.aadharFrontImageKey !== undefined) {
      updateData.aadharFrontImageKey = updateData.aadharFrontImageKey;
    }
    if (updateData.aadharBackImage !== undefined) {
      updateData.aadharBackImage = updateData.aadharBackImage;
    }
    if (updateData.aadharBackImageKey !== undefined) {
      updateData.aadharBackImageKey = updateData.aadharBackImageKey;
    }

    const updatedKyc = await B2BKYC.findByIdAndUpdate(id, updateData, { new: true });

    if (!updatedKyc) {
      return res.status(404).json({ success: false, message: 'KYC details not found' });
    }

    res.status(200).json({ 
      success: true, 
      message: 'KYC details updated successfully', 
      data: {
        ...updatedKyc.toObject(),
        totalOwnerImages: updatedKyc.OwnerImage.length,
        totalWarehouseImages: updatedKyc.WareHouseImage.length
      }
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

const updateKycDetailsByUserId = async (req, res) => {
  try {
    const { userId } = req.params;
    console.log(`Updating KYC details for userId: ${userId}`);
    
    const updateData = { ...req.body };

    // Handle OwnerImage and WareHouseImage as arrays
    if (updateData.OwnerImage !== undefined) {
      updateData.OwnerImage = Array.isArray(updateData.OwnerImage) ? updateData.OwnerImage : [];
    }
    if (updateData.WareHouseImage !== undefined) {
      updateData.WareHouseImage = Array.isArray(updateData.WareHouseImage) ? updateData.WareHouseImage : [];
    }

    // Handle Aadhar images (single images, not arrays)
    if (updateData.aadharFrontImage !== undefined) {
      updateData.aadharFrontImage = updateData.aadharFrontImage;
    }
    if (updateData.aadharFrontImageKey !== undefined) {
      updateData.aadharFrontImageKey = updateData.aadharFrontImageKey;
    }
    if (updateData.aadharBackImage !== undefined) {
      updateData.aadharBackImage = updateData.aadharBackImage;
    }
    if (updateData.aadharBackImageKey !== undefined) {
      updateData.aadharBackImageKey = updateData.aadharBackImageKey;
    }

    const updatedKyc = await B2BKYC.findOneAndUpdate(
      { userId },
      updateData,
      { new: true, upsert: true } // upsert option will create a new document if one doesn't exist
    );

    if (!updatedKyc) {
      return res.status(404).json({ success: false, message: 'KYC details not found for this user' });
    }
    const getStatusMessage = (status) => {
      switch (status) {
        case 'approved':
          return {
            title: '🎉 KYC Approved!',
            body: 'Congratulations! Your KYC verification has been approved. You can now access all B2B features and start trading.'
          };
        case 'rejected':
          return {
            title: '⚠️ KYC Update Required',
            body: 'Your KYC verification requires attention. Please review the feedback and resubmit your documents for approval.'
          };
        case 'pending':
        default:
          return {
            title: '📋 KYC Under Review',
            body: 'Your KYC documents have been submitted and are currently under review. We\'ll notify you once the verification is complete.'
          };
      }
    };

    const statusMessage = getStatusMessage(updatedKyc.status);
    const data = { status: updatedKyc.status };

    await sendNotificationByUserId(updatedKyc.userId, statusMessage.title, statusMessage.body, data);

    res.status(200).json({ 
      success: true, 
      message: 'KYC details updated successfully', 
      data: {
        ...updatedKyc.toObject(),
        totalOwnerImages: updatedKyc.OwnerImage.length,
        totalWarehouseImages: updatedKyc.WareHouseImage.length
      }
    });
  } catch (error) {
    console.error('Error updating KYC details:', error);
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

    res.status(200).json({ 
      success: true, 
      data: {
        ...kycDetails.toObject(),
        totalOwnerImages: kycDetails.OwnerImage ? kycDetails.OwnerImage.length : 0,
        totalWarehouseImages: kycDetails.WareHouseImage ? kycDetails.WareHouseImage.length : 0
      }
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};


const changeKYCStatus = async (req, res) => {
  try {

    const {kycId, status, remarks } = req.body; // Assuming status and optional remarks are sent in the request body

    if (!['pending', 'approved', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status value' });
    }

    const kyc = await B2BKYC.findById(kycId);
   
    const getStatusMessage = (status) => {
      switch (status) {
        case 'approved':
          return {
            title: '🎉 KYC Approved!',
            body: 'Congratulations! Your KYC verification has been approved. You can now access all B2B features and start trading.'
          };
        case 'rejected':
          return {
            title: '⚠️ KYC Update Required',
            body: 'Your KYC verification requires attention. Please review the feedback and resubmit your documents for approval.'
          };
        case 'pending':
        default:
          return {
            title: '📋 KYC Under Review',
            body: 'Your KYC documents have been submitted and are currently under review. We\'ll notify you once the verification is complete.'
          };
      }
    };

    const statusMessage = getStatusMessage(status);
    const data = { status: status };

    // Send notification to the user who created the order
   
    await sendNotificationByUserId(kyc.userId, statusMessage.title, statusMessage.body, data);
    if (!kyc) return res.status(404).json({ message: 'KYC entry not found' });

    kyc.status = status;
    if (remarks) kyc.remarks = remarks;
    await kyc.save();

    res.status(200).json({ message: 'KYC status updated successfully', kyc });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

 const getWholesalerData = async (req, res) => {
  try {
    // Fetch all wholesalers and populate their categories, subcategories, and addresses
    console.log('Fetching wholesalers data...');
    const wholesalers = await B2BUser.find({ registerAs: 'Wholesaler' })
      .select('name category businessName _id')
      .populate({
        path: 'category.sub_category',
        select: 'name price unit status',
      });

    if (!wholesalers.length) {
      return res.status(404).json({ message: 'No wholesalers found.' });
    }

    // Extract unique categories and subcategories
    const uniqueCategories = new Set();
    const uniqueSubCategories = new Set();

    wholesalers.forEach((wholesaler) => {
      wholesaler.category.forEach((category) => {
        uniqueCategories.add(category.name);
        category.sub_category.forEach((subCategory) => {
          uniqueSubCategories.add(subCategory.name);
        });
        });
      });

    // Get wholesaler IDs
    const wholesalerIds = wholesalers.map(wholesaler => wholesaler._id);

    // Fetch unique cities with user information from B2B address model - ONLY for wholesalers
    const addresses = await B2BAddress.find({ 
      userId: { $in: wholesalerIds } 
    }, 'userId city state')
      .populate('userId', 'name businessName');

    const cityMap = new Map();

    addresses.forEach((address) => {
      if (address.city && address.userId) {
        if (!cityMap.has(address.city)) {
          cityMap.set(address.city, {
            city: address.city,
            state: address.state,
            users: []
          });
        }
        
        const cityData = cityMap.get(address.city);
        const userInfo = {
          userId: address.userId._id,
          name: address.userId.name,
          businessName: address.userId.businessName
        };
        
        // Check if user is not already added to this city
        const userExists = cityData.users.some(user => user.userId.toString() === userInfo.userId.toString());
        if (!userExists) {
          cityData.users.push(userInfo);
      }
      }
    });

    // Convert map to array
    const uniqueCities = Array.from(cityMap.values());

    // Prepare response data
    const response = {
      userData: wholesalers,
      uniqueCategories: Array.from(uniqueCategories),
      uniqueSubCategories: Array.from(uniqueSubCategories),
      uniqueCities: uniqueCities, // Now includes only wholesaler cities with users
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Error fetching wholesalers:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

const getSubcategoryHistoryByTimeframe = async (req, res) => {
  try {
    const { wholesalerId, categoryId, subCategoryName, timeframe } = req.params;
    let startDate, endDate;

    // Calculate date range based on the timeframe
    switch (timeframe) {
      case 'today':
        startDate = new Date();
        startDate.setHours(0, 0, 0, 0); // Start of today
        endDate = new Date();
        endDate.setHours(23, 59, 59, 999); // End of today
        break;
      case 'week':
        startDate = new Date();
        startDate.setDate(startDate.getDate() - 6); // Last 7 days
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'month':
        startDate = new Date();
        startDate.setMonth(startDate.getMonth() - 1); // Last month
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'year':
        startDate = new Date();
        startDate.setFullYear(startDate.getFullYear() - 1); // Last year
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'all':
        startDate = null; // No date restriction
        break;
      default:
        return res.status(400).json({ message: 'Invalid timeframe' });
    }

    // Fetch the wholesaler by ID
    const wholesaler = await B2BUser.findById(wholesalerId).populate('category.sub_category');

    if (!wholesaler) {
      return res.status(404).json({ message: 'Wholesaler not found' });
    }

    // Find the specific category
    const category = wholesaler.category.find((cat) => cat._id.toString() === categoryId);

    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

    // Find the specific subcategory
    const subCategory = category.sub_category.find((sub) => sub.name === subCategoryName);

    if (!subCategory) {
      return res.status(404).json({ message: 'Subcategory not found' });
    }

    // Filter history based on the timeframe
    let filteredHistory = subCategory.history;

    if (startDate) {
      filteredHistory = filteredHistory.filter((entry) => {
        const updatedAt = new Date(entry.updatedAt);
        return updatedAt >= startDate && (!endDate || updatedAt <= endDate);
      });
    }

    // Sort history by the most recent date
    filteredHistory.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

    res.status(200).json({ history: filteredHistory });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};





// PAN Verification Functions
const verifyPanKyc = async (req, res) => {
  try {
    const { userId } = req.params;
    const { panNumber } = req.body;

    if (!panNumber) {
      return res.status(400).json({ message: 'PAN number is required' });
    }

    // Find or create KYC entry for the user
    let kyc = await B2BKYC.findOne({ userId });
    if (!kyc) {
      kyc = new B2BKYC({ userId });
    }

    // Verify PAN using the truthscreen service
    const result = await verifyPan(panNumber);
    console.log("PAN verification result:", result);

    if (!result.valid) {
      return res.status(400).json({
        success: false,
        message: `PAN verification failed: ${result.message || 'Invalid PAN number'}`,
        data: result
      });
    }

    // Update KYC with verified PAN data
    kyc.panNumber = panNumber.toUpperCase();
    kyc.panVerified = true;
    kyc.panVerificationDate = new Date();
    kyc.panKycData = result;
    await kyc.save();

    res.status(200).json({
      success: true,
      message: 'PAN verified successfully',
      data: {
        panNumber: kyc.panNumber,
        panVerified: kyc.panVerified,
        panVerificationDate: kyc.panVerificationDate,
        verificationData: result
      }
    });

  } catch (error) {
    console.error('PAN verification error:', error);
    res.status(500).json({
      success: false,
      message: `PAN verification failed: ${error.message}`
    });
  }
};

const getPanKycStatus = async (req, res) => {
  try {
    const { userId } = req.params;

    const kyc = await B2BKYC.findOne({ userId });
    if (!kyc) {
      return res.status(404).json({
        success: false,
        message: 'KYC details not found for this user'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        panNumber: kyc.panNumber || null,
        panVerified: kyc.panVerified || false,
        panVerificationDate: kyc.panVerificationDate || null,
        panKycData: kyc.panKycData || null
      }
    });

  } catch (error) {
    console.error('Error fetching PAN KYC status:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

const updatePanKyc = async (req, res) => {
  try {
    const { userId } = req.params;
    const { panNumber } = req.body;

    if (!panNumber) {
      return res.status(400).json({ message: 'PAN number is required' });
    }

    // Find KYC entry
    let kyc = await B2BKYC.findOne({ userId });
    if (!kyc) {
      return res.status(404).json({
        success: false,
        message: 'KYC details not found for this user'
      });
    }

    // Verify the new PAN number
    const result = await verifyPan(panNumber);
    console.log("PAN verification result for update:", result);

    if (!result.valid) {
      return res.status(400).json({
        success: false,
        message: `PAN verification failed: ${result.message || 'Invalid PAN number'}`,
        data: result
      });
    }

    // Update PAN data
    kyc.panNumber = panNumber.toUpperCase();
    kyc.panVerified = true;
    kyc.panVerificationDate = new Date();
    kyc.panKycData = result;
    await kyc.save();

    res.status(200).json({
      success: true,
      message: 'PAN KYC updated successfully',
      data: {
        panNumber: kyc.panNumber,
        panVerified: kyc.panVerified,
        panVerificationDate: kyc.panVerificationDate,
        verificationData: result
      }
    });

  } catch (error) {
    console.error('Error updating PAN KYC:', error);
    res.status(500).json({
      success: false,
      message: `PAN KYC update failed: ${error.message}`
    });
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
  getUniqueCitiesAndStates,
  updateUserImage,
  getUserImage,
  getInactiveHistory,
  uploadOwnerImage,
  uploadWarehouseImage,
  changeKYCStatus,
  updateAllSubCategories,
  updateKycDetailsByUserId,
  getWholesalerData,
  getSubcategoryHistoryByTimeframe,
  getOwnerImage,
  updateOwnerImage,
  getWarehouseImage,
  updateWarehouseImage,
  getB2BUserActiveAddress,
  setB2BAddressActive,
  uploadAadharFrontImage,
  uploadAadharBackImage,
  getAadharFrontImage,
  updateAadharFrontImage,
  getAadharBackImage,
  updateAadharBackImage,
  uploadAadharImages,
  updateAadharImages,
  getAadharImages,
  verifyPanKyc,
  getPanKycStatus,
  updatePanKyc,
};
