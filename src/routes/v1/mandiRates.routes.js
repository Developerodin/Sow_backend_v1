import express from 'express';
import {
  saveCategoryPrices,
  updateCategoryPrice,
  deleteCategoryPrice,
  getAllData,
  getPriceDifference,
  getMandiHistory,
  getCategoryHistory,
  getHistoryByTimeframe,
  getMandiByCategory,
  saveOrUpdateMandiCategoryPrices,
} from '../../controllers/mandiRates.controller.js';

const router = express.Router();

// Routes
router.post('/', saveCategoryPrices);
router.post('/mandi-prices', saveOrUpdateMandiCategoryPrices);
router.patch('/:mandiId/:category', updateCategoryPrice);
router.delete('/:mandiId/:category', deleteCategoryPrice);
router.get('/', getAllData);
router.get('/difference/:mandiId/:category', getPriceDifference);
router.get('/history/mandi/:mandiId', getMandiHistory);
router.get('/history/category/:mandiId/:category', getCategoryHistory);
router.get('/history/timeframe/:mandiId/:category/:timeframe', getHistoryByTimeframe);
router.get('/mandi/category/:category', getMandiByCategory);

export default router;

/**
 * @swagger
 * tags:
 *   name: MandiRates
 *   description: Mandi Rates management and retrieval
 */

/**
 * @swagger
 * /mandiRates:
 *   post:
 *     summary: Save category prices
 *     description: Save category prices for a Mandi.
 *     tags: [MandiRates]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - mandi
 *               - categoryPrices
 *             properties:
 *               mandi:
 *                 type: string
 *                 description: ID of the Mandi
 *               categoryPrices:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     category:
 *                       type: string
 *                       description: Category name
 *                     price:
 *                       type: number
 *                       description: Price of the category
 *                     time:
 *                       type: string
 *                       description: Time in Indian 12-hour format (e.g., "10:30 AM", "03:45 PM")
 *             example:
 *               mandi: "63b8e5b934e3e3f7d4a1c6f5"
 *               categoryPrices:
 *                 - category: "Vegetables"
 *                   price: 100
 *                   time: "10:30 AM"
 *                 - category: "Fruits"
 *                   price: 150
 *                   time: "03:45 PM"
 *     responses:
 *       "201":
 *         description: Category prices saved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MandiCategoryPrice'
 *       "400":
 *         $ref: '#/components/responses/InvalidInput'
 *       "500":
 *         $ref: '#/components/responses/ServerError'
 *
 *   get:
 *     summary: Get all Mandi rates data
 *     description: Retrieve all Mandi rates data.
 *     tags: [MandiRates]
 *     responses:
 *       "200":
 *         description: List of all Mandi rates data
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/MandiCategoryPrice'
 *       "500":
 *         $ref: '#/components/responses/ServerError'
 */

/**
 * @swagger
 * /mandiRates/{mandiId}/{category}:
 *   patch:
 *     summary: Update category price
 *     description: Update the price of a category for a specific Mandi.
 *     tags: [MandiRates]
 *     parameters:
 *       - in: path
 *         name: mandiId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the Mandi
 *       - in: path
 *         name: category
 *         required: true
 *         schema:
 *           type: string
 *         description: Category name
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               price:
 *                 type: number
 *                 description: Updated price of the category
 *               time:
 *                 type: string
 *                 description: Time in Indian 12-hour format (e.g., "10:30 AM", "03:45 PM")
 *             example:
 *               price: 120
 *               time: "12:00 PM"
 *     responses:
 *       "200":
 *         description: Category price updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MandiCategoryPrice'
 *       "400":
 *         $ref: '#/components/responses/InvalidInput'
 *       "404":
 *         $ref: '#/components/responses/NotFound'
 *       "500":
 *         $ref: '#/components/responses/ServerError'
 *
 *   delete:
 *     summary: Delete category price
 *     description: Delete the price of a category for a specific Mandi.
 *     tags: [MandiRates]
 *     parameters:
 *       - in: path
 *         name: mandiId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the Mandi
 *       - in: path
 *         name: category
 *         required: true
 *         schema:
 *           type: string
 *         description: Category name
 *     responses:
 *       "200":
 *         description: Category price deleted successfully
 *       "404":
 *         $ref: '#/components/responses/NotFound'
 *       "500":
 *         $ref: '#/components/responses/ServerError'
 */

/**
 * @swagger
 * /mandiRates/difference/{mandiId}/{category}:
 *   get:
 *     summary: Get price difference
 *     description: Get the price difference for a category in a specific Mandi.
 *     tags: [MandiRates]
 *     parameters:
 *       - in: path
 *         name: mandiId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the Mandi
 *       - in: path
 *         name: category
 *         required: true
 *         schema:
 *           type: string
 *         description: Category name
 *     responses:
 *       "200":
 *         description: Price difference retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 priceDifference:
 *                   type: number
 *                   description: Price difference
 *             example:
 *               priceDifference: 20
 *       "404":
 *         $ref: '#/components/responses/NotFound'
 *       "500":
 *         $ref: '#/components/responses/ServerError'
 */

/**
 * @swagger
 * /mandiRates/history/mandi/{mandiId}:
 *   get:
 *     summary: Get Mandi history
 *     description: Get the price history for a specific Mandi.
 *     tags: [MandiRates]
 *     parameters:
 *       - in: path
 *         name: mandiId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the Mandi
 *     responses:
 *       "200":
 *         description: Mandi history retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/MandiCategoryPrice'
 *       "404":
 *         $ref: '#/components/responses/NotFound'
 *       "500":
 *         $ref: '#/components/responses/ServerError'
 */

/**
 * @swagger
 * /mandiRates/history/category/{mandiId}/{category}:
 *   get:
 *     summary: Get category history
 *     description: Get the price history for a category in a specific Mandi.
 *     tags: [MandiRates]
 *     parameters:
 *       - in: path
 *         name: mandiId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the Mandi
 *       - in: path
 *         name: category
 *         required: true
 *         schema:
 *           type: string
 *         description: Category name
 *     responses:
 *       "200":
 *         description: Category history retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/MandiCategoryPrice'
 *       "404":
 *         $ref: '#/components/responses/NotFound'
 *       "500":
 *         $ref: '#/components/responses/ServerError'
 */

/**
 * @swagger
 * /mandiRates/history/timeframe/{mandiId}/{category}/{timeframe}:
 *   get:
 *     summary: Get history by timeframe
 *     description: Get the price history for a category in a specific Mandi within a specified timeframe.
 *     tags: [MandiRates]
 *     parameters:
 *       - in: path
 *         name: mandiId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the Mandi
 *       - in: path
 *         name: category
 *         required: true
 *         schema:
 *           type: string
 *         description: Category name
 *       - in: path
 *         name: timeframe
 *         required: true
 *         schema:
 *           type: string
 *         description: Timeframe for the history (e.g., "last_week", "last_month")
 *     responses:
 *       "200":
 *         description: History retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/MandiCategoryPrice'
 *       "404":
 *         $ref: '#/components/responses/NotFound'
 *       "500":
 *         $ref: '#/components/responses/ServerError'
 */

/**
 * @swagger
 * /mandiRates/mandi/category/{category}:
 *   get:
 *     summary: Get Mandis by category
 *     description: Get a list of Mandis that have a specific category.
 *     tags: [MandiRates]
 *     parameters:
 *       - in: path
 *         name: category
 *         required: true
 *         schema:
 *           type: string
 *         description: Category name
 *     responses:
 *       "200":
 *         description: List of Mandis retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Mandi'
 *       "404":
 *         $ref: '#/components/responses/NotFound'
 *       "500":
 *         $ref: '#/components/responses/ServerError'
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     MandiCategoryPrice:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           description: Unique identifier for the Mandi category price
 *         mandi:
 *           type: string
 *           description: ID of the Mandi
 *         categoryPrices:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               category:
 *                 type: string
 *                 description: Category name
 *               price:
 *                 type: number
 *                 description: Price of the category
 *               time:
 *                 type: string
 *                 description: Time in Indian 12-hour format (e.g., "10:30 AM", "03:45 PM")
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Timestamp when the rate was created
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: Timestamp when the rate was last updated
 *       example:
 *         id: "63b8e5b934e3e3f7d4a1c6f5"
 *         mandi: "63b8e5b934e3e3f7d4a1c6f4"
 *         categoryPrices:
 *           - category: "Vegetables"
 *             price: 100
 *             time: "10:30 AM"
 *           - category: "Fruits"
 *             price: 150
 *             time: "03:45 PM"
 *         createdAt: "2024-11-22T10:30:00Z"
 *         updatedAt: "2024-11-22T10:30:00Z"
 *
 *     Mandi:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           description: Unique identifier for the Mandi
 *         mandiname:
 *           type: string
 *           description: Name of the Mandi
 *         city:
 *           type: string
 *           description: City where the Mandi is located
 *         state:
 *           type: string
 *           description: State where the Mandi is located
 *         categories:
 *           type: array
 *           items:
 *             type: string
 *           description: Categories available in the Mandi
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Timestamp when the Mandi was created
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: Timestamp when the Mandi was last updated
 *       example:
 *         id: "63b8e5b934e3e3f7d4a1c6f5"
 *         mandiname: "Example Mandi"
 *         city: "Example City"
 *         state: "Example State"
 *         categories: ["Category1", "Category2"]
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