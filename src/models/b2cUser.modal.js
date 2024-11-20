import mongoose from 'mongoose';
import validator from 'validator';
import toJSON from './plugins/toJSON.plugin.js';
import paginate from './plugins/paginate.plugin.js';

const b2cUserSchema = mongoose.Schema(
  {
    firstName: {
      type: String,
      required: true,
      trim: true,
    },
    lastName: {
      type: String,
      required: true,
      trim: true,
    },
    phoneNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      validate(value) {
        if (!validator.isMobilePhone(value, 'any')) {
          throw new Error('Invalid phone number');
        }
      },
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      validate(value) {
        if (value && !validator.isEmail(value)) {
          throw new Error('Invalid email');
        }
      },
    },
    isKYCVerified: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      default: 'active',
    },
    profileType: {
      type: String,
      required: true,
      enum: ['industry', 'office', 'shopkeeper'],
    },
    referralCode: {
      type: String,
      unique: true,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Add plugins that convert mongoose documents to JSON and paginate
b2cUserSchema.plugin(toJSON);
b2cUserSchema.plugin(paginate);

/**
 * Check if phone number is taken
 * @param {string} phoneNumber - The user's phone number
 * @param {ObjectId} [excludeUserId] - The id of the user to be excluded
 * @returns {Promise<boolean>}
 */
b2cUserSchema.statics.isPhoneNumberTaken = async function (phoneNumber, excludeUserId) {
  const user = await this.findOne({ phoneNumber, _id: { $ne: excludeUserId } });
  return !!user;
};

/**
 * Check if email is taken
 * @param {string} email - The user's email
 * @param {ObjectId} [excludeUserId] - The id of the user to be excluded
 * @returns {Promise<boolean>}
 */
b2cUserSchema.statics.isEmailTaken = async function (email, excludeUserId) {
  if (!email) return false;
  const user = await this.findOne({ email, _id: { $ne: excludeUserId } });
  return !!user;
};

/**
 * @typedef B2CUser
 */
const B2CUser = mongoose.model('B2CUser', b2cUserSchema);

export default B2CUser;
