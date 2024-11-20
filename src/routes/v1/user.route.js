import express from 'express';
import auth from '../../middlewares/auth.js';
import validate from '../../middlewares/validate.js';
import * as userValidation from '../../validations/user.validation.js';
import * as userController from '../../controllers/user.controller.js';

const router = express.Router();

router.post('/', auth('manageUsers'), validate(userValidation.createUser), userController.createUser);
router.get('/', auth('getUsers'), validate(userValidation.getUsers), userController.getUsers);

router.get('/:userId', auth('getUsers'), validate(userValidation.getUser), userController.getUser);
router.patch('/:userId', auth('manageUsers'), validate(userValidation.updateUser), userController.updateUser);
router.delete('/:userId', auth('manageUsers'), validate(userValidation.deleteUser), userController.deleteUser);

// Address routes
router.post('/addresses', userController.addB2BAddress);
router.get('/addresses/:userId', userController.getB2BAllAddressesByUserId);

router.patch('/addresses/:addressId', userController.updateB2BAddress);
router.delete('/addresses/:addressId', userController.deleteB2BAddress);






  export default router;

/**
 * @swagger
 * tags:
 *   name: Users
 *   description: User management and retrieval
 */

/**
 * @swagger
 * /users:
 *   post:
 *     summary: Create a user 
 *     description: Only admins can create other users.
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - password
 *               - role
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *                 description: must be unique
 *               password:
 *                 type: string
 *                 format: password
 *                 minLength: 8
 *                 description: At least one number and one letter
 *               role:
 *                  type: string
 *                  enum: [user, admin]
 *             example:
 *               name: fake name
 *               email: fake@example.com
 *               password: password1
 *               role: user
 *     responses:
 *       "201":
 *         description: Created
 *         content:
 *           application/json:
 *             schema:
 *                $ref: '#/components/schemas/User'
 *       "400":
 *         $ref: '#/components/responses/DuplicateEmail'
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *       "403":
 *         $ref: '#/components/responses/Forbidden'
 *
 *   get:
 *     summary: Get all users
 *     description: Only admins can retrieve all users.
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: name
 *         schema:
 *           type: string
 *         description: User name
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *         description: User role
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *         description: sort by query in the form of field:desc/asc (ex. name:asc)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *         default: 10
 *         description: Maximum number of users
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number
 *     responses:
 *       "200":
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 results:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/User'
 *                 page:
 *                   type: integer
 *                   example: 1
 *                 limit:
 *                   type: integer
 *                   example: 10
 *                 totalPages:
 *                   type: integer
 *                   example: 1
 *                 totalResults:
 *                   type: integer
 *                   example: 1
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *       "403":
 *         $ref: '#/components/responses/Forbidden'
 */

/**
 * @swagger
 * /users/{id}:
 *   get:
 *     summary: Get a user
 *     description: Logged in users can fetch only their own user information. Only admins can fetch other users.
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User id
 *     responses:
 *       "200":
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *                $ref: '#/components/schemas/User'
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *       "403":
 *         $ref: '#/components/responses/Forbidden'
 *       "404":
 *         $ref: '#/components/responses/NotFound'
 *
 *   patch:
 *     summary: Update a user
 *     description: Logged in users can only update their own information. Only admins can update other users.
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User id
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *                 description: must be unique
 *               password:
 *                 type: string
 *                 format: password
 *                 minLength: 8
 *                 description: At least one number and one letter
 *             example:
 *               name: fake name
 *               email: fake@example.com
 *               password: password1
 *     responses:
 *       "200":
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *                $ref: '#/components/schemas/User'
 *       "400":
 *         $ref: '#/components/responses/DuplicateEmail'
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *       "403":
 *         $ref: '#/components/responses/Forbidden'
 *       "404":
 *         $ref: '#/components/responses/NotFound'
 *
 *   delete:
 *     summary: Delete a user
 *     description: Logged in users can delete only themselves. Only admins can delete other users.
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User id
 *     responses:
 *       "200":
 *         description: No content
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *       "403":
 *         $ref: '#/components/responses/Forbidden'
 *       "404":
 *         $ref: '#/components/responses/NotFound'
 */












// Address Section 


/**
 * @swagger
 * tags:
 *   name: B2B User Addresses
 *   description: Address management and retrieval
 */

/**
 * @swagger
 * /users/addresses:
 *   post:
 *     summary: Add a B2B address
 *     description: Users can add a new B2B address to their account.
 *     tags: [Addresses]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *               - latitude
 *               - longitude
 *               - googleAddress
 *               - addressType
 *             properties:
 *               userId:
 *                 type: string
 *                 description: ID of the user who owns the address
 *               latitude:
 *                 type: number
 *                 description: Latitude of the address
 *               longitude:
 *                 type: number
 *                 description: Longitude of the address
 *               googleAddress:
 *                 type: string
 *                 description: Full address as provided by Google Maps
 *               buildingName:
 *                 type: string
 *                 description: Name of the building (optional)
 *               roadArea:
 *                 type: string
 *                 description: Road or area of the address (optional)
 *               note:
 *                 type: string
 *                 description: Additional note for the address (optional)
 *               addressType:
 *                 type: string
 *                 enum: ['Warehouse', 'Other']
 *                 description: Type of the address (either Warehouse or Other)
 *             example:
 *               userId: 12345
 *               latitude: 12.9716
 *               longitude: 77.5946
 *               googleAddress: "123 Main St, Springfield"
 *               addressType: "Warehouse"
 *     responses:
 *       "201":
 *         description: Created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                   description: Address ID
 *                 userId:
 *                   type: string
 *                   description: User ID
 *                 latitude:
 *                   type: number
 *                 longitude:
 *                   type: number
 *                 googleAddress:
 *                   type: string
 *                 addressType:
 *                   type: string
 *                 createdAt:
 *                   type: string
 *                   format: date-time
 *       "400":
 *         description: Invalid input data
 *       "401":
 *         description: Unauthorized access
 */

/**
 * @swagger
 * /users/addresses:
 *   get:
 *     summary: Get all B2B addresses by User ID
 *     description: Retrieve all B2B addresses associated with a user.
 *     tags: [Addresses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the user whose addresses are to be retrieved
 *     responses:
 *       "200":
 *         description: List of addresses for the user
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                   userId:
 *                     type: string
 *                   latitude:
 *                     type: number
 *                   longitude:
 *                     type: number
 *                   googleAddress:
 *                     type: string
 *                   addressType:
 *                     type: string
 *                   createdAt:
 *                     type: string
 *                     format: date-time
 *       "400":
 *         description: Invalid user ID provided
 *       "401":
 *         description: Unauthorized access
 */

/**
 * @swagger
 * /users/addresses/{addressId}:
 *   patch:
 *     summary: Update a B2B address
 *     description: Users can update an existing B2B address.
 *     tags: [Addresses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: addressId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the address to be updated
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               latitude:
 *                 type: number
 *                 description: Latitude of the address
 *               longitude:
 *                 type: number
 *                 description: Longitude of the address
 *               googleAddress:
 *                 type: string
 *                 description: Full address as provided by Google Maps
 *               buildingName:
 *                 type: string
 *                 description: Name of the building (optional)
 *               roadArea:
 *                 type: string
 *                 description: Road or area of the address (optional)
 *               note:
 *                 type: string
 *                 description: Additional note for the address (optional)
 *               addressType:
 *                 type: string
 *                 enum: ['Warehouse', 'Other']
 *                 description: Type of the address (either Warehouse or Other)
 *             example:
 *               latitude: 12.9726
 *               longitude: 77.5936
 *               googleAddress: "456 Elm St, Springfield"
 *               addressType: "Other"
 *     responses:
 *       "200":
 *         description: Updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                 userId:
 *                   type: string
 *                 latitude:
 *                   type: number
 *                 longitude:
 *                   type: number
 *                 googleAddress:
 *                   type: string
 *                 addressType:
 *                   type: string
 *       "400":
 *         description: Invalid input data
 *       "401":
 *         description: Unauthorized access
 *       "404":
 *         description: Address not found
 */

/**
 * @swagger
 * /users/addresses/{addressId}:
 *   delete:
 *     summary: Delete a B2B address
 *     description: Users can delete an existing B2B address.
 *     tags: [Addresses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: addressId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the address to be deleted
 *     responses:
 *       "200":
 *         description: Deleted successfully
 *       "400":
 *         description: Invalid address ID
 *       "401":
 *         description: Unauthorized access
 *       "404":
 *         description: Address not found
 */


