import express from 'express';
import * as quotationController from '../../controllers/quotation.controller.js';

const router = express.Router();

// Routes
router.post('/', quotationController.createQuotation);
router.get('/', quotationController.getAllQuotations);
router.get('/:id', quotationController.getQuotation);
router.patch('/:id', quotationController.updateQuotation);
router.delete('/:id', quotationController.deleteQuotation);
router.post('/user', quotationController.getQuotationsByB2CUserId);

export default router;


/**
 * @swagger
 * tags:
 *   name: Quotations
 *   description: Quotation management and retrieval
 */

/**
 * @swagger
 * /quotations:
 *   post:
 *     summary: Create a quotation
 *     description: Adds a new quotation to the database.
 *     tags: [Quotations]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *            Qoutation:
 *             type: object
 *             required:
 *               - price
 *               - notes
 *             properties:
 *               price:
 *                 type: string
 *                 description: price of the quotation
 *               notes:
 *                 type: string
 *                 description: notes for the quotation
 *             example:
 *               price: 5000
 *               notes: quotation for electronic products
 *     responses:
 *       "201":
 *         description: Category created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Quotation'
 *       "400":
 *         description: Bad request
 *
 *   get:
 *     summary: Get all Quotations
 *     description: Retrieve a list of all quotations.
 *     tags: [Quotations]
 *     responses:
 *       "200":
 *         description: A list of quotations
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Quotation'
 *       "500":
 *         description: Internal server error
 */

/**
 * @swagger
 * /quotations/{id}:
 *   get:
 *     summary: Get a category by ID
 *     description: Retrieve details of a specific category by its ID.
 *     tags: [Quotations]
 *     parameters:
 *       - in: path
 *         price: string
 *         required: true
 *         schema:
 *           type: string
 *         notes: Quotation ID
 *     responses:
 *       "200":
 *         description: Category details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Quotation'
 *       "404":
 *         description: Category not found
 *       "500":
 *         description: Internal server error
 *
 *   patch:
 *     summary: Update a quotation by ID
 *     description: Modify details of an existing quotation.
 *     tags: [Quotations]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Category ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *             example:
 *               name: Updated Electronics
 *               description: Updated category for electronic products
 *     responses:
 *       "200":
 *         description: Quotation updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Quotation'
 *       "400":
 *         description: Bad request
 *       "404":
 *         description: Category not found
 *       "500":
 *         description: Internal server error
 *
 *   delete:
 *     summary: Delete a quotation by ID
 *     description: Remove a category from the database.
 *     tags: [Quotations]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Category ID
 *     responses:
 *       "200":
 *         description: Category deleted successfully
 *       "404":
 *         description: Category not found
 *       "500":
 *         description: Internal server error
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Quotation:
 *       type: object
 *       required:
 *         - price
 *         - notes
 *       properties:
 *         price:
 *           type: string
 *           description: Price of the quotation
 *         notes:
 *           type: string
 *           description: Notes for the quotation
 *       example:
 *         price: "5000"
 *         notes: "Quotation for electronic products"
 */

