import express from 'express';
import * as categoryController from '../../controllers/category.controller.js';

const router = express.Router();

// Routes
router.post('/', categoryController.createCategory);
router.get('/', categoryController.getCategories);
router.get('/:id', categoryController.getCategoryById);
router.patch('/:id', categoryController.updateCategoryById);
router.delete('/:id', categoryController.deleteCategoryById);
router.put('/update-image', categoryController.updateCategoryImage);
router.post('/update-allimage', categoryController.updateAllCategoryImages);
export default router;


/**
 * @swagger
 * tags:
 *   name: Categories
 *   description: Category management and retrieval
 */

/**
 * @swagger
 * /categories:
 *   post:
 *     summary: Create a category
 *     description: Adds a new category to the database.
 *     tags: [Categories]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - description
 *             properties:
 *               name:
 *                 type: string
 *                 description: Name of the category
 *               description:
 *                 type: string
 *                 description: Description of the category
 *             example:
 *               name: Electronics
 *               description: Category for electronic products
 *     responses:
 *       "201":
 *         description: Category created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Category'
 *       "400":
 *         description: Bad request
 *
 *   get:
 *     summary: Get all categories
 *     description: Retrieve a list of all categories.
 *     tags: [Categories]
 *     responses:
 *       "200":
 *         description: A list of categories
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Category'
 *       "500":
 *         description: Internal server error
 */

/**
 * @swagger
 * /categories/{id}:
 *   get:
 *     summary: Get a category by ID
 *     description: Retrieve details of a specific category by its ID.
 *     tags: [Categories]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Category ID
 *     responses:
 *       "200":
 *         description: Category details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Category'
 *       "404":
 *         description: Category not found
 *       "500":
 *         description: Internal server error
 *
 *   patch:
 *     summary: Update a category by ID
 *     description: Modify details of an existing category.
 *     tags: [Categories]
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
 *         description: Category updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Category'
 *       "400":
 *         description: Bad request
 *       "404":
 *         description: Category not found
 *       "500":
 *         description: Internal server error
 *
 *   delete:
 *     summary: Delete a category by ID
 *     description: Remove a category from the database.
 *     tags: [Categories]
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


