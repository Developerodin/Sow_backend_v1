import mongoose from 'mongoose';

const kycSchema = mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'B2CUser',
      required: true,
    },
    panNumber: {
      type: String,
      required: false,
      trim: true,

    },
    gstinNumber: {
      type: String,
      required: false,
      trim: true,

    },
    panImage: {
      type: String,
      required: false, // Store the file path or URL of the uploaded PAN image
    },
    gstinImage: {
      type: String,
      required: false, // Store the file path or URL of the uploaded GSTIN image
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    remarks: {
      type: String, // Optional field for admin comments
    },
  },
  {
    timestamps: true,
  }
);

// /**
//  * @typedef KYC
//  */
const B2CKYC = mongoose.model('B2CKYC', kycSchema);

export default B2CKYC;
