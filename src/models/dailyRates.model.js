// models/Event.js

import mongoose from 'mongoose';

const eventSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  text: {
    type: String,
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  status:{
    type: Boolean,
    default:true
  }
});

const DailyRates = mongoose.model('DaliyRates', eventSchema);

export default DailyRates;
