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
    aadharFrontImage: {
      type: String, // Single Aadhar front image URL
      required: false,
    },
    aadharFrontImageKey: {
      type: String, // Single Aadhar front image key
      required: false,
    },
    aadharBackImage: {
      type: String, // Single Aadhar back image URL
      required: false,
    },
    aadharBackImageKey: {
      type: String, // Single Aadhar back image key
      required: false,
    },
    WareHouseImage: {
      type: [String], // Array of warehouse image URLs
      required: false,
      default: []
    },
    WarehouseImageKey: {
      type: [String], // Array of warehouse image keys
      required: false,
      default: []
    },
    OwnerImage: {
      type: [String], // Array of owner image URLs
      required: false,
      default: []
    },
    OwnerImageKey: {
      type: [String], // Array of owner image keys
      required: false,
      default: []
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
