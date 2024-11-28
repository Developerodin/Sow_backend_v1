import MarketRates from "../Models/MarketRates.Model.js";


const eventController = {
  // Create a new event
  async createEvent(req, res) {
    try {
      const { name, category, date, time, price } = req.body;
      const newEvent = await MarketRates.create({ name, category, date, time, price });
      res.status(201).json(newEvent);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  // Get all events
  async getAllEvents(req, res) {
    try {
      const events = await MarketRates.find();
      res.json(events);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  // Get a single event by ID
  async getEventById(req, res) {
    try {
      const event = await MarketRates.findById(req.params.id);
      if (!event) {
        return res.status(404).json({ message: 'Event not found' });
      }
      res.json(event);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  // Update an existing event
  async updateEvent(req, res) {
    try {
      const { name, category, date, time, price } = req.body;
      const updatedEvent = await MarketRates.findByIdAndUpdate(req.params.id, { name, category, date, time, price }, { new: true });
      if (!updatedEvent) {
        return res.status(404).json({ message: 'Event not found' });
      }
      res.json(updatedEvent);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  // Delete an event
  async deleteEvent(req, res) {
    try {
      const deletedEvent = await MarketRates.findByIdAndDelete(req.params.id);
      if (!deletedEvent) {
        return res.status(404).json({ message: 'Event not found' });
      }
      res.json({ message: 'Event deleted successfully' });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
};

export default eventController;
