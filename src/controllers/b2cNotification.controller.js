import B2CNotification from '../models/b2cNotification.js';

export const createNotificationB2C = async (req, res) => {
  try {
    const { notification, orderId, orderBy, orderTo, orderNo, orderStatus } = req.body;

    if (!notification || !orderId || !orderBy || !orderTo || !orderNo) {
      return res.status(400).json({ message: 'All fields are required.' });
    }

    const newNotification = new B2CNotification({
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

export const deleteNotificationB2C = async (req, res) => {
  try {
    const { notificationId } = req.params;

    await B2CNotification.findByIdAndDelete(notificationId);

    res.status(200).json({ message: 'Notification deleted successfully.' });
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({ message: 'Server error.' });
  }
};

export const markNotificationAsReadB2C = async (req, res) => {
  try {
    const { notificationId, userId } = req.body;

    const notification = await B2CNotification.findById(notificationId);
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

export const getNotificationsForUserB2C = async (req, res) => {
  try {
    const { userId } = req.params;

    const notifications = await B2CNotification.find({
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

export const markNotificationsAsReadB2C = async (req, res) => {
  try {
    const { userId } = req.params;

    // Update notifications where the user is the sender (orderBy)
    await B2CNotification.updateMany({ orderBy: userId, isReadByOrderBy: false }, { $set: { isReadByOrderBy: true } });

    // Update notifications where the user is the recipient (orderTo)
    await B2CNotification.updateMany({ orderTo: userId, isReadByOrderTo: false }, { $set: { isReadByOrderTo: true } });

    res.status(200).json({ message: 'Notifications marked as read successfully.' });
  } catch (error) {
    console.error('Error marking notifications as read:', error);
    res.status(500).json({ message: 'Server error.' });
  }
};

export const getUnreadNotificationsCountB2C = async (req, res) => {
  try {
    const { userId } = req.params;

    // Count unread notifications for the user
    const unreadCount = await B2CNotification.countDocuments({
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

export const getNotificationsB2C = async (req, res) => {
  try {
    const notifications = await B2CNotification.find()
      .populate('orderBy', 'name email')
      .populate('orderTo', 'name email')
      .sort({ createdAt: -1 });

    res.status(200).json(notifications);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ message: 'Server error.' });
  }
};
