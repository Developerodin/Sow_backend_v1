import mongoose from 'mongoose';

const { Schema } = mongoose;

const MandiPricePointSchema = new Schema(
  {
    mandiId: {
      type: Schema.Types.ObjectId,
      ref: 'Mandi',
      required: true,
    },
    category: {
      type: String,
      required: true,
    },
    subCategory: {
      type: String,
      required: true,
    },
    at: {
      type: Date,
      required: true,
    },
    price: {
      type: Number,
      required: true,
    },
    unit: {
      type: String,
      required: false,
    },
    sourceRateId: {
      type: Schema.Types.ObjectId,
      required: false,
      ref: 'MandiCategoryPrice',
    },
  },
  {
    timestamps: false,
  }
);

MandiPricePointSchema.index({ mandiId: 1, category: 1, subCategory: 1, at: -1 });

const MandiPricePoint = mongoose.model('MandiPricePoint', MandiPricePointSchema);

export default MandiPricePoint;
