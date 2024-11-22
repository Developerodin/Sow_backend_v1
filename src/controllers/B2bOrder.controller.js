import Order from "../models/B2bOrder.model.js";

// Create a new order
const createOrder = async (req, res) => {
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
    const existingOrder = await Order.findOne({ orderNo });
    if (existingOrder) {
      return res.status(400).json({ message: "Order number already exists" });
    }

    const newOrder = new Order({
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

    await newOrder.save();
    res.status(201).json(newOrder);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get all orders
const getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find()
      .populate("category", "name")
      .populate("orderBy", "name registerAs")
      .populate("orderTo", "name registerAs")
      .populate("location", "googleAddress")
      .populate("subCategory", "name");

    res.status(200).json(orders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get order by ID
const getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate("category", "name")
      .populate("orderBy", "name registerAs")
      .populate("orderTo", "name registerAs")
      .populate("location", "googleAddress")
      .populate("subCategory", "name");

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    res.status(200).json(order);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update order by ID
const updateOrder = async (req, res) => {
  try {
    const updatedOrder = await Order.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true }
    );

    if (!updatedOrder) {
      return res.status(404).json({ message: "Order not found" });
    }

    res.status(200).json(updatedOrder);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete order by ID
const deleteOrder = async (req, res) => {
  try {
    const deletedOrder = await Order.findByIdAndDelete(req.params.id);

    if (!deletedOrder) {
      return res.status(404).json({ message: "Order not found" });
    }

    res.status(200).json({ message: "Order deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get orders by user ID
const getOrdersByUserId = async (req, res) => {
  try {
    const { userId } = req.params;

    // Fetch orders where user is either `orderBy` or `orderTo`
    const orders = await Order.find({
      $or: [{ orderBy: userId }, { orderTo: userId }],
    })
      .populate("category", "name")
      .populate("subCategory", "name")
      .populate("location", "googleAddress")
      .populate("orderBy", "name registerAs")
      .populate("orderTo", "name registerAs")

    if (orders.length === 0) {
      return res.status(404).json({ message: "No orders found for this user" });
    }

    res.status(200).json(orders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export {
  createOrder,
  getAllOrders,
  getOrderById,
  updateOrder,
  deleteOrder,
  getOrdersByUserId,
};
