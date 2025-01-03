import mongoose from 'mongoose';

const quotationSchema = mongoose.Schema(
  {
    price: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    notes: {
      type: String,
      required: false,
      trim: true,
    },
    postId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Post",
      required: true,
    },
    b2cUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "B2CUser",
      required: true,
    },
    wholesalerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "B2BUser",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

/**
 * @typedef Quotation
 */
const Quotation = mongoose.model('Quotation', quotationSchema);

export default Quotation;