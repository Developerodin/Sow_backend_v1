import express from 'express';
import { createNotificationB2C, deleteNotificationB2C, getNotificationsB2C, getNotificationsForUserB2C, getUnreadNotificationsCountB2C, markNotificationAsReadB2C, markNotificationsAsReadB2C } from '../../controllers/b2cNotification.controller.js';



const router = express.Router();

router.post('/', createNotificationB2C);
router.get('/', getNotificationsB2C);
router.get('/:userId', getNotificationsForUserB2C);
router.get('/count/:userId', getUnreadNotificationsCountB2C);
router.get('/mark-read/:userId', markNotificationsAsReadB2C);
router.patch('/read', markNotificationAsReadB2C);
router.delete('/:notificationId', deleteNotificationB2C);

export default router;
