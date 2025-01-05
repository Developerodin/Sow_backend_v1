import B2CUser from '../models/b2cUser.modal.js';
import B2CKYC from '../models/b2cUserKyc.modal.js';

/**
 * Create a B2C user
 * @param {Object} userBody - The B2C user object
 * @returns {Promise<B2CUser>}
 */
const createUser = async (userBody) => {
  if (await B2CUser.isPhoneNumberTaken(userBody.phoneNumber)) {
    throw new Error('Phone number already taken');
  }
  if (userBody.email && await B2CUser.isEmailTaken(userBody.email)) {
    throw new Error('Email already taken');
  }
  const user = await B2CUser.create(userBody);
  const kycData = {
    userId: user._id, // Link the KYC record to the new user
    panNumber: '',
    gstinNumber: '',
    panImage: '',
    gstinImage: '',
    status: 'pending', // Default status
    remarks: '', // Optional field, leave empty
  };

  await B2CKYC.create(kycData);
  return user;
};

/**
 * Query for B2C users
 * @param {Object} filter - Mongo filter
 * @param {Object} options - Query options (sort, pagination, etc.)
 * @returns {Promise<QueryResult>}
 */
const queryUsers = async (filter, options) => {
  const users = await B2CUser.paginate(filter, options);
  return users;
};

/**
 * Get B2C user by id
 * @param {ObjectId} id - B2C user ID
 * @returns {Promise<B2CUser>}
 */
const getUserById = async (id) => {
  return B2CUser.findById(id);
};

/**
 * Get B2C user by phone number
 * @param {string} phoneNumber - User phone number
 * @returns {Promise<B2CUser>}
 */
const getUserByPhoneNumber = async (phoneNumber) => {
  return B2CUser.findOne({ phoneNumber });
};

/**
 * Update B2C user by id
 * @param {ObjectId} userId - B2C user ID
 * @param {Object} updateBody - Object containing updated fields
 * @returns {Promise<B2CUser>}
 */
const updateUserById = async (userId, updateBody) => {
  const user = await getUserById(userId);
  if (!user) {
    throw new Error('User not found');
  }
  if (updateBody.phoneNumber && await B2CUser.isPhoneNumberTaken(updateBody.phoneNumber, userId)) {
    throw new Error('Phone number already taken');
  }
  if (updateBody.email && await B2CUser.isEmailTaken(updateBody.email, userId)) {
    throw new Error('Email already taken');
  }
  Object.assign(user, updateBody);
  await user.save();
  return user;
};

/**
 * Delete B2C user by id
 * @param {ObjectId} userId - B2C user ID
 * @returns {Promise<B2CUser>}
 */
const deleteUserById = async (userId) => {
  const user = await getUserById(userId);
  if (!user) {
    throw new Error('User not found');
  }
  await user.remove();
  return user;
};

export { createUser, queryUsers, getUserById, getUserByPhoneNumber, updateUserById, deleteUserById };
