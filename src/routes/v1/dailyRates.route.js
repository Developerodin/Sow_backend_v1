import express from 'express';
import {
  createDailyRate,
  getDailyRates,
  deleteDailyRate,
} from '../../controllers/dailyRates.controller.js';

const router = express.Router();

// Routes
router.post('/', createDailyRate);
router.get('/', getDailyRates);
router.delete('/:id', deleteDailyRate);

export default router;

/**
 * @swagger
 * tags:
 *   name: DailyRates
 *   description: Daily Rates management and retrieval
 */

/**
 * @swagger
 * /dailyRates:
 *   post:
 *     summary: Create a new Daily Rate
 *     description: Create a new Daily Rate by providing the necessary details.
 *     tags: [DailyRates]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - text
 *               - date
 *             properties:
 *               name:
 *                 type: string
 *                 description: Name of the event
 *               text:
 *                 type: string
 *                 description: Text description of the event
 *               date:
 *                 type: string
 *                 format: date
 *                 description: Date of the event
 *               status:
 *                 type: boolean
 *                 description: Status of the event
 *             example:
 *               name: "Daily Event"
 *               text: "Description of the daily event"
 *               date: "2024-11-22"
 *               status: true
 *     responses:
 *       "201":
 *         description: Daily Rate created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DailyRate'
 *       "400":
 *         $ref: '#/components/responses/InvalidInput'
 *       "500":
 *         $ref: '#/components/responses/ServerError'
 *
 *   get:
 *     summary: Get all Daily Rates
 *     description: Retrieve a list of all Daily Rates.
 *     tags: [DailyRates]
 *     responses:
 *       "200":
 *         description: List of Daily Rates
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/DailyRate'
 *       "500":
 *         $ref: '#/components/responses/ServerError'
 */

/**
 * @swagger
 * /dailyRates/{id}:
 *   delete:
 *     summary: Delete a Daily Rate by ID
 *     description: Delete a Daily Rate using its ID.
 *     tags: [DailyRates]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Daily Rate ID
 *     responses:
 *       "200":
 *         description: Daily Rate deleted successfully
 *       "404":
 *         $ref: '#/components/responses/NotFound'
 *       "500":
 *         $ref: '#/components/responses/ServerError'
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     DailyRate:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           description: Unique identifier for the Daily Rate
 *         name:
 *           type: string
 *           description: Name of the event
 *         text:
 *           type: string
 *           description: Text description of the event
 *         date:
 *           type: string
 *           format: date
 *           description: Date of the event
 *         status:
 *           type: boolean
 *           description: Status of the event
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Timestamp when the Daily Rate was created
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: Timestamp when the Daily Rate was last updated
 *       example:
 *         id: "63b8e5b934e3e3f7d4a1c6f5"
 *         name: "Daily Event"
 *         text: "Description of the daily event"
 *         date: "2024-11-22"
 *         status: true
 *         createdAt: "2024-11-22T10:30:00Z"
 *         updatedAt: "2024-11-22T10:30:00Z"
 * 
 *   responses:
 *     InvalidInput:
 *       description: Invalid input
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               message:
 *                 type: string
 *                 example: "Invalid input"
 *     NotFound:
 *       description: Not Found
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               message:
 *                 type: string
 *                 example: "Not Found"
 *     ServerError:
 *       description: Server error
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               message:
 *                 type: string
 *                 example: "Internal server error"
 */