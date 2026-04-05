import mongoose from 'mongoose';

const { Schema } = mongoose;

const MarketRateParseJobSchema = new Schema(
  {
    jobId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed'],
      default: 'pending',
      index: true,
    },
    result: {
      type: Schema.Types.Mixed,
      default: null,
    },
    error: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

MarketRateParseJobSchema.index({ createdAt: 1 }, { expireAfterSeconds: 86400 });

const MarketRateParseJob = mongoose.model('MarketRateParseJob', MarketRateParseJobSchema);

export default MarketRateParseJob;
