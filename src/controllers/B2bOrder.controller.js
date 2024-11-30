import Order from "../models/B2bOrder.model.js";
import B2BUser from "../models/b2bUser.modal.js";
import B2BAddress from "../models/b2buserAddress.model.js";

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

    const userHasCategory = requestingUser.category.some(
      (category) => category.name === categoryName
    );

    // Determine the target role based on the requesting user's role
    const roleFlow = {
      Retailer: 'Wholesaler',
      Wholesaler: userHasCategory ? 'Mediator' : 'Wholesaler',
      Mediator:'Factory',
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
      addresses = addresses.filter((address) => address.city === city);
    }

    // Prepare the response combining user and address data
    const response = filteredUsers.map((user) => ({
      ...user,
      addresses: addresses.filter((address) => address.userId.toString() === user._id.toString()),
    }));

    res.status(200).json({
      success: true,
      data: response,
      role:targetRole
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

    // Fetch user address
    const userAddresses = await B2BAddress.find({ userId });

    // Filter category and subcategory data
    const filteredCategory = user.category
      .filter((category) => category._id.toString() === categoryId)
      .map((category) => ({
        ...category,
        sub_category: category.sub_category.filter(
          (sub) => sub._id.toString() === subCategoryId
        ),
      }))
      .find((category) => category.sub_category.length > 0); // Ensure at least one matching subcategory

    if (!filteredCategory) {
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
        phone: user.phone,
        registerAs: user.registerAs,
        businessName: user.businessName,
      },
      addresses: userAddresses,
      category: filteredCategory,
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
      .populate('orderBy', 'name email') // Populate orderBy with selected fields
      .populate('orderTo', 'name email') // Populate orderTo with selected fields
      .populate('location', 'address city state') // Populate location with selected fields
      .populate('category', 'name description') // Populate category with selected fields
      .populate('subCategory', 'name description').exec(); // Populate subCategory with selected fields

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
        : { orderStatus: { $in: ['Rejected', 'Completed'] } };

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
      .populate('category', 'name description')
      .populate('subCategory', 'name description').exec();

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
    const { userId } = req.params; // Extract userId from request parameters

    // Fetch orders where orderTo matches userId and orderStatus is 'New'
    const orders = await Order.find({ orderTo: userId, orderStatus: 'New' })
      .populate('orderBy', 'name email')
      .populate('orderTo', 'name email')
      .populate('location', 'address city state')
      .populate('category', 'name description')
      .populate('subCategory', 'name description').exec();

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
    const allowedStatuses = ['New', 'Pending', 'Accepted', 'Rejected', 'Completed'];
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
  updateOrderStatus
};
