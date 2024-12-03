
import axios from 'axios';
import B2BUser from "../models/b2bUser.modal.js";

export const sendPushNotification = async (token, title, body, data) => {
  const payload = {
    to: token,
    sound: "default",
    title: title,
    body: body,
    data: data,
  };

  try {
    const response = await axios.post('https://exp.host/--/api/v2/push/send', payload, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    console.log('Notification sent successfully:', response.data);
  } catch (error) {
    console.error('Error sending notification:', error.response ? error.response.data : error.message);
  }
};

// Function to send a push notification by user ID
export const sendNotificationByUserId = async (userId, title, body, data) => {
  try {
    // Find the user by ID
    const user = await B2BUser.findById(userId);

    if (!user || !user.notificationToken) {
      throw new Error('User not found or notification token is missing');
    }

    // Send the push notification using the user's notification token
    await sendPushNotification(user.notificationToken, title, body, data);
  } catch (error) {
    console.error('Error sending notification by user ID:', error.message);
  }
};


export const sendNotificationToAllUsers = async (title, body, data) => {
    try {
      // Retrieve all users with a notification token
      const users = await B2BUser.find({ notificationToken: { $ne: null } });
  
      // Loop through each user and send a notification
      for (const user of users) {
        await sendPushNotification(user.notificationToken, title, body, data);
      }
  
      console.log('Notifications sent to all users successfully');
    } catch (error) {
      console.error('Error sending notifications to all users:', error.message);
    }
  };