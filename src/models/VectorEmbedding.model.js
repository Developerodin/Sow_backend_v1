import mongoose from 'mongoose';

const { Schema } = mongoose;

const VectorEmbeddingSchema = new Schema({
  type: {
    type: String,
    required: true,
    enum: ['category', 'subcategory', 'mandi'],
    index: true,
  },
  originalId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    refPath: 'typeRef',
    index: true,
  },
  typeRef: {
    type: String,
    required: true,
    enum: ['Category', 'SubCategory', 'Mandi'],
  },
  text: {
    type: String,
    required: true,
    trim: true,
  },
  embedding: {
    type: [Number],
    required: true,
  },
  aliases: {
    type: [String],
    default: [],
  },
  metadata: {
    type: Schema.Types.Mixed,
    default: {},
  },
}, {
  timestamps: true,
});

// Compound index for efficient lookups
VectorEmbeddingSchema.index({ type: 1, originalId: 1 }, { unique: true });

const VectorEmbedding = mongoose.model('VectorEmbedding', VectorEmbeddingSchema);

export default VectorEmbedding;







