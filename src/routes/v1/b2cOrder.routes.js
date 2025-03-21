import express from "express";
import {  createB2cOrder,
    getB2cAllOrders,
    getB2cOrderById,
    updateB2cOrder,
    deleteB2cOrder,
    getB2cOrdersByUserId,assignOrderToUser,filterOrdersByUserId,
    getNewOrdersForUser,
    updateOrderStatus,verifyOtpAndCompleteOrder,filterOrdersByB2BUser} from "../../controllers/b2cOrder.controller.js";


const router = express.Router();

// Create a new order
router.post("/", createB2cOrder);

// Get all orders
router.get("/", getB2cAllOrders);

// Get a specific order by ID
router.get("/:id", getB2cOrderById);

// Update an order by ID
router.put("/:id", updateB2cOrder);

// Delete an order by ID
router.delete("/:id", deleteB2cOrder);

// Get orders by user ID
router.get("/user/:userId", getB2cOrdersByUserId);
router.post("/assignOrderToUser", assignOrderToUser);

router.post("/filterorders", filterOrdersByUserId);
router.post("/filterordersbyb2buser", filterOrdersByB2BUser);
router.post("/updateOrderStatus", updateOrderStatus);
router.post("/getNewOrdersForUser", getNewOrdersForUser);
router.post("/markcomplete", verifyOtpAndCompleteOrder);


export default router;

/**
 * @swagger
 * tags:
 *   name: B2c Orders
 *   description: B2C Order management and retrieval
 */

/**
 * @swagger
 * /b2cOrder:
 *   post:
 *     summary: Create a new B2C order
 *     description: Allows users to create a new B2B order.
 *     tags: [B2c Orders]
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
 * /b2cOrder:
 *   get:
 *     summary: Get all B2C orders
 *     description: Retrieve all orders. Only admins can access this endpoint.
 *     tags: [B2c Orders]
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
 * /b2cOrder/{id}:
 *   get:
 *     summary: Get a B2C order by ID
 *     description: Retrieve order details by order ID.
 *     tags: [B2c Orders]
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
 * /b2cOrder/{id}:
 *   put:
 *     summary: Update a B2C order by ID
 *     description: Update order details. Only admins can update orders.
 *     tags: [B2c Orders]
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
 * /b2cOrder/{id}:
 *   delete:
 *     summary: Delete a B2C order
 *     description: Delete an order by its ID.
 *     tags: [B2c Orders]
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
 * /b2cOrder/user/{userId}:
 *   get:
 *     summary: Get all orders by a specific user
 *     description: Retrieve orders placed by a specific user using their user ID.
 *     tags: [B2c Orders]
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
 * /b2cOrder/assignOrderToUser:
 *   post:
 *     summary: Assign an order to a user
 *     tags: [B2c Orders]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               orderId:
 *                 type: string
 *                 description: The ID of the order to be assigned
 *                 example: 60d21b4667d0d8992e610c85
 *               userId:
 *                 type: string
 *                 description: The ID of the user to whom the order is assigned
 *                 example: 60d21b4967d0d8992e610c86
 *     responses:
 *       200:
 *         description: Order assigned successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 _id:
 *                   type: string
 *                   description: The ID of the order
 *                 orderNo:
 *                   type: string
 *                   description: The order number
 *                 orderBy:
 *                   type: string
 *                   description: The ID of the user who created the order
 *                 orderTo:
 *                   type: string
 *                   description: The ID of the user to whom the order is assigned
 *                 location:
 *                   type: string
 *                   description: The location ID
 *                 items:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       category:
 *                         type: string
 *                       subCategory:
 *                         type: string
 *                       weight:
 *                         type: string
 *                       unit:
 *                         type: string
 *                       notes:
 *                         type: string
 *                       value:
 *                         type: number
 *                       totalPrice:
 *                         type: number
 *                 photos:
 *                   type: string
 *                 orderStatus:
 *                   type: string
 *                   enum: ["New", "Pending", "Rejected", "Completed", "Cancelled"]
 *                 totalPrice:
 *                   type: number
 *                 createdAt:
 *                   type: string
 *                   format: date-time
 *                 updatedAt:
 *                   type: string
 *                   format: date-time
 *       400:
 *         description: Order ID and User ID are required
 *       404:
 *         description: Order not found
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /b2cOrder/filterordersbyb2buser:
 *   post:
 *     summary: Filter orders by B2B user
 *     description: Retrieve orders for a B2B user based on the specified criteria.
 *     tags: [B2c Orders]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               userId:
 *                 type: string
 *                 description: The ID of the B2B user
 *                 example: 60d21b4667d0d8992e610c85
 *               type:
 *                 type: string
 *                 description: The type of orders to filter (e.g., 'upcoming')
 *                 example: upcoming
 *               action:
 *                 type: string
 *                 description: The action type (e.g., 'purchase')
 *                 example: purchase
 *     responses:
 *       200:
 *         description: Orders retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   _id:
 *                     type: string
 *                     description: The ID of the order
 *                   orderNo:
 *                     type: string
 *                     description: The order number
 *                   orderBy:
 *                     type: object
 *                     properties:
 *                       firstName:
 *                         type: string
 *                       lastName:
 *                         type: string
 *                       profileType:
 *                         type: string
 *                       phoneNumber:
 *                         type: string
 *                   orderTo:
 *                     type: object
 *                     properties:
 *                       name:
 *                         type: string
 *                       registerAs:
 *                         type: string
 *                       phoneNumber:
 *                         type: string
 *                   location:
 *                     type: object
 *                     properties:
 *                       googleAddress:
 *                         type: string
 *                   orderStatus:
 *                     type: string
 *                     enum: ["Pending", "Rejected", "Completed", "Cancelled"]
 *                   totalPrice:
 *                     type: number
 *                   createdAt:
 *                     type: string
 *                     format: date-time
 *                   updatedAt:
 *                     type: string
 *                     format: date-time
 *       404:
 *         description: No orders found for the specified criteria
 *       500:
 *         description: An error occurred while filtering orders
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     B2cOrder:
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