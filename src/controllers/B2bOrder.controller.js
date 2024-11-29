import Order from "../models/B2bOrder.model.js";
import B2BUser from "../models/b2bUser.modal.js";
import B2BAddress from "../models/b2buserAddress.model.js";

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

    // Determine the target role based on the requesting user's role
    const roleFlow = {
      Retailer: 'Wholesaler',
      Wholesaler: 'Mediator',
      Factory: 'Factory',
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

    // Filter users based on category and subcategory
    const filteredUsers = targetUsers.filter((user) => {
      return user.category.some(
        (category) =>
          category.name === categoryName &&
          category.sub_category.some((sub) => sub.name === subCategoryName)
      );
    });

    // Retrieve addresses for the filtered users
    const userIds = filteredUsers.map((user) => user._id);
    let addresses = await B2BAddress.find({ userId: { $in: userIds } });

    // Apply city filter if provided
    if (city) {
      addresses = addresses.filter((address) => address.city === city);
    }

    // Prepare the response combining user and address data
    const response = filteredUsers.map((user) => ({
      ...user.toObject(),
      addresses: addresses.filter((address) => address.userId.toString() === user._id.toString()),
    }));

    res.status(200).json({
      success: true,
      data: response,
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

export {
  createOrder,
  getAllOrders,
  getOrderById,
  updateOrder,
  deleteOrder,
  getOrdersByUserId,
  getFilteredUsersByRole
};
