import express from "express";
import { 
  createSubCategory, 
  getAllSubCategories, 
  getSubCategoryById, 
  getSubCategoriesByCategoryId, 
  updateSubCategory, 
  deleteSubCategory ,
  getSubCategoriesByCategoryName,
  markAllSubCategoriesTradable,
  updatePriceForAllSubCategories
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
router.put("/updatePrice", updatePriceForAllSubCategories);

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
router.get("/marktrue", markAllSubCategoriesTradable);
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

/**
 * @swagger
 * /subcategories/category:
 *   post:
 *     summary: Get all subcategories by category name
 *     description: Retrieve all subcategories for a specific category name by posting the category name in the request body.
 *     tags: [SubCategories]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               categoryName:
 *                 type: string
 *                 description: The name of the category to filter subcategories by.
 *                 example: "Electronics"
 *     responses:
 *       "200":
 *         description: A list of subcategories for the specified category
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/SubCategory'
 *       "400":
 *         description: Missing category name in the request body
 *       "404":
 *         description: No subcategories found for the specified category name
 *       "500":
 *         description: Internal server error
 */


router.post("/category", getSubCategoriesByCategoryName);


/**
 * @swagger
 * components:
 *   schemas:
 *     SubCategory:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           description: Unique identifier for the subcategory
 *         categoryId:
 *           type: string
 *           description: ID of the category this subcategory belongs to
 *         name:
 *           type: string
 *           description: Name of the subcategory
 *         description:
 *           type: string
 *           description: Description of the subcategory
 *         timestamp:
 *           type: string
 *           format: date-time
 *           description: Timestamp when the subcategory was created or updated
 *       example:
 *         id: "63b8e5b934e3e3f7d4a1c6f5"
 *         categoryId: "63b8e5b934e3e3f7d4a1c6f4"
 *         name: "Mobile Phones"
 *         description: "Subcategory for mobile phones"
 *         timestamp: "2024-11-22T10:30:00Z"
 */



export default router;
