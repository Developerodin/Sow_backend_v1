import mongoose from 'mongoose';

const { Schema } = mongoose;

const MandiSchema = new Schema({
  mandiname: {
    type: String,
    required: false, // Optional field
  },
  city: {
    type: String,
    required: true,
  },
  state: {
    type: String,
    required: true,
  },
  categories: {
    type: [String], // Array of strings for categories
    required: true,
  },
}, {
  timestamps: true, // Automatically adds createdAt and updatedAt fields
});

const Mandi = mongoose.model('Mandi', MandiSchema);

export default Mandi;
