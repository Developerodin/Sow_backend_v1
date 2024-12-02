import mongoose from 'mongoose';

const kycSchema = mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'B2BUser',
      required: true,
    },
    panNumber: {
      type: String,
      required: false,
      trim: true,
      validate(value) {
        if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(value)) {
          throw new Error('Invalid PAN number format');
        }
      },
    },
    gstinNumber: {
      type: String,
      required: true,
      trim: true,
      // validate(value) {
      //   if (!/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(value)) {
      //     throw new Error('Invalid GSTIN format');
      //   }
      // },
    },
    panImage: {
      type: String,
      required: false, // Store the file path or URL of the uploaded PAN image
    },
    gstinImage: {
      type: String,
      required: false, // Store the file path or URL of the uploaded GSTIN image
    },
    WareHouseImage: {
      type: String,
      required: false, // Store the file path or URL of the uploaded GSTIN image
    },
    OwnerImage: {
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
const B2BKYC = mongoose.model('B2BKYC', kycSchema);

export default B2BKYC;
