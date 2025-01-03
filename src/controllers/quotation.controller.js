import Quotation from "../models/quotation.model.js";

// Create a new quotation
const createQuotation = async (req, res) => {
  try {
    // Destructure the incoming request body
    const { price, notes, postId, b2cUserId, wholesalerId } = req.body;

    // Create a new quotation instance
    const quotation = new Quotation({
      price,
      notes,
      postId,
      b2cUserId,
      wholesalerId,
    });

    // Save the quotation to the database
    const savedQuotation = await quotation.save();
    res.status(201).json(savedQuotation);
  } catch (error) {
    console.error('Error creating quotation:', error);
    res.status(400).json({ message: error.message });
  }
};

// Get all quotations
const getAllQuotations = async (req, res) => {
  try {
    const quotations = await Quotation.find()
      .populate('postId', 'title description')
      .populate('b2cUserId', 'firstName lastName')
      .populate('wholesalerId', 'name registerAs');
    res.status(200).json(quotations);
  } catch (error) {
    console.error('Error fetching quotations:', error);
    res.status(500).json({ message: error.message });
  }
};

// Get a single quotation
const getQuotation = async (req, res) => {
  try {
    const { id } = req.params;
    const quotation = await Quotation.findById(id)
      .populate('postId', 'title description')
      .populate('b2cUserId', 'firstName lastName')
      .populate('wholesalerId', 'name registerAs');

    if (!quotation) {
      return res.status(404).json({ message: "Quotation not found" });
    }
    res.status(200).json(quotation);
  } catch (error) {
    console.error('Error fetching quotation:', error);
    res.status(500).json({ message: error.message });
  }
};

// Update quotation
const updateQuotation = async (req, res) => {
  try {
    const { id } = req.params;
    const updatedQuotation = await Quotation.findByIdAndUpdate(
      id,
      { $set: req.body },
      { new: true }
    );

    if (!updatedQuotation) {
      return res.status(404).json({ message: "Quotation not found" });
    }
    res.status(200).json(updatedQuotation);
  } catch (error) {
    console.error('Error updating quotation:', error);
    res.status(500).json({ message: error.message });
  }
};

// Delete quotation
const deleteQuotation = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedQuotation = await Quotation.findByIdAndDelete(id);

    if (!deletedQuotation) {
      return res.status(404).json({ message: "Quotation not found" });
    }
    res.status200().json({ message: "Quotation deleted successfully" });
  } catch (error) {
    console.error('Error deleting quotation:', error);
    res.status(500).json({ message: error.message });
  }
};

// Get quotations by B2C user ID (POST request)
const getQuotationsByB2CUserId = async (req, res) => {
  try {
    const { b2cUserId } = req.body;
    const quotations = await Quotation.find({ b2cUserId })
      .populate('postId', 'title description')
      .populate('b2cUserId', 'firstName lastName')
      .populate('wholesalerId', 'name registerAs');

    if (!quotations.length) {
      return res.status(404).json({ message: "No quotations found for this user" });
    }

    res.status(200).json(quotations);
  } catch (error) {
    console.error('Error fetching quotations:', error);
    res.status(500).json({ message: error.message });
  }
};

export { createQuotation, getAllQuotations, getQuotation, updateQuotation, deleteQuotation, getQuotationsByB2CUserId };