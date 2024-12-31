import B2CNotification from "../models/b2cNotification.js";
import b2cOrder from "../models/b2cOrder.model.js";
import { sendNotificationByUserId } from "./pushNotifications.controller.js";
import moment from "moment";

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
    const orders = await b2cOrder.findById(req.params.id)

      .populate("orderBy", "firstName lastName profileType")
      .populate("orderTo", "name registerAs")
      .populate("location", "googleAddress");

    if (!orders) {
      return res.status(404).json({ message: "Order not found" });
    }

    res.status(200).json(orders);
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


const assignOrderToUser = async (req, res) => {
  try {
    console.log("Assigning order to user - Request body:", req.body);

    const { orderId, userId } = req.body;

    if (!orderId || !userId) {
      console.error("Order ID or User ID is missing");
      return res.status(400).json({ message: "Order ID and User ID are required" });
    }

    console.log(`Finding order with ID: ${orderId}`);
    const updatedOrder = await b2cOrder.findByIdAndUpdate(
      orderId,
      { orderTo: userId },
      { new: true }
    );

    if (!updatedOrder) {
      console.error(`Order with ID: ${orderId} not found`);
      return res.status(404).json({ message: "Order not found" });
    }

    console.log(`Order with ID: ${orderId} found and updated with user ID: ${userId}`);

    const notificationMessage = `Order assigned to user: ${updatedOrder.orderNo}`;
    console.log("Creating notification with message:", notificationMessage);

    const newNotification = new B2CNotification({
      notification: notificationMessage,
      orderId: updatedOrder._id,
      orderBy: updatedOrder.orderBy,
      orderTo: updatedOrder.orderTo,
      orderNo: updatedOrder.orderNo,
      orderStatus: updatedOrder.orderStatus,
      totalPrice: updatedOrder.totalPrice,
    });

    await newNotification.save();
    console.log("Notification saved successfully");

    const title = 'Order Assigned';
    const body = `Order No: ${updatedOrder.orderNo}`;
    const data = { orderId: updatedOrder._id };

    console.log("Sending notification to user with ID:", userId);
    await sendNotificationByUserId(userId, title, body, data);

    console.log("Order assigned successfully");
    res.status(200).json(updatedOrder);
  } catch (error) {
    console.error("Error assigning order to user:", error.message);
    console.error(error.stack);
    res.status(500).json({ message: error.message });
  }
};

const filterOrdersByUserId = async (req, res) => {
  try {
    const { userId, type, action } = req.body; // Extract userId, type, and action from the request body

    // Define query filters
    const statusFilter =
      type === 'upcoming'
        ? { orderStatus: 'Pending' }
        : { orderStatus: { $in: ['Rejected', 'Completed', 'Cancelled'] } };

    const userFilter =
      action === 'sell'
        ? { orderBy: userId }
        : action === 'purchase'
        ? { orderTo: userId }
        : {};

    // Combine filters
    const query = { ...statusFilter, ...userFilter };

    // Fetch filtered orders and populate necessary fields
    const orders = await b2cOrder.find(query)
      .populate('orderBy', 'firstName lastName email')
      .populate('orderTo', 'name email')
      .populate('location', 'address city state googleAddress')
      .exec();

    if (!orders.length) {
      return res.status(404).json({ message: 'No orders found for the specified criteria.' });
    }

    res.status(200).json(orders);
  } catch (error) {
    console.error('Error filtering orders:', error.message);
    res.status(500).json({ message: 'An error occurred while filtering orders.' });
  }
};

const getNewOrdersForUser = async (req, res) => {
  try {
    const { userId, period } = req.body; 

    let startDate;
    const now = new Date();

    switch (period) {
      case 'today':
        startDate = moment().startOf('day').toDate();
        break;
      case 'last week':
        startDate = moment().subtract(1, 'week').startOf('day').toDate();
        break;
      case 'last month':
        startDate = moment().subtract(1, 'month').startOf('day').toDate();
        break;
      case 'last 3 months':
        startDate = moment().subtract(3, 'months').startOf('day').toDate();
        break;
      case 'last 6 months':
        startDate = moment().subtract(6, 'months').startOf('day').toDate();
        break;
      case 'all':
      default:
        startDate = null; // No date filter
    }

    // Build the query with optional date filter
    const query = {
      $or: [
        { orderBy: userId },
        { orderTo: userId },
      ],
      orderStatus: 'New',
    };

    if (startDate) {
      query.createdAt = { $gte: startDate, $lte: now };
    }

    // Fetch orders based on the query
    const orders = await b2cOrder.find(query)
      .populate('orderBy', 'firstName lastName email')
      .populate('orderTo', 'name email')
      .populate('location', 'address city state googleAddress')
      .exec();

    if (!orders.length) {
      return res.status(404).json({ message: 'No new orders found for this user.' });
    }

    res.status(200).json(orders);
  } catch (error) {
    console.error('Error fetching new orders:', error.message);
    res.status(500).json({ message: 'An error occurred while fetching new orders.' });
  }
};

const updateOrderStatus = async (req, res) => {
  try {
    const { orderId, status } = req.body; // Extract new status from request body

    // Validate the status value against allowed statuses
    const allowedStatuses = ['New', 'Pending', 'Rejected', 'Completed', 'Cancelled'];
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid order status.' });
    }

    // Find the order by ID and update the status
    const updatedOrder = await b2cOrder.findByIdAndUpdate(
      orderId,
      { orderStatus: status },
      { new: true } // Return the updated document
    );

    if (!updatedOrder) {
      return res.status(404).json({ message: 'Order not found.' });
    }

    const notificationMessage = `Order status updated: ${updatedOrder.orderNo}`;

    const newNotification = new B2CNotification({
      notification: notificationMessage,
      orderId: updatedOrder._id,
      orderBy: updatedOrder.orderBy,
      orderTo: updatedOrder.orderTo,
      orderNo: updatedOrder.orderNo,
      orderStatus: updatedOrder.orderStatus,
      totalPrice: updatedOrder.totalPrice,
    });

    await newNotification.save();

    const title = 'Order updated';
    const body = `Total Amount: ${updatedOrder.totalPrice}`;
    const data = { orderId: updatedOrder._id };

    // Send notification to the user who created the order
    await sendNotificationByUserId(updatedOrder.orderBy, title, body, data);
    await sendNotificationByUserId(updatedOrder.orderTo, title, body, data);

    res.status(200).json({
      status: "updated",
      message: 'Order status updated successfully.',
    });
  } catch (error) {
    console.error('Error updating order status:', error.message);
    res.status(500).json({ message: 'An error occurred while updating order status.' });
  }
};



export {
  createB2cOrder,
  getB2cAllOrders,
  getB2cOrderById,
  updateB2cOrder,
  deleteB2cOrder,
  getB2cOrdersByUserId,
  assignOrderToUser,
  filterOrdersByUserId,
  getNewOrdersForUser,
  updateOrderStatus,
};
