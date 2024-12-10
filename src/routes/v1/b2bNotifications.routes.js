import express from 'express';
import { createNotification, deleteNotification, getNotifications, getNotificationsForUser, getUnreadNotificationsCount, markNotificationAsRead, markNotificationsAsRead } from '../../controllers/b2bNotification.controller.js';


const router = express.Router();

router.post('/', createNotification);
router.get('/', getNotifications);
router.get('/:userId', getNotificationsForUser);
router.get('/count/:userId', getUnreadNotificationsCount);
router.get('/mark-read/:userId', markNotificationsAsRead);
router.patch('/read', markNotificationAsRead);
router.delete('/:notificationId', deleteNotification);

export default router;
