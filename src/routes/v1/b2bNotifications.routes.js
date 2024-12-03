import express from 'express';
import { createNotification, deleteNotification, getNotifications, getNotificationsForUser, markNotificationAsRead } from '../../controllers/b2bNotification.controller.js';


const router = express.Router();

router.post('/', createNotification);
router.get('/', getNotifications);
router.get('/:userId', getNotificationsForUser);
router.patch('/read', markNotificationAsRead);
router.delete('/:notificationId', deleteNotification);

export default router;
