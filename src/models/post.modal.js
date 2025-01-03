import mongoose from 'mongoose';

// Define the Post schema
const postSchema = new mongoose.Schema(
  {
    postBy: {
      type: mongoose.Schema.Types.ObjectId, // Reference to the user who created the post
      ref: "B2CUser", // Reference to the User model
      required: true,
    },
    postTo: {
      type: mongoose.Schema.Types.ObjectId, // Reference to the user who created the post
      ref: "B2BUser", // Reference to the User model
      required: false,
    },
    categoryName: {
      type: String,
      required: true,
    },
    subCategoryName: {
      type: String,
      required: true,
    },
    images: {
      type: String, // Placeholder for images (can be URL or string representation)
      required: false,
    },
    title: {
      type: String,
      required: true,
      trim: true, // Trim leading and trailing spaces
    },
    description: {
      type: String,
      required: false,
    },
    price: {
      type: Number,
      required: true,
      
    },
    quantity: {
      type: Number,
      required: true,
      
    },
    companyName: {
      type: String,
      required: true,
      trim: true,
    },
    emailAddress: {
      type: String,
      required: true,
      trim: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, // Regex to validate email format
        'Please enter a valid email address',
      ],
    },
    phoneNumber: {
      type: String,
      required: true,
      match: [
        /^\d{10}$/, // 10-digit phone number validation
        'Please enter a valid 10-digit phone number',
      ],
    },
    state: {
      type: String,
      required: false,
      trim: true,
    },
    city: {
      type: String,
      required: false,
      trim: true,
    },
    address: {
      type: String,
      required: false,
    },
    postStatus: {
      type: String,
      required: true,
      enum: ["New", "Pending", "Rejected", "Completed", "Cancelled"],
      default: "New",
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt fields
  }
);

// Export the Post model
export default mongoose.model('Post', postSchema);
