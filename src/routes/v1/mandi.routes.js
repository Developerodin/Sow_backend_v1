import express from 'express';
import { createMandi, getAllMandi, getMandiById, updateMandi, deleteMandi, changeMandiStatus  } from '../../controllers/mandi.controller.js';


const router = express.Router();

// Routes
router.post('/', createMandi);
router.get('/', getAllMandi);
router.get('/:id', getMandiById);
router.patch('/:id', updateMandi);
router.delete('/:id', deleteMandi);
router.patch('/:id/status', changeMandiStatus);

export default router;

/**
 * @swagger
 * tags:
 *   name: Mandi
 *   description: Mandi management and retrieval
 */

/**
 * @swagger
 * /mandi:
 *   post:
 *     summary: Create a new Mandi
 *     description: Create a new Mandi by providing the necessary details.
 *     tags: [Mandi]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - city
 *               - state
 *               - categories
 *             properties:
 *               mandiname:
 *                 type: string
 *                 description: Name of the Mandi
 *               city:
 *                 type: string
 *                 description: City where the Mandi is located
 *               state:
 *                 type: string
 *                 description: State where the Mandi is located
 *               categories:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Categories available in the Mandi
 *             example:
 *               mandiname: "Example Mandi"
 *               city: "Example City"
 *               state: "Example State"
 *               categories: ["Category1", "Category2"]
 *     responses:
 *       "201":
 *         description: Mandi created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Mandi'
 *       "400":
 *         $ref: '#/components/responses/InvalidInput'
 *       "500":
 *         $ref: '#/components/responses/ServerError'
 *
 *   get:
 *     summary: Get all Mandis
 *     description: Retrieve a list of all Mandis.
 *     tags: [Mandi]
 *     responses:
 *       "200":
 *         description: List of Mandis
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Mandi'
 *       "500":
 *         $ref: '#/components/responses/ServerError'
 */

/**
 * @swagger
 * /mandi/{id}:
 *   get:
 *     summary: Get a specific Mandi by ID
 *     description: Retrieve a Mandi by its unique ID.
 *     tags: [Mandi]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Mandi ID
 *     responses:
 *       "200":
 *         description: Mandi found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Mandi'
 *       "404":
 *         $ref: '#/components/responses/NotFound'
 *       "500":
 *         $ref: '#/components/responses/ServerError'
 *
 *   patch:
 *     summary: Update a Mandi by ID
 *     description: Update a Mandi using its ID.
 *     tags: [Mandi]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Mandi ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               mandiname:
 *                 type: string
 *               city:
 *                 type: string
 *               state:
 *                 type: string
 *               categories:
 *                 type: array
 *                 items:
 *                   type: string
 *             example:
 *               mandiname: "Updated Mandi"
 *               city: "Updated City"
 *               state: "Updated State"
 *               categories: ["UpdatedCategory1", "UpdatedCategory2"]
 *     responses:
 *       "200":
 *         description: Mandi updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Mandi'
 *       "400":
 *         $ref: '#/components/responses/InvalidInput'
 *       "404":
 *         $ref: '#/components/responses/NotFound'
 *       "500":
 *         $ref: '#/components/responses/ServerError'
 *
 *   delete:
 *     summary: Delete a Mandi by ID
 *     description: Delete a Mandi using its ID.
 *     tags: [Mandi]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Mandi ID
 *     responses:
 *       "200":
 *         description: Mandi deleted successfully
 *       "404":
 *         $ref: '#/components/responses/NotFound'
 *       "500":
 *         $ref: '#/components/responses/ServerError'
 */

/**
 * @swagger
 * /mandi/{id}/status:
 *   patch:
 *     summary: Change Mandi status
 *     description: Change the status of a Mandi using its ID.
 *     tags: [Mandi]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Mandi ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [active, inactive]
 *                 description: Status of the Mandi
 *             example:
 *               status: "active"
 *     responses:
 *       "200":
 *         description: Mandi status updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Mandi'
 *       "400":
 *         $ref: '#/components/responses/InvalidInput'
 *       "404":
 *         $ref: '#/components/responses/NotFound'
 *       "500":
 *         $ref: '#/components/responses/ServerError'
 */
