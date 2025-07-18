import Notification from "../models/b2bNotification.js";



 export const createNotification = async (req, res) => {
  try {
    const { notification, orderId, orderBy, orderTo, orderNo, orderStatus  } = req.body;

    if (!notification || !orderId || !orderBy || !orderTo || !orderNo) {
      return res.status(400).json({ message: 'All fields are required.' });
    }

    const newNotification = new Notification({
      notification,
      orderId,
      orderBy,
      orderTo,
      orderNo,
    });

    await newNotification.save();
    res.status(201).json({ message: 'Notification created successfully.', notification: newNotification });
  } catch (error) {
    console.error('Error creating notification:', error);
    res.status(500).json({ message: 'Server error.' });
  }
};

 export const deleteNotification = async (req, res) => {
    try {
      const { notificationId } = req.params;
  
      await Notification.findByIdAndDelete(notificationId);
  
      res.status(200).json({ message: 'Notification deleted successfully.' });
    } catch (error) {
      console.error('Error deleting notification:', error);
      res.status(500).json({ message: 'Server error.' });
    }
  };
  
 export const markNotificationAsRead = async (req, res) => {
    try {
      const { notificationId, userId } = req.body;
  
      const notification = await Notification.findById(notificationId);
      if (!notification) {
        return res.status(404).json({ message: 'Notification not found.' });
      }
  
      if (notification.orderBy.toString() === userId) {
        notification.isReadByOrderBy = true;
      }
      if (notification.orderTo.toString() === userId) {
        notification.isReadByOrderTo = true;
      }
  
      await notification.save();
      res.status(200).json({ message: 'Notification marked as read.', notification });
    } catch (error) {
      console.error('Error marking notification as read:', error);
      res.status(500).json({ message: 'Server error.' });
    }
  };

 export const getNotificationsForUser = async (req, res) => {
    try {
      const { userId } = req.params;
  
      const notifications = await Notification.find({
        $or: [{ orderBy: userId }, { orderTo: userId }],
      })
        .populate('orderBy', 'name email')
        .populate('orderTo', 'name email')
        .sort({ createdAt: -1 });
  
      res.status(200).json(notifications);
    } catch (error) {
      console.error('Error fetching user notifications:', error);
      res.status(500).json({ message: 'Server error.' });
    }
  };

  export const markNotificationsAsRead = async (req, res) => {
    try {
      const { userId } = req.params;
  
      // Update notifications where the user is the sender (orderBy)
      await Notification.updateMany(
        { orderBy: userId, isReadByOrderBy: false },
        { $set: { isReadByOrderBy: true } }
      );
  
      // Update notifications where the user is the recipient (orderTo)
      await Notification.updateMany(
        { orderTo: userId, isReadByOrderTo: false },
        { $set: { isReadByOrderTo: true } }
      );
  
      res.status(200).json({ message: 'Notifications marked as read successfully.' });
    } catch (error) {
      console.error('Error marking notifications as read:', error);
      res.status(500).json({ message: 'Server error.' });
    }
  };

  export const getUnreadNotificationsCount = async (req, res) => {
    try {
      const { userId } = req.params;
  
      // Count unread notifications for the user
      const unreadCount = await Notification.countDocuments({
        $or: [
          { orderBy: userId, isReadByOrderBy: false }, // Unread for orderBy
          { orderTo: userId, isReadByOrderTo: false }, // Unread for orderTo
        ],
      });
  
      res.status(200).json({ unreadCount });
    } catch (error) {
      console.error('Error fetching unread notifications count:', error);
      res.status(500).json({ message: 'Server error.' });
    }
  };

  export const getNotifications = async (req, res) => {
    try {
      const notifications = await Notification.find()
        .populate('orderBy', 'name email')
        .populate('orderTo', 'name email')
        .sort({ createdAt: -1 });
  
      res.status(200).json(notifications);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      res.status(500).json({ message: 'Server error.' });
    }
  };
  


  
  