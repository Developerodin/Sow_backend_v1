import Mandi from "../models/Mandi.model.js";


// Create a new Mandi entry
const createMandi = async (req, res) => {
  try {
    const { mandiname, city, state, categories } = req.body;

    const newMandi = new Mandi({ mandiname, city, state, categories });
    const savedMandi = await newMandi.save();

    res.status(201).json(savedMandi);
  } catch (error) {
    res.status(500).json({ message: 'Failed to create Mandi', error });
  }
};

// Get all Mandi entries
const getAllMandi = async (req, res) => {
  try {
    const mandis = await Mandi.find();
    res.status(200).json(mandis);
  } catch (error) {
    res.status(500).json({ message: 'Failed to retrieve Mandi entries', error });
  }
};

// Get a single Mandi entry by ID
const getMandiById = async (req, res) => {
  try {
    const { id } = req.params;
    const mandi = await Mandi.findById(id);

    if (!mandi) {
      return res.status(404).json({ message: 'Mandi not found' });
    }

    res.status(200).json(mandi);
  } catch (error) {
    res.status(500).json({ message: 'Failed to retrieve Mandi', error });
  }
};

// Update a Mandi entry by ID
const updateMandi = async (req, res) => {
  try {
    const { id } = req.params;
    const { mandiname, city, state, categories } = req.body;

    const updatedMandi = await Mandi.findByIdAndUpdate(
      id,
      { mandiname, city, state, categories },
      { new: true } // Return the updated document
    );

    if (!updatedMandi) {
      return res.status(404).json({ message: 'Mandi not found' });
    }

    res.status(200).json(updatedMandi);
  } catch (error) {
    res.status(500).json({ message: 'Failed to update Mandi', error });
  }
};

// Delete a Mandi entry by ID
const deleteMandi = async (req, res) => {
  try {
    const { id } = req.params;

    const deletedMandi = await Mandi.findByIdAndDelete(id);

    if (!deletedMandi) {
      return res.status(404).json({ message: 'Mandi not found' });
    }

    res.status(200).json({ message: 'Mandi deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete Mandi', error });
  }
};

// Change Mandi status by ID
const changeMandiStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const mandi = await Mandi.findById(id);

    if (!mandi) {
      return res.status(404).json({ message: 'Mandi not found' });
    }

    mandi.status = status;
    const updatedMandi = await mandi.save();

    res.status(200).json(updatedMandi);
  } catch (error) {
    res.status(500).json({ message: 'Failed to change Mandi status', error });
  }
};

export { createMandi, getAllMandi, getMandiById, updateMandi, deleteMandi, changeMandiStatus };
