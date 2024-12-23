import mongoose from 'mongoose';

const addressSchema = mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'B2CUser',
      required: true,
    },
    latitude: {
      type: Number,
      required: true,
    },
    longitude: {
      type: Number,
      required: true,
    },
    googleAddress: {
      type: String,
      required: true,
      trim: true,
    },
    buildingName: {
      type: String,
      trim: true,
    },
    roadArea: {
      type: String,
      trim: true,
    },
    note: {
      type: String,
      trim: true,
    },
    addressType: {
      type: String,
      enum: ['Warehouse', 'Other'],
      required: true,
    },
    activeAddress: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// /**
//  * @typedef Address
//  */
const B2CAddress = mongoose.model('B2CAddress', addressSchema);

export default B2CAddress;
