import express from 'express';
import { createMarketRates, getAllMarketRates, getMarketRatesbyId, updateMarketRates, deleteMarketRates } from '../../controllers/marketRates.controller.js';

const router = express.Router();

// Routes
router.post('/', createMarketRates);
router.get('/', getAllMarketRates);
router.get('/:id', getMarketRatesbyId);
router.patch('/:id', updateMarketRates);
router.delete('/:id', deleteMarketRates);

export default router;


/**
 * @swagger
 * tags:
 *   name: MarketRates
 *   description: Market Rates management and retrieval
 */

/**
 * @swagger
 * /marketRates:
 *   post:
 *     summary: Create a new Market Rate
 *     description: Create a new Market Rate by providing the necessary details.
 *     tags: [MarketRates]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - category
 *               - date
 *               - time
 *               - price
 *             properties:
 *               name:
 *                 type: string
 *                 description: Name of the event
 *               category:
 *                 type: string
 *                 description: Category of the event
 *               date:
 *                 type: string
 *                 format: date
 *                 description: Date of the event
 *               time:
 *                 type: string
 *                 description: Time of the event
 *               price:
 *                 type: number
 *                 description: Price of the event
 *             example:
 *               name: "Market Event"
 *               category: "Electronics"
 *               date: "2024-11-22"
 *               time: "10:00 AM"
 *               price: 100
 *     responses:
 *       "201":
 *         description: Market Rate created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MarketRate'
 *       "400":
 *         $ref: '#/components/responses/InvalidInput'
 *       "500":
 *         $ref: '#/components/responses/ServerError'
 *
 *   get:
 *     summary: Get all Market Rates
 *     description: Retrieve a list of all Market Rates.
 *     tags: [MarketRates]
 *     responses:
 *       "200":
 *         description: List of Market Rates
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/MarketRate'
 *       "500":
 *         $ref: '#/components/responses/ServerError'
 */

/**
 * @swagger
 * /marketRates/{id}:
 *   get:
 *     summary: Get a specific Market Rate by ID
 *     description: Retrieve a Market Rate by its unique ID.
 *     tags: [MarketRates]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Market Rate ID
 *     responses:
 *       "200":
 *         description: Market Rate found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MarketRate'
 *       "404":
 *         $ref: '#/components/responses/NotFound'
 *       "500":
 *         $ref: '#/components/responses/ServerError'
 *
 *   patch:
 *     summary: Update a Market Rate by ID
 *     description: Update a Market Rate using its ID.
 *     tags: [MarketRates]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Market Rate ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               category:
 *                 type: string
 *               date:
 *                 type: string
 *                 format: date
 *               time:
 *                 type: string
 *               price:
 *                 type: number
 *             example:
 *               name: "Updated Market Event"
 *               category: "Updated Electronics"
 *               date: "2024-11-23"
 *               time: "11:00 AM"
 *               price: 120
 *     responses:
 *       "200":
 *         description: Market Rate updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MarketRate'
 *       "400":
 *         $ref: '#/components/responses/InvalidInput'
 *       "404":
 *         $ref: '#/components/responses/NotFound'
 *       "500":
 *         $ref: '#/components/responses/ServerError'
 *
 *   delete:
 *     summary: Delete a Market Rate by ID
 *     description: Delete a Market Rate using its ID.
 *     tags: [MarketRates]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Market Rate ID
 *     responses:
 *       "200":
 *         description: Market Rate deleted successfully
 *       "404":
 *         $ref: '#/components/responses/NotFound'
 *       "500":
 *         $ref: '#/components/responses/ServerError'
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     MarketRate:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           description: Unique identifier for the Market Rate
 *         name:
 *           type: string
 *           description: Name of the event
 *         category:
 *           type: string
 *           description: Category of the event
 *         date:
 *           type: string
 *           format: date
 *           description: Date of the event
 *         time:
 *           type: string
 *           description: Time of the event
 *         price:
 *           type: number
 *           description: Price of the event
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Timestamp when the Market Rate was created
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: Timestamp when the Market Rate was last updated
 *       example:
 *         id: "63b8e5b934e3e3f7d4a1c6f5"
 *         name: "Market Event"
 *         category: "Electronics"
 *         date: "2024-11-22"
 *         time: "10:00 AM"
 *         price: 100
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
