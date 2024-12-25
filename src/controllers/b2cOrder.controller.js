import B2CNotification from "../models/b2cNotification.js";
import b2cOrder from "../models/b2cOrder.model.js";
import { sendNotificationByUserId } from "./pushNotifications.controller.js";

const createB2cOrder = async (req, res) => {
  try {
    console.log("Request body:", req.body);

    const {
      items,
      orderBy,
      orderTo,
      location,
      photos,
      orderStatus,
    } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "Items array is required and must not be empty" });
    }

    // Calculate totalPrice for the entire order by summing up item total prices
    const totalPrice = items.reduce((sum, item) => sum + item.totalPrice, 0);

    // Generate a unique order number
    // const timestamp = Date.now();
    // const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    // const orderNo = `ORD-${timestamp}-${randomSuffix}`;

    const newB2cOrder = new b2cOrder({
      items,
      orderBy,
      orderTo,
      location,
      totalPrice,
      photos,
      orderStatus,
    });

    await newB2cOrder.save();
    const notificationMessage = `A new order has been created: ${newOrder.orderNo}`;

    const newNotification = new B2CNotification({
      notification: notificationMessage,
      orderId: newOrder._id,
      orderBy,
      orderTo,
      orderNo: newOrder.orderNo,
      orderStatus : newOrder.orderStatus,
      totalPrice: newOrder.totalPrice
    });

    await newNotification.save();

    const title = 'New Order';
    const body = `Total Amount: ${totalPrice}`;
    const data = { orderId: newOrder._id, otp };

    // Send notification to the user who created the order
    // await sendNotificationByUserId(orderBy, title, body, data);
    // await sendNotificationByUserId(orderTo, title, body, data);
    res.status(201).json(newB2cOrder);
  } catch (error) {
    console.error("Error creating B2C order:", error.message);
    console.error(error.stack);
    res.status(500).json({ message: error.message });
  }
};
// Get all orders
const getB2cAllOrders = async (req, res) => {
  try {
    const orders = await b2cOrder.find()
      .populate("items.category", "name")
      .populate("items.subCategory", "name")
      .populate("orderBy", "firstName lastName profileType")
      .populate("orderTo", "name registerAs")
      .populate("location", "googleAddress");

    res.status(200).json(orders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get order by ID
const getB2cOrderById = async (req, res) => {
  try {
    const b2cOrder = await b2cOrder.findById(req.params.id)
      .populate("items.category", "name")
      .populate("items.subCategory", "name")
      .populate("orderBy", "firstName lastName profileType")
      .populate("orderTo", "name registerAs")
      .populate("location", "googleAddress");

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
    const notificationMessage = `Order status updated: ${updatedOrder.orderNo}`;

    const newNotification = new B2CNotification({
      notification: notificationMessage,
      orderId: updatedB2cOrder._id,
      orderBy:updatedB2cOrder.orderBy,
      orderTo:updatedB2cOrder.orderTo,
      orderNo: updatedB2cOrder.orderNo,
      orderStatus : updatedB2cOrder.orderStatus,
      totalPrice: updatedB2cOrder.totalPrice
    });

    await newNotification.save();

    const title = 'Order updated';
    const body = `Total Amount: ${updatedB2cOrder.totalPrice}`;
    const data = { orderId: updatedB2cOrder._id };

    // Send notification to the user who created the order
    // await sendNotificationByUserId(updatedB2cOrder.orderBy, title, body, data);
    // await sendNotificationByUserId(updatedB2cOrder.orderTo, title, body, data);

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
      .populate("items.category", "name")
      .populate("items.subCategory", "name")
      .populate("orderBy", "firstName lastName profileType")
      .populate("orderTo", "name registerAs")
      .populate("location", "googleAddress");

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
