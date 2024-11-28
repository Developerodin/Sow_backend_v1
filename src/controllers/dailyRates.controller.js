import DailyRates from "../models/dailyRates.model.js";


// Create a new DailyRate
const createDailyRate = async (req, res) => {
  try {
    const { name,text, date } = req.body;

    const newDailyRate = new DailyRates({
      name,
      text,
      date
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
