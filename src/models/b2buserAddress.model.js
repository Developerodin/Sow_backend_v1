import mongoose from 'mongoose';

const addressSchema = mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
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
  },
  {
    timestamps: true,
  }
);

// /**
//  * @typedef Address
//  */
const B2BAddress = mongoose.model('B2BAddress', addressSchema);

export default B2BAddress;
