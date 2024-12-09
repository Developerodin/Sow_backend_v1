import mongoose from 'mongoose';

const SubCategorySchema = new mongoose.Schema(
  {
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: true,
    },
    name: {
      type: String,
      required: true,
      unique: true,
    },
    description: {
      type: String,
      required: false,
    },
    isTradable: {
      type: Boolean,
      default: true, // Default value set to false
    },
  },
  {
    timestamps: true,
  }
);

const SubCategory = mongoose.model('SubCategory', SubCategorySchema);

export default SubCategory;
