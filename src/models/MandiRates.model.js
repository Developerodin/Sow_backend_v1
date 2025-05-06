import mongoose from 'mongoose';

const { Schema } = mongoose;

// Define the CategoryPrice schema
const CategoryPriceSchema = new Schema({
  category: {
    type: String,
    required: true,
  },
  subCategory:{
    type: String,
    required: false,
  },
  price: {
    type: Number,
    required: false,
    default: 0,
  },
  priceDifference:{
    type: Number,
    required: false,
  },
  date:{
    type: Date,
    required: false,
    default: Date.now,
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
