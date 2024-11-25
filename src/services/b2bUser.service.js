import B2BUser from '../models/b2bUser.modal.js';
import ApiError from '../utils/ApiError.js';
import httpStatus from 'http-status';

/**
 * Create a new B2B user
 * @param {Object} userBody
 * @returns {Promise<B2BUser>}
 */
const createB2BUser = async (userBody) => {
  if (Array.isArray(userBody.category)) {
    // Normalize the category to be an array of objects
    userBody.category = userBody.category.map((cat) =>
      typeof cat === 'string' ? { name: cat } : cat
    );
  } else {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Category must be an array');
  }

  if (await B2BUser.isPhoneNumberTaken(userBody.phoneNumber)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Phone number already registered');
  }
  if (userBody.email && (await B2BUser.isEmailTaken(userBody.email))) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Email already taken');
  }
  return B2BUser.create(userBody);
};

/**
 * Query for B2B users
 * @param {Object} filter - MongoDB filter
 * @param {Object} options - Query options
 * @param {string} [options.sortBy] - Sort option in the format: sortField:(desc|asc)
 * @param {number} [options.limit] - Maximum number of results per page (default = 10)
 * @param {number} [options.page] - Current page (default = 1)
 * @returns {Promise<QueryResult>}
 */
const queryB2BUsers = async (filter, options) => {
  const users = await B2BUser.paginate(filter, options);
  return users;
};

/**
 * Get B2B user by ID
 * @param {ObjectId} id
 * @returns {Promise<B2BUser>}
 */
const getB2BUserById = async (id) => {
  const user = await B2BUser.findById(id);
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'B2B User not found');
  }
  return user;
};

/**
 * Get B2B user by phone number
 * @param {string} phoneNumber
 * @returns {Promise<B2BUser>}
 */
const getB2BUserByPhoneNumber = async (phoneNumber) => {
  return B2BUser.findOne({ phoneNumber });
};

/**
 * Get B2B user by email
 * @param {string} email
 * @returns {Promise<B2BUser>}
 */
const getB2BUserByEmail = async (email) => {
  return B2BUser.findOne({ email });
};

/**
 * Update B2B user by ID
 * @param {ObjectId} userId
 * @param {Object} updateBody
 * @returns {Promise<B2BUser>}
 */
const updateB2BUserById = async (userId, updateBody) => {
  const user = await getB2BUserById(userId);
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'B2B User not found');
  }
  if (updateBody.phoneNumber && (await B2BUser.isPhoneNumberTaken(updateBody.phoneNumber, userId))) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Phone number already registered');
  }
  if (updateBody.email && (await B2BUser.isEmailTaken(updateBody.email, userId))) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Email already taken');
  }
  Object.assign(user, updateBody);
  await user.save();
  return user;
};

/**
 * Delete B2B user by ID
 * @param {ObjectId} userId
 * @returns {Promise<B2BUser>}
 */
const deleteB2BUserById = async (userId) => {
  const user = await getB2BUserById(userId);
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'B2B User not found');
  }
  await user.remove();
  return user;
};

export {
  createB2BUser,
  queryB2BUsers,
  getB2BUserById,
  getB2BUserByPhoneNumber,
  getB2BUserByEmail,
  updateB2BUserById,
  deleteB2BUserById,
};
