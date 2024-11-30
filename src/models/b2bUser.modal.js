import mongoose from 'mongoose';
import validator from 'validator';
import toJSON from './plugins/toJSON.plugin.js';
import paginate from './plugins/paginate.plugin.js';


const subCategorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: false,
  },
  price: {
    type: String,
    required: false,
  },
  unit: {
    type: String,
    required: false,
  },
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active',
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
  history: [
    {
      price: String,
      unit: String,
      status: {
        type: String,
        enum: ['active', 'inactive'],
      },
      updatedAt: {
        type: Date,
        default: Date.now,
      },
    },
  ],
});

const categorySchema = new mongoose.Schema({
  name: {
      type: String,
      required: false,
  },
  sub_category: [subCategorySchema],
  updatedAt: {
      type: Date,
      default: Date.now,
  },
});




const b2bUserSchema = mongoose.Schema(
  {
    name: {
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
      required: false,
      trim: true,
      lowercase: true,
      validate(value) {
        if (value && !validator.isEmail(value)) {
          throw new Error('Invalid email');
        }
      },
    },
    businessName: {
      type: String,
      required: false,
      trim: true,
    },
    category: [categorySchema],
    otp: {
      type: String,
      required: false,
      trim: true,
    },
    referralCode: {
      type: String,
      required: false,
      trim: true,
    },
    notificationToken: {
      type: String,
      default: "",
    },
    active: {
      type: Boolean,
       default: false,
    },
    status: {
      type: Boolean,
      default: false,
    },
    registerAs: {
      type: String,
      enum : ["Retailer", "Wholesaler", "Mediator","Factory"],
      required: true,
    },
    isKYCVerified: {
      type: Boolean,
      default: false,
    },
    notificationFormMandiList: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Mandi'
  }],
  favoriteMandis: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Mandi'
  }],
  image:{
    type:String,
    required:false
  }

  },
  {
    timestamps: true,
  }
);

// Add plugins that convert mongoose documents to JSON and paginate
b2bUserSchema.plugin(toJSON);
b2bUserSchema.plugin(paginate);

/**
 * Check if phone number is taken
 * @param {string} phoneNumber - The user's phone number
 * @param {ObjectId} [excludeUserId] - The id of the user to be excluded
 * @returns {Promise<boolean>}
 */
b2bUserSchema.statics.isPhoneNumberTaken = async function (phoneNumber, excludeUserId) {
  const user = await this.findOne({ phoneNumber, _id: { $ne: excludeUserId } });
  return !!user;
};

/**
 * Check if email is taken
 * @param {string} email - The user's email
 * @param {ObjectId} [excludeUserId] - The id of the user to be excluded
 * @returns {Promise<boolean>}
 */
b2bUserSchema.statics.isEmailTaken = async function (email, excludeUserId) {
  if (!email) return false;
  const user = await this.findOne({ email, _id: { $ne: excludeUserId } });
  return !!user;
};

/**
 * @typedef B2BUser
 */
const B2BUser = mongoose.model('B2BUser', b2bUserSchema);

export default B2BUser;
