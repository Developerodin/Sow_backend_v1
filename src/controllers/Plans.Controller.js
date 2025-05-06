

import Plan from "../models/Plans.Model.js";

// Create a new plan
export const createPlan = async (req, res) => {
  try {
    const { name, price, features, priceType } = req.body;
    const newPlan = new Plan({ name, price, features, priceType });
    const savedPlan = await newPlan.save();
    res.status(201).json(savedPlan);
  } catch (error) {
    res.status(500).json({ error: 'Error creating plan' });
  }
};

// Get all plans
export const getPlans = async (req, res) => {
  try {
    const plans = await Plan.find();
    res.status(200).json(plans);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching plans' });
  }
};

// Update a plan
export const updatePlan = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, price, features, priceType } = req.body;
    const updatedPlan = await Plan.findByIdAndUpdate(id, { name, price, features, priceType }, { new: true });
    res.status(200).json(updatedPlan);
  } catch (error) {
    res.status(500).json({ error: 'Error updating plan' });
  }
};

// Delete a plan
export const deletePlan = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedPlan = await Plan.findByIdAndDelete(id);
    res.status(200).json(deletedPlan);
  } catch (error) {
    res.status(500).json({ error: 'Error deleting plan' });
  }
};
