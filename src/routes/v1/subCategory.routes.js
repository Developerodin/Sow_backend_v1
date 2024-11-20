import express from "express";
import { 
  createSubCategory, 
  getAllSubCategories, 
  getSubCategoryById, 
  getSubCategoriesByCategoryId, 
  updateSubCategory, 
  deleteSubCategory 
} from "../../controllers/subCategory.controller.js"; // Adjust the path as needed

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: SubCategories
 *   description: SubCategory management and retrieval
 */

/**
 * @swagger
 * /subcategories:
 *   post:
 *     summary: Create a new subcategory
 *     description: Create a new subcategory by providing the categoryId, name, description, and timestamp.
 *     tags: [SubCategories]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - categoryId
 *               - name
 *               - description
 *             properties:
 *               categoryId:
 *                 type: string
 *                 description: Category object ID
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               timestamp:
 *                 type: string
 *                 example: '2024-11-20T08:00:00Z'
 *     responses:
 *       "201":
 *         description: SubCategory created successfully
 *       "400":
 *         description: Invalid input data
 *       "500":
 *         description: Server error
 */
router.post("/", createSubCategory);

/**
 * @swagger
 * /subcategories:
 *   get:
 *     summary: Get all subcategories
 *     description: Retrieve a list of all subcategories.
 *     tags: [SubCategories]
 *     responses:
 *       "200":
 *         description: List of subcategories
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/SubCategory'
 *       "500":
 *         description: Server error
 */
router.get("/", getAllSubCategories);

/**
 * @swagger
 * /subcategories/{id}:
 *   get:
 *     summary: Get a specific subcategory by ID
 *     description: Retrieve a subcategory by its unique ID.
 *     tags: [SubCategories]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: SubCategory ID
 *     responses:
 *       "200":
 *         description: SubCategory found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SubCategory'
 *       "404":
 *         description: SubCategory not found
 *       "500":
 *         description: Server error
 */
router.get("/:id", getSubCategoryById);

/**
 * @swagger
 * /subcategories/category/{categoryId}:
 *   get:
 *     summary: Get all subcategories by categoryId
 *     description: Retrieve all subcategories for a specific categoryId.
 *     tags: [SubCategories]
 *     parameters:
 *       - in: path
 *         name: categoryId
 *         required: true
 *         description: Category ID to filter subcategories
 *     responses:
 *       "200":
 *         description: List of subcategories for the specified category
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/SubCategory'
 *       "404":
 *         description: No subcategories found for this category
 *       "500":
 *         description: Server error
 */
router.get("/category/:categoryId", getSubCategoriesByCategoryId);

/**
 * @swagger
 * /subcategories/{id}:
 *   patch:
 *     summary: Update a subcategory by ID
 *     description: Update a subcategory using its ID.
 *     tags: [SubCategories]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: SubCategory ID
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
 *     responses:
 *       "200":
 *         description: SubCategory updated successfully
 *       "400":
 *         description: Invalid input data
 *       "404":
 *         description: SubCategory not found
 *       "500":
 *         description: Server error
 */
router.patch("/:id", updateSubCategory);

/**
 * @swagger
 * /subcategories/{id}:
 *   delete:
 *     summary: Delete a subcategory by ID
 *     description: Delete a subcategory using its ID.
 *     tags: [SubCategories]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: SubCategory ID
 *     responses:
 *       "200":
 *         description: SubCategory deleted successfully
 *       "404":
 *         description: SubCategory not found
 *       "500":
 *         description: Server error
 */
router.delete("/:id", deleteSubCategory);

export default router;
