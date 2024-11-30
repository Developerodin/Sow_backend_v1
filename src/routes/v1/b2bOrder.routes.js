import express from "express";
import {
  createOrder,
  getAllOrders,
  getOrderById,
  updateOrder,
  deleteOrder,
  getOrdersByUserId,
  getFilteredUsersByRole,
  getUserDetailsWithCategoryAndSubCategory
} from "../../controllers/B2bOrder.controller.js";

const router = express.Router();

// Create a new order
router.post("/", createOrder);

// Get all orders
router.get("/", getAllOrders);

// Get a specific order by ID
router.get("/:id", getOrderById);

// Update an order by ID
router.put("/:id", updateOrder);

// Delete an order by ID
router.delete("/:id", deleteOrder);

// Get orders by user ID
router.get("/user/:userId", getOrdersByUserId);

router.post("/filterusers", getFilteredUsersByRole);

router.post("/getratedetails", getUserDetailsWithCategoryAndSubCategory);

export default router;

/**
 * @swagger
 * tags:
 *   name: B2bOrders
 *   description: B2B Order management and retrieval
 */

/**
 * @swagger
 * /b2bOrder:
 *   post:
 *     summary: Create a new B2B order
 *     description: Allows users to create a new B2B order.
 *     tags: [B2bOrders]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - orderNo
 *               - category
 *               - orderBy
 *               - orderTo
 *               - location
 *               - subCategory
 *               - weight
 *               - unit
 *               - value
 *               - totalPrice
 *             properties:
 *               orderNo:
 *                 type: string
 *                 description: Unique order number.
 *               category:
 *                 type: string
 *                 description: Reference to the Category ID.
 *               orderBy:
 *                 type: string
 *                 description: Reference to the B2B user who placed the order.
 *               orderTo:
 *                 type: string
 *                 description: Reference to the B2B user to whom the order is directed.
 *               location:
 *                 type: string
 *                 description: Reference to the B2B address ID.
 *               subCategory:
 *                 type: string
 *                 description: Reference to the SubCategory ID.
 *               weight:
 *                 type: string
 *                 description: Weight of the order item.
 *               unit:
 *                 type: string
 *                 description: Unit of the weight (e.g., kg, ton).
 *               notes:
 *                 type: string
 *                 description: Additional notes for the order.
 *               value:
 *                 type: number
 *                 description: Value of the order per unit.
 *               totalPrice:
 *                 type: number
 *                 description: Total price of the order.
 *               photos:
 *                 type: string
 *                 description: URL or path to the photos of the order item.
 *               orderStatus:
 *                 type: string
 *                 description: Status of the order.
 *                 enum:
 *                   - Pending
 *                   - Accepted
 *                   - Rejected
 *                   - Completed
 *                 default: Pending
 *               createdAt:
 *                 type: string
 *                 format: date-time
 *                 description: The date and time when the order was created.
 *               updatedAt:
 *                 type: string
 *                 format: date-time
 *                 description: The date and time when the order was last updated.
 *           example:
 *             orderNo: "ORD123456"
 *             category: "6349b0fcd5d2c72b8d1e89b4"
 *             orderBy: "6349b0fcd5d2c72b8d1e89a1"
 *             orderTo: "6349b0fcd5d2c72b8d1e89a2"
 *             location: "6349b0fcd5d2c72b8d1e89a3"
 *             subCategory: "6349b0fcd5d2c72b8d1e89b5"
 *             weight: "500"
 *             unit: "kg"
 *             notes: "Handle with care."
 *             value: 50
 *             totalPrice: 25000
 *             photos: "https://example.com/photo.jpg"
 *             orderStatus: "Pending"
 *     responses:
 *       "201":
 *         description: Order created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                   description: Order ID
 *                 orderNo:
 *                   type: string
 *                 category:
 *                   type: string
 *                 orderBy:
 *                   type: string
 *                 orderTo:
 *                   type: string
 *                 location:
 *                   type: string
 *                 subCategory:
 *                   type: string
 *                 weight:
 *                   type: string
 *                 unit:
 *                   type: string
 *                 notes:
 *                   type: string
 *                 value:
 *                   type: number
 *                 totalPrice:
 *                   type: number
 *                 photos:
 *                   type: string
 *                 orderStatus:
 *                   type: string
 *                 createdAt:
 *                   type: string
 *                   format: date-time
 *                 updatedAt:
 *                   type: string
 *                   format: date-time
 *       "400":
 *         $ref: '#/components/responses/InvalidInput'
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 */

/**
 * @swagger
 * /b2bOrder:
 *   get:
 *     summary: Get all B2B orders
 *     description: Retrieve all orders. Only admins can access this endpoint.
 *     tags: [B2bOrders]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       "200":
 *         description: List of all orders
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 results:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/B2bOrder'
 *                 totalResults:
 *                   type: integer
 *                   example: 100
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 */

/**
 * @swagger
 * /b2bOrder/{id}:
 *   get:
 *     summary: Get a B2B order by ID
 *     description: Retrieve order details by order ID.
 *     tags: [B2bOrders]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the order
 *     responses:
 *       "200":
 *         description: Order details retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/B2bOrder'
 *       "404":
 *         $ref: '#/components/responses/NotFound'
 */

/**
 * @swagger
 * /b2bOrder/{id}:
 *   put:
 *     summary: Update a B2B order by ID
 *     description: Update order details. Only admins can update orders.
 *     tags: [B2bOrders]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the order
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               quantity:
 *                 type: number
 *               price:
 *                 type: number
 *             example:
 *               quantity: 150
 *               price: 3000
 *     responses:
 *       "200":
 *         description: Order updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/B2bOrder'
 *       "404":
 *         $ref: '#/components/responses/NotFound'
 */

/**
 * @swagger
 * /b2bOrder/{id}:
 *   delete:
 *     summary: Delete a B2B order
 *     description: Delete an order by its ID.
 *     tags: [B2bOrders]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the order
 *     responses:
 *       "204":
 *         description: Order deleted successfully
 *       "404":
 *         $ref: '#/components/responses/NotFound'
 */

/**
 * @swagger
 * /b2bOrder/user/{userId}:
 *   get:
 *     summary: Get all orders by a specific user
 *     description: Retrieve orders placed by a specific user using their user ID.
 *     tags: [B2bOrders]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     responses:
 *       "200":
 *         description: List of orders for the specified user
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/B2bOrder'
 */

/**
 * @swagger
 * /b2bOrder/filterusers:
 *   post:
 *     summary: Get filtered users by role
 *     description: Retrieve users filtered by role, category, subcategory, and optionally city.
 *     tags: [B2bOrders]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *               - categoryName
 *               - subCategoryName
 *             properties:
 *               userId:
 *                 type: string
 *                 description: ID of the requesting user
 *               categoryName:
 *                 type: string
 *                 description: Name of the category
 *               subCategoryName:
 *                 type: string
 *                 description: Name of the subcategory
 *               city:
 *                 type: string
 *                 description: (Optional) City to filter users by
 *             example:
 *               userId: "63b8e5b934e3e3f7d4a1c6f5"
 *               categoryName: "Electronics"
 *               subCategoryName: "Mobile Phones"
 *               city: "New York"
 *     responses:
 *       "200":
 *         description: Users filtered successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       _id:
 *                         type: string
 *                         description: User ID
 *                       name:
 *                         type: string
 *                         description: User name
 *                       registerAs:
 *                         type: string
 *                         description: User role
 *                       category:
 *                         type: array
 *                         items:
 *                           type: object
 *                           properties:
 *                             name:
 *                               type: string
 *                             sub_category:
 *                               type: array
 *                               items:
 *                                 type: object
 *                                 properties:
 *                                   name:
 *                                     type: string
 *                       addresses:
 *                         type: array
 *                         items:
 *                           type: object
 *                           properties:
 *                             city:
 *                               type: string
 *                             addressLine:
 *                               type: string
 *                             postalCode:
 *                               type: string
 *       "400":
 *         $ref: '#/components/responses/InvalidInput'
 *       "404":
 *         $ref: '#/components/responses/NotFound'
 *       "500":
 *         $ref: '#/components/responses/ServerError'
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     B2bOrder:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           description: Unique identifier for the order
 *         orderNo:
 *           type: string
 *           description: Unique order number
 *         category:
 *           type: string
 *           description: Reference to the Category ID
 *         orderBy:
 *           type: string
 *           description: Reference to the B2B user who placed the order
 *         orderTo:
 *           type: string
 *           description: Reference to the B2B user to whom the order is directed
 *         location:
 *           type: string
 *           description: Reference to the B2B address ID
 *         subCategory:
 *           type: string
 *           description: Reference to the SubCategory ID
 *         weight:
 *           type: string
 *           description: Weight of the order item
 *         unit:
 *           type: string
 *           description: Unit of the weight (e.g., kg, ton)
 *         notes:
 *           type: string
 *           description: Additional notes for the order
 *         value:
 *           type: number
 *           description: Value of the order per unit
 *         totalPrice:
 *           type: number
 *           description: Total price of the order
 *         photos:
 *           type: string
 *           description: URL or path to the photos of the order item
 *         orderStatus:
 *           type: string
 *           description: Status of the order
 *           enum:
 *             - Pending
 *             - Accepted
 *             - Rejected
 *             - Completed
 *           default: Pending
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: The date and time when the order was created
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: The date and time when the order was last updated
 *       example:
 *         id: "63b8e5b934e3e3f7d4a1c6f4"
 *         orderNo: "ORD123456"
 *         category: "6349b0fcd5d2c72b8d1e89b4"
 *         orderBy: "6349b0fcd5d2c72b8d1e89a1"
 *         orderTo: "6349b0fcd5d2c72b8d1e89a2"
 *         location: "6349b0fcd5d2c72b8d1e89a3"
 *         subCategory: "6349b0fcd5d2c72b8d1e89b5"
 *         weight: "500"
 *         unit: "kg"
 *         notes: "Handle with care."
 *         value: 50
 *         totalPrice: 25000
 *         photos: "https://example.com/photo.jpg"
 *         orderStatus: "Pending"
 *         createdAt: "2024-11-22T10:30:00Z"
 *         updatedAt: "2024-11-22T10:30:00Z"
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
 *     Unauthorized:
 *       description: Unauthorized access
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               message:
 *                 type: string
 *                 example: "Unauthorized"
 *     NotFound:
 *       description: Resource not found
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               message:
 *                 type: string
 *                 example: "Order not found"
 */


/**
 * @swagger
 * /b2bOrder/getratedetails:
 *   post:
 *     summary: Get user details with category and subcategory
 *     description: Retrieve user details along with category and subcategory information.
 *     tags: [B2bOrders]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *               - categoryId
 *               - subCategoryId
 *             properties:
 *               userId:
 *                 type: string
 *                 description: ID of the user
 *               categoryId:
 *                 type: string
 *                 description: ID of the category
 *               subCategoryId:
 *                 type: string
 *                 description: ID of the subcategory
 *             example:
 *               userId: "63b8e5b934e3e3f7d4a1c6f5"
 *               categoryId: "63b8e5b934e3e3f7d4a1c6f4"
 *               subCategoryId: "63b8e5b934e3e3f7d4a1c6f3"
 *     responses:
 *       "200":
 *         description: User details with category and subcategory retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     userDetails:
 *                       type: object
 *                       properties:
 *                         name:
 *                           type: string
 *                         email:
 *                           type: string
 *                         phone:
 *                           type: string
 *                         registerAs:
 *                           type: string
 *                     addresses:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           userId:
 *                             type: string
 *                           latitude:
 *                             type: number
 *                           longitude:
 *                             type: number
 *                           googleAddress:
 *                             type: string
 *                           buildingName:
 *                             type: string
 *                           roadArea:
 *                             type: string
 *                           note:
 *                             type: string
 *                           addressType:
 *                             type: string
 *                           city:
 *                             type: string
 *                           state:
 *                             type: string
 *                     category:
 *                       type: object
 *                       properties:
 *                         _id:
 *                           type: string
 *                         name:
 *                           type: string
 *                         sub_category:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               _id:
 *                                 type: string
 *                               name:
 *                                 type: string
 *                               price:
 *                                 type: number
 *                               unit:
 *                                 type: string
 *       "400":
 *         $ref: '#/components/responses/InvalidInput'
 *       "404":
 *         $ref: '#/components/responses/NotFound'
 *       "500":
 *         $ref: '#/components/responses/ServerError'
 */

/**
 * @swagger
 * components:
 *   responses:
 *     InvalidInput:
 *       description: Invalid input
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               success:
 *                 type: boolean
 *                 example: false
 *               message:
 *                 type: string
 *                 example: "userId, categoryId, and subCategoryId are required"
 *     NotFound:
 *       description: Not Found
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               success:
 *                 type: boolean
 *                 example: false
 *               message:
 *                 type: string
 *                 example: "User not found"
 *     ServerError:
 *       description: Server error
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               success:
 *                 type: boolean
 *                 example: false
 *               message:
 *                 type: string
 *                 example: "An error occurred while processing your request"
 *               error:
 *                 type: string
 *                 example: "Error message"
 */
