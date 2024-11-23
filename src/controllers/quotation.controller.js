import Quotation from "../models/quotation.model.js";

// Create a new quotation
const createQuotation = async (req, res) => {
    try {
        const quotation = await Quotation.create(req.body);
        res.status(201).json(quotation);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// Get all quotations
const getAllQuotations = async (req, res) => {
  try {
    const quotations = await Quotation.find();
    res.status(200).json(quotations);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get a single quotation
const getQuotation = async (req, res) => {
  try {
    const { id } = req.params;
    const quotation
        = await
        Quotation.findById(id);

    if (!quotation) {
        return res.status(404).json({ message: "Quotation not found" });
        }
        res.status(200).json(quotation);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
}


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
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
}

// Delete quotation
const deleteQuotation = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedQuotation = await Quotation.findByIdAndDelete(id);

    if (!deletedQuotation) {
      return res.status(404).json({ message: "Quotation not found" });
    }
    res.status(200).json({ message: "Quotation deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export { createQuotation, getAllQuotations, getQuotation, updateQuotation, deleteQuotation };

        