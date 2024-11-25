import httpStatus from 'http-status';
import catchAsync from '../utils/catchAsync.js';
import * as b2cUserService from '../services/b2cUser.service.js';
import B2CAddress from '../models/b2cuserAddress.modal.js';
import B2CKYC from '../models/b2cUserKyc.modal.js';

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

export { createUser, getUsers, getUser, updateUser, deleteUser, addB2CAddress, deleteB2CAddress, updateB2CAddress, getB2CAllAddressesByUserId, addB2CKycDetails, deleteB2CKycDetails, updateB2CKycDetails, getB2CKycDetailsByUserId };
