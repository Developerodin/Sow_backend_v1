import DailyRates from "../models/dailyRates.model.js";

const timeRegex = /^(0?[1-9]|1[0-2]):[0-5][0-9] (AM|PM)$/;

// Create a new DailyRate
const createDailyRate = async (req, res) => {
  try {
    const { name, text, date, time } = req.body;

    if (time != null && String(time).trim() !== '' && !timeRegex.test(String(time).trim())) {
      return res.status(400).json({
        message: 'Invalid time format. Time must be in 12-hour format (e.g., "10:30 AM", "03:45 PM")',
        invalidTime: time
      });
    }

    const trimmedTime = time != null && String(time).trim() !== '' ? String(time).trim() : undefined;

    const newDailyRate = new DailyRates({
      name,
      text,
      date,
      ...(trimmedTime ? { time: trimmedTime } : {})
    });

    await newDailyRate.save();

    res.status(201).json(newDailyRate);
  } catch (error) {
    res.status(500).json({ message: 'Error creating DailyRate', error });
  }
};

// Get all DailyRates
const getDailyRates = async (req, res) => {
  try {
    const dailyRates = await DailyRates.find();
    res.status(200).json(dailyRates);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching DailyRates', error });
  }
};

const deleteDailyRate = async (req, res) => {
    const { id } = req.params;
  
    try {
      const deletedDailyRate = await DailyRates.findByIdAndDelete(id);
  
      if (!deletedDailyRate) {
        return res.status(404).json({ message: 'DailyRate not found' });
      }
  
      res.status(200).json({ message: 'DailyRate deleted successfully', deletedDailyRate });
    } catch (error) {
      res.status(500).json({ message: 'Error deleting DailyRate', error });
    }
  };

export { createDailyRate, getDailyRates, deleteDailyRate };  
