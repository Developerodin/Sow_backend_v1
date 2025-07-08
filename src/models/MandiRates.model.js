import mongoose from 'mongoose';

const { Schema } = mongoose;

// Custom validator for Indian 12-hour time format
const timeFormatValidator = function(value) {
  if (!value) return true; // Allow empty/null values since it's not required
  const timeRegex = /^(0?[1-9]|1[0-2]):[0-5][0-9] (AM|PM)$/;
  return timeRegex.test(value);
};

// Define the CategoryPrice schema
const CategoryPriceSchema = new Schema({
  category: {
    type: String,
    required: true,
  },
  subCategory: {
    type: String,
    required: false,
  },
  price: {
    type: Number,
    required: false,
    default: 0,
  },
  priceDifference: {
    type: Number,
    required: false,
  },
  date: {
    type: Date,
    required: false,
    default: Date.now,
  },
  time: {
    type: String,
    required: false,
    validate: {
      validator: timeFormatValidator,
      message: 'Time must be in Indian 12-hour format (e.g., "10:30 AM", "03:45 PM")'
    }
  },
}, {
  timestamps: true, // Automatically adds createdAt and updatedAt fields
});

// Define the MandiCategoryPrice schema
const MandiCategoryPriceSchema = new Schema({
  mandi: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Mandi',
    required: true,
  },
  categoryPrices: [CategoryPriceSchema], // Array of categories with prices
}, {
  timestamps: true, // Automatically adds createdAt and updatedAt fields
});

const MandiCategoryPrice = mongoose.model('MandiCategoryPrice', MandiCategoryPriceSchema);

export default MandiCategoryPrice;
