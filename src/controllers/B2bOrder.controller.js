import Notification from "../models/b2bNotification.js";
import Order from "../models/B2bOrder.model.js";
import B2BUser from "../models/b2bUser.modal.js";
import B2BAddress from "../models/b2buserAddress.model.js";
import moment from "moment";
import { sendNotificationByUserId } from "./pushNotifications.controller.js";
// Create a new order
const createOrder = async (req, res) => {
  try {
    const {
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
    const otp = Math.floor(1000 + Math.random() * 9000);
    const images = photos !== "" ? JSON.parse(photos) : [] || []
    // Create the new order object without orderNo (it will be generated automatically)
    const newOrder = new Order({
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
      photos:images,
      orderStatus,
      otp
    });

    await newOrder.save();
    const notificationMessage = `A new order has been created: ${newOrder.orderNo}`;

    const newNotification = new Notification({
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
    await sendNotificationByUserId(orderBy, title, body, data);
    await sendNotificationByUserId(orderTo, title, body, data);

    res.status(201).json(newOrder);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get all orders
const getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find()
      // .populate("category", "name")
      .populate("orderBy", "name registerAs phoneNumber")
      .populate("orderTo", "name registerAs phoneNumber")
      .populate("location", "googleAddress")
      // .populate("subCategory", "name");

    res.status(200).json(orders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get order by ID
const getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      
      .populate("orderBy", "name registerAs phoneNumber")
      .populate("orderTo", "name registerAs phoneNumber")
      .populate("location", "googleAddress")
      

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
      .populate("location", "googleAddress")
      .populate("orderBy", "name registerAs")
      .populate("orderTo", "name registerAs");

    if (orders.length === 0) {
      return res.status(404).json({ message: "No orders found for this user" });
    }

    res.status(200).json(orders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


const getFilteredUsersByRole = async (req, res) => {
  try {
    const { userId, categoryName, subCategoryName, city } = req.body;

    // Validate input
    if (!userId || !categoryName || !subCategoryName) {
      return res.status(400).json({
        success: false,
        message: 'userId, categoryName, and subCategoryName are required',
      });
    }

    // Find the requesting user
    const requestingUser = await B2BUser.findById(userId);
    if (!requestingUser) {
      return res.status(404).json({
        success: false,
        message: 'Requesting user not found',
      });
    }

    const userHasCategory = requestingUser.category.some(
      (category) => category.name === categoryName
    );

    // Determine the target role based on the requesting user's role
    const roleFlow = {
      Retailer: 'Wholesaler',
      Wholesaler: userHasCategory ? 'Mediator' : 'Wholesaler',
      Mediator: 'Factory',
      Factory: userHasCategory ? 'Factory' : 'Wholesaler',
    };

    const targetRole = roleFlow[requestingUser.registerAs];
    if (!targetRole) {
      return res.status(403).json({
        success: false,
        message: `No data available for users with role: ${requestingUser.registerAs}`,
      });
    }

    // Fetch users matching the target role
    const targetUsers = await B2BUser.find({
      registerAs: targetRole,
    });

    // Filter users and their categories based on category and subcategory
    const filteredUsers = targetUsers
      .map((user) => {
        const filteredCategories = user.category
          .filter((category) => category.name === categoryName)
          .map((category) => ({
            ...category,
            sub_category: category.sub_category.filter((sub) => sub.name === subCategoryName),
          }))
          .filter((category) => category.sub_category.length > 0); // Keep only categories with matching subcategories

        if (filteredCategories.length > 0) {
          return {
            ...user.toObject(),
            category: filteredCategories,
          };
        }
        return null;
      })
      .filter(Boolean); // Remove null values

    // Retrieve addresses for the filtered users
    const userIds = filteredUsers.map((user) => user._id);
    let addresses = await B2BAddress.find({ userId: { $in: userIds } });

    // Apply city filter if provided
    if (city) {
      console.log(`City provided: ${city}. Filtering addresses by city.`);
      addresses = addresses.filter((address) => address.city === city);
    } else {
      console.log('No city provided. Skipping city filter.');
    }

    // Prepare the response combining user and address data
    const response = filteredUsers.map((user) => ({
      ...user,
      addresses: addresses.filter((address) => address.userId.toString() === user._id.toString()),
    }));

    res.status(200).json({
      success: true,
      data: response,
      role: targetRole,
    });
  } catch (error) {
    console.error('Error fetching filtered users with addresses:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while processing your request',
      error: error.message,
    });
  }
};

const getUserDetailsWithCategoryAndSubCategory = async (req, res) => {
  try {
    const { userId, categoryId, subCategoryId } = req.body;

    // Validate input
    if (!userId || !categoryId || !subCategoryId) {
      return res.status(400).json({
        success: false,
        message: 'userId, categoryId, and subCategoryId are required',
      });
    }

    // Fetch user details
    const user = await B2BUser.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Fetch user addresses (if applicable)
    const userAddresses = await B2BAddress.find({ userId, activeAddress:true });

    // Filter category and subcategory data
    const filteredCategory = user.category
      .filter((category) => category._id.toString() === categoryId)
      .map((category) => {
        const subCategory = category.sub_category.find(
          (sub) => sub._id.toString() === subCategoryId
        );

        // Return the category with the filtered subcategory
        return subCategory
          ? { ...category.toObject(), sub_category: [subCategory] }
          : null;
      })
      .filter((category) => category !== null); // Remove null values if no subcategory matches

    if (filteredCategory.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Category or subcategory not found for the user',
      });
    }

    // Prepare the response
    const response = {
      userDetails: {
        name: user.name,
        email: user.email,
        phoneNumber: user.phoneNumber,
        registerAs: user.registerAs,
        businessName: user.businessName,
      },
      addresses: userAddresses,
      category: filteredCategory[0], // Since it's filtered by categoryId and subCategoryId
    };

    res.status(200).json({
      success: true,
      data: response,
    });
  } catch (error) {
    console.error('Error fetching user details with category and subcategory:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while processing your request',
      error: error.message,
    });
  }
};


const getUserOrdersById = async (req, res) => {
  try {
    const { userId } = req.params; // Extract user ID from request parameters

    // Find all orders where orderBy matches the userId
    const orders = await Order.find({ orderBy: userId })
      .populate('orderBy', 'name email phoneNumber') // Populate orderBy with selected fields
      .populate('orderTo', 'name email phoneNumber') // Populate orderTo with selected fields
      .populate('location', 'address city state') // Populate location with selected fields
      .exec(); // Populate subCategory with selected fields

    if (!orders.length) {
      return res.status(404).json({ message: 'No orders found for this user.' });
    }

    res.status(200).json(orders);
  } catch (error) {
    console.error('Error fetching orders:', error.message);
    res.status(500).json({ message: 'An error occurred while fetching orders.' });
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
    const orders = await Order.find(query)
      .populate('orderBy', 'name email')
      .populate('orderTo', 'name email')
      .populate('location', 'address city state')
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
    const { userId,period } = req.body; 
   

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
    const orders = await Order.find(query)
      .populate('orderBy', 'name email')
      .populate('orderTo', 'name email')
      .populate('location', 'address city state')
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
    const { orderId,status } = req.body; // Extract new status from request body

    // Validate the status value against allowed statuses
    const allowedStatuses = ['New', 'Pending', 'Rejected', 'Completed', 'Cancelled'];
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid order status.' });
    }

    // Find the order by ID and update the status
    const updatedOrder = await Order.findByIdAndUpdate(
      orderId,
      { orderStatus: status },
      { new: true } // Return the updated document
    )

    if (!updatedOrder) {
      return res.status(404).json({ message: 'Order not found.' });
    }
    const notificationMessage = `Order status updated: ${updatedOrder.orderNo}`;

    const newNotification = new Notification({
      notification: notificationMessage,
      orderId: updatedOrder._id,
      orderBy:updatedOrder.orderBy,
      orderTo:updatedOrder.orderTo,
      orderNo: updatedOrder.orderNo,
      orderStatus : updatedOrder.orderStatus,
      totalPrice: updatedOrder.totalPrice
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


const verifyOtpAndCompleteOrder = async (req, res) => {
  try {
    const { orderId, otp } = req.body;

   
    if (!orderId || !otp) {
      return res.status(400).json({ message: 'Order ID and OTP are required.' });
    }

    // Find the order by ID
    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({ message: 'Order not found.' });
    }

    // Check if the provided OTP matches the order's OTP
    if (order.otp !== otp) {
      return res.status(400).json({ message: 'Invalid OTP.' });
    }

    // Update the order status to 'Completed'
    order.orderStatus = 'Completed';
    await order.save();
    const notificationMessage = `order status updated: ${order.orderNo}`;

    const newNotification = new Notification({
      notification: notificationMessage,
      orderId: order._id,
      orderBy: order.orderBy,
      orderTo: order.orderTo,
      orderNo: order.orderNo,
      orderStatus : order.orderStatus,
      totalPrice: order.totalPrice
    });

    await newNotification.save();

    const title = 'Order completed successfully';
    const body = `Total Amount: ${order.totalPrice}`;
    const data = { orderId: order._id };

    // Send notification to the user who created the order
    await sendNotificationByUserId(order.orderBy, title, body, data);
    await sendNotificationByUserId(order.orderTo, title, body, data);
    res.status(200).json({
      message: 'Order status updated to Completed successfully.',
      order,
    });
  } catch (error) {
    console.error('Error verifying OTP and updating order status:', error);
    res.status(500).json({ message: 'Server error. Please try again later.' });
  }
};

const getUserSaleSummary = async (req, res) => {
  try {
    const { userId } = req.params;

    // Fetch all orders related to the user (both `orderBy` and `orderTo`)
    const userOrders = await Order.find({
      $or: [{ orderBy: userId }, { orderTo: userId }],
    });

    // Initialize totals
    let netAmountEarned = 0;
    let netScrapSold = 0;
    let netScrapPending = 0;
    let netScrapPurchased = 0;

    // Calculate based on the order status
    userOrders.forEach((order) => {
      if (order.orderTo.toString() === userId) {
        // Purchases made by the user
        netScrapPurchased += parseFloat(order.weight || 0);

        // Earnings for orders received (if applicable)
        netAmountEarned += order.totalPrice;
      }

      if (order.orderBy.toString() === userId) {
        // Scrap sold by the user
        if (order.orderStatus === "Completed") {
          netScrapSold += parseFloat(order.weight || 0);
        }

        // Scrap pending by the user
        if (order.orderStatus === "Pending") {
          netScrapPending += parseFloat(order.weight || 0);
        }
      }
    });

    // Return the calculated summary
    res.status(200).json({
      success: true,
      data: {
        netAmountEarned,
        netScrapSold,
        netScrapPending,
        netScrapPurchased,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Error fetching user sale summary",
      error: error.message,
    });
  }
};



export {
  createOrder,
  getAllOrders,
  getOrderById,
  updateOrder,
  deleteOrder,
  getOrdersByUserId,
  getFilteredUsersByRole,
  getUserDetailsWithCategoryAndSubCategory,
  getUserOrdersById,
  filterOrdersByUserId,
  getNewOrdersForUser,
  updateOrderStatus,
  verifyOtpAndCompleteOrder,
  getUserSaleSummary
};
