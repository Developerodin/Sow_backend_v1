import mongoose from 'mongoose';

const categorySchema = mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    description: {
      type: String,
      required: false,
      trim: true,
    },
    image:{
      type: String,
      required: false,
    }
  },
  {
    timestamps: true,
  }
);

/**
 * @typedef Category
 */
const Category = mongoose.model('Category', categorySchema);

export default Category;
