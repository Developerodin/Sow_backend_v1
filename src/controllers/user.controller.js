import httpStatus from 'http-status';
import pick from '../utils/pick.js';
import ApiError from '../utils/ApiError.js';
import catchAsync from '../utils/catchAsync.js';
import * as userService  from '../services/user.service.js';
import B2BAddress from '../models/b2buserAddress.model.js';
import B2BKYC from '../models/b2buserKyc.model.js';


const createUser = catchAsync(async (req, res) => {
  const user = await userService.createUser(req.body);
  res.status(httpStatus.CREATED).send(user);
});

const getUsers = catchAsync(async (req, res) => {
  const filter = pick(req.query, ['name', 'role']);
  const options = pick(req.query, ['sortBy', 'limit', 'page']);
  const result = await userService.queryUsers(filter, options);
  res.send(result);
});

const getUser = catchAsync(async (req, res) => {
  const user = await userService.getUserById(req.params.userId);
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }
  res.send(user);
});

const updateUser = catchAsync(async (req, res) => {
  const user = await userService.updateUserById(req.params.userId, req.body);
  res.send(user);
});

const deleteUser = catchAsync(async (req, res) => {
  await userService.deleteUserById(req.params.userId);
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


export {
  createUser,
  getUsers,
  getUser,
  updateUser,
  deleteUser,
  updateB2BAddress,
  deleteB2BAddress,
  addB2BAddress,
  deleteB2BKycDetails,
  addB2BKycDetails,
  getB2BAllAddressesByUserId,
  getB2BKycDetailsByUserId,
  updateB2BKycDetails
};

