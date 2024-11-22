import b2cOrder from "../models/b2cOrder.model.js";

// Create a new order
const createB2cOrder = async (req, res) => {
  try {
    const {
      orderNo,
      category,
      orderBy,
      orderTo,
      location,
      subCategory,
      weight,
      unit,
      notes,
      value,
      totalPrice,
      photos,
      orderStatus,
    } = req.body;

    // Ensure orderNo is unique
    const existingOrder = await b2cOrder.findOne({ orderNo });
    if (existingOrder) {
      return res.status(400).json({ message: "Order number already exists" });
    }

    const newB2cOrder = new b2cOrder({
      orderNo,
      category,
      orderBy,
      orderTo,
      location,
      subCategory,
      weight,
      unit,
      notes,
      value,
      totalPrice,
      photos,
      orderStatus,
    });

    await newB2cOrder.save();
    res.status(201).json(newB2cOrder);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get all orders
const getB2cAllOrders = async (req, res) => {
  try {
    const orders = await b2cOrder.find()
      .populate("category", "name")
      .populate("orderBy", "firstName lastName profileType")
      .populate("orderTo", "name registerAs")
      .populate("location", "googleAddress")
      .populate("subCategory", "name");

    res.status(200).json(orders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get order by ID
const getB2cOrderById = async (req, res) => {
  try {
    const b2cOrder = await b2cOrder.findById(req.params.id)
      .populate("category", "name")
      .populate("orderBy", "firstName lastName profileType")
      .populate("orderTo", "name registerAs")
      .populate("location", "googleAddress")
      .populate("subCategory", "name");

    if (!b2cOrder) {
      return res.status(404).json({ message: "Order not found" });
    }

    res.status(200).json(b2cOrder);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update order by ID
const updateB2cOrder = async (req, res) => {
  try {
    const updatedB2cOrder = await b2cOrder.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true }
    );

    if (!updatedB2cOrder) {
      return res.status(404).json({ message: "Order not found" });
    }

    res.status(200).json(updatedB2cOrder);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete order by ID
const deleteB2cOrder = async (req, res) => {
  try {
    const deletedB2cOrder = await b2cOrder.findByIdAndDelete(req.params.id);

    if (!deletedB2cOrder) {
      return res.status(404).json({ message: "Order not found" });
    }

    res.status(200).json({ message: "Order deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get orders by user ID
const getB2cOrdersByUserId = async (req, res) => {
  try {
    const { userId } = req.params;

    // Fetch orders where user is either `orderBy` or `orderTo`
    const b2cOrders = await b2cOrder.find({
      $or: [{ orderBy: userId }, { orderTo: userId }],
    })
      .populate("category", "name")
      .populate("subCategory", "name")
      .populate("location", "googleAddress")
      .populate("orderBy", "firstName lastName profileType")
      .populate("orderTo", "name registerAs")

    if (b2cOrders.length === 0) {
      return res.status(404).json({ message: "No orders found for this user" });
    }

    res.status(200).json(b2cOrders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export {
  createB2cOrder,
    getB2cAllOrders,
    getB2cOrderById,
    updateB2cOrder,
    deleteB2cOrder,
    getB2cOrdersByUserId,
};
