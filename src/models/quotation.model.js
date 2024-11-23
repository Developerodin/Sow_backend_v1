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
