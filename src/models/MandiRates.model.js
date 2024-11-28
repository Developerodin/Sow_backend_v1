import mongoose from 'mongoose';

const { Schema } = mongoose;

// Define the CategoryPrice schema
const CategoryPriceSchema = new Schema({
  category: {
    type: String,
    required: true,
  },
  price: {
    type: Number,
    required: true,
  },
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
