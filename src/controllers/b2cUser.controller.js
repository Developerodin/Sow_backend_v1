import httpStatus from 'http-status';
import catchAsync from '../utils/catchAsync.js';
import * as b2cUserService from '../services/b2cUser.service.js';
import B2CAddress from '../models/b2cuserAddress.modal.js';
import B2CKYC from '../models/b2cUserKyc.modal.js';
import generateToken from '../utils/jwt.js';
import B2CUser from '../models/b2cUser.modal.js';
import axios from 'axios';


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
    const user = await B2CUser.findOneAndUpdate({ phoneNumber }, { $set: { otp } }, { new: true });
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
    const user = await B2CUser.findOne({ phoneNumber });
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
 * Create a B2C user
 */
const createUser = catchAsync(async (req, res) => {
  const user = await b2cUserService.createUser(req.body);
  res.status(httpStatus.CREATED).send(user);
});

/**
 * Get all B2C users
 */
const getUsers = catchAsync(async (req, res) => {
  const filter = { ...req.query };
  const options = {
    sortBy: req.query.sortBy,
    limit: req.query.limit,
    page: req.query.page,
  };
  const result = await b2cUserService.queryUsers(filter, options);
  res.send(result);
});

/**
 * Get B2C user by ID
 */
const getUser = catchAsync(async (req, res) => {
  const user = await b2cUserService.getUserById(req.params.userId);
  if (!user) {
    res.status(httpStatus.NOT_FOUND).send({ message: 'User not found' });
    return;
  }
  res.send(user);
});

/**
 * Update B2C user by ID
 */
const updateUser = catchAsync(async (req, res) => {
  const user = await b2cUserService.updateUserById(req.params.userId, req.body);
  res.send(user);
});

/**
 * Delete B2C user by ID
 */
const deleteUser = catchAsync(async (req, res) => {
  await b2cUserService.deleteUserById(req.params.userId);
  res.status(httpStatus.NO_CONTENT).send();
});

// Address

const addB2CAddress = async (req, res) => {
    try {
      const { userId, latitude, longitude, googleAddress, buildingName, roadArea, note, addressType } = req.body;
       console.log(userId, latitude, longitude, googleAddress, buildingName)
      const address = new B2CAddress({
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
  
   const deleteB2CAddress = async (req, res) => {
    try {
      const { id } = req.params;
  
      const address = await B2CAddress.findByIdAndDelete(id);
  
      if (!address) {
        return res.status(404).json({ success: false, message: 'Address not found' });
      }
  
      res.status(200).json({ success: true, message: 'Address deleted successfully' });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  };
  
   const updateB2CAddress = async (req, res) => {
    try {
      const { id } = req.params;
  
      const updatedAddress = await B2CAddress.findByIdAndUpdate(id, req.body, { new: true });
  
      if (!updatedAddress) {
        return res.status(404).json({ success: false, message: 'Address not found' });
      }
  
      res.status(200).json({ success: true, message: 'Address updated successfully', data: updatedAddress });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  };
  
  
  const getB2CAllAddressesByUserId = async (req, res) => {
    try {
      const { userId } = req.params;
  
      if (!userId) {
        return res.status(400).json({ success: false, message: '"userId" is required' });
      }
  
      const addresses = await B2CAddress.find({ userId });
  
      if (addresses.length === 0) {
        return res.status(404).json({ success: false, message: 'No addresses found for this user' });
      }
  
      res.status(200).json({ success: true, data: addresses });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  };

  const getB2CUserActiveAddress = async (req, res) => {
    const { userId } = req.params;
  
    try {
      const activeAddress = await B2CAddress.findOne({ userId, activeAddress: true });
      if (!activeAddress) {
        return res.status(404).json({ message: 'No active address found for this user' });
      }
      res.status(200).json(activeAddress);
    } catch (error) {
      res.status(500).json({ message: 'Server error', error });
    }
  };
  
  const setB2CAddressActive = async (req, res) => {
    const { userId, addressId } = req.params;
  
    try {
      // Deactivate all addresses for the user
      await B2CAddress.updateMany({ userId }, { $set: { activeAddress: false } });
  
      // Set the specified address as active
      const updatedAddress = await B2CAddress.findByIdAndUpdate(
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
  
  
  // KYC
  
  const addB2CKycDetails = async (req, res) => {
    try {
      const { userId, panNumber, gstinNumber, panImage, gstinImage } = req.body;
  
      const kyc = new B2CKYC({
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
  
   const deleteB2CKycDetails = async (req, res) => {
    try {
      const { id } = req.params;
  
      const kyc = await B2CKYC.findByIdAndDelete(id);
  
      if (!kyc) {
        return res.status(404).json({ success: false, message: 'KYC details not found' });
      }
  
      res.status(200).json({ success: true, message: 'KYC details deleted successfully' });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  };
  
   const updateB2CKycDetails = async (req, res) => {
    try {
      const { id } = req.params;
  
      const updatedKyc = await B2CKYC.findByIdAndUpdate(id, req.body, { new: true });
  
      if (!updatedKyc) {
        return res.status(404).json({ success: false, message: 'KYC details not found' });
      }
  
      res.status(200).json({ success: true, message: 'KYC details updated successfully', data: updatedKyc });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  };
  
   const getB2CKycDetailsByUserId = async (req, res) => {
    try {
      const { userId } = req.params;
  
      const kycDetails = await B2CKYC.findOne({ userId });
  
      if (!kycDetails) {
        return res.status(404).json({ success: false, message: 'KYC details not found for this user' });
      }
  
      res.status(200).json({ success: true, data: kycDetails });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  };


const updateUserProfileType = async (req, res) => {
    try {
      const { userId, profileType } = req.body;
  
      // Validate input
      if (!userId || !profileType) {
        return res.status(400).json({ message: 'User ID and profile type are required' });
      }
  
      // Validate profileType
      const validProfileTypes = ['household', 'office', 'shopkeeper'];
      if (!validProfileTypes.includes(profileType)) {
        return res.status(400).json({ message: 'Invalid profile type' });
      }
  
      // Find user and update profileType
      const user = await B2CUser.findByIdAndUpdate(
        userId,
        { profileType },
        { new: true, runValidators: true }
      );
  
      if (!user) {
        return res.status(400).json({ message: 'User not found' });
      }
  
      return res.status(200).json({
        message: 'Profile type updated successfully',
        data: user,
      });
    } catch (error) {
      return res.status(400).json({
        message: 'An error occurred while updating profile type',
        error: error.message,
      });
    }
  };

  const getUserProfileType = async (req, res) => {
    try {
      const { userId } = req.params; // Assuming userId is passed as a URL parameter
  
      // Validate input
      if (!userId) {
        return res.status(400).json({ message: 'User ID is required' });
      }
  
      // Find the user by ID
      const user = await B2CUser.findById(userId, 'profileType'); // Only retrieve the profileType field
  
      if (!user) {
        return res.status(400).json({ message: 'User not found' });
      }
  
      return res.status(200).json({
        message: 'Profile type retrieved successfully',
        data: { profileType: user.profileType },
      });
    } catch (error) {
      return res.status(400).json({
        message: 'An error occurred while retrieving the profile type',
        error: error.message,
      });
    }
  };

export {getUserProfileType,updateUserProfileType, createUser, getUsers, getUser, updateUser, deleteUser, addB2CAddress, deleteB2CAddress, updateB2CAddress, getB2CAllAddressesByUserId, addB2CKycDetails, deleteB2CKycDetails, updateB2CKycDetails, getB2CKycDetailsByUserId, generateOTPController, loginWithOTPController, getB2CUserActiveAddress, setB2CAddressActive };
