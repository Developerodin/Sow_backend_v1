import express from 'express';
import auth from '../../middlewares/auth.js';
import validate from '../../middlewares/validate.js';
import * as b2bUserValidation from '../../validations/b2bUser.validation.js';
import {
  createB2BUser,
  getB2BUsers,
  getB2BUser,
  updateB2BUser,
  deleteB2BUser,
  updateB2BAddress,
  deleteB2BAddress,
  addB2BAddress,
  deleteB2BKycDetails,
  addB2BKycDetails,
  getB2BAllAddressesByUserId,
  getB2BKycDetailsByUserId,
  updateB2BKycDetails,
  createCategory,
  getAllCategories,
  getCategoryById,
  updateCategory,
  deleteCategory,
  addSubCategory,
  updateSubCategory,
  deleteSubCategory,
  generateOTPController,
  loginWithOTPController,
  updateUserStatus,
  updateNotificationToken,
  addMandiToList,
  removeMandiFromList,
  getUserMandis,
  getUniqueCitiesAndStates,

} from '../../controllers/b2bUser.controller.js';

const b2bRoute = express.Router();

// OTP routes
b2bRoute.post('/generateOTP', generateOTPController);
b2bRoute.post('/loginWithOTP', loginWithOTPController);

// Update user status
b2bRoute.patch('/updateStatus/:userId', updateUserStatus);

// Update notification token
b2bRoute.post('/:userId/update-token', updateNotificationToken);

// Mandi routes
b2bRoute.post('/add-mandi', addMandiToList);
b2bRoute.post('/remove-mandi', removeMandiFromList);
b2bRoute.get('/:userId/mandis', getUserMandis);

// Create a B2B user
b2bRoute.post('/', validate(b2bUserValidation.createB2BUser), createB2BUser);

// Fetch all B2B users
b2bRoute.get('/', auth('getB2BUsers'), validate(b2bUserValidation.getB2BUsers), getB2BUsers);

// Fetch a B2B user by ID
b2bRoute.get('/:userId', validate(b2bUserValidation.getB2BUser), getB2BUser);

// Update a B2B user by ID
b2bRoute.put('/:userId', auth('manageB2BUsers'), validate(b2bUserValidation.updateB2BUser), updateB2BUser);

// Delete a B2B user by ID
b2bRoute.delete('/:userId', validate(b2bUserValidation.deleteB2BUser), deleteB2BUser);

// Add a B2B address
b2bRoute.post('/address', addB2BAddress);

// Delete a B2B address
b2bRoute.delete(
  '/address/:addressId',
  auth('manageB2BUsers'),
  validate(b2bUserValidation.deleteB2BAddress),
  deleteB2BAddress
);

// Update a B2B address
b2bRoute.put('/address/:addressId', auth('manageB2BUsers'), validate(b2bUserValidation.updateB2BAddress), updateB2BAddress);

// Add a B2B KYC details
b2bRoute.post('/kyc', addB2BKycDetails);

// Delete a B2B KYC details
b2bRoute.delete('/kyc/:id', auth('manageB2BUsers'), validate(b2bUserValidation.deleteB2BKycDetails), deleteB2BKycDetails);

// Update a B2B KYC details
b2bRoute.put('/kyc/:id', auth('manageB2BUsers'), validate(b2bUserValidation.updateB2BKycDetails), updateB2BKycDetails);

// Fetch all B2B addresses by user ID
b2bRoute.get('/address/:userId', getB2BAllAddressesByUserId);

// Fetch unique cities and states
b2bRoute.post('/address/citystate', getUniqueCitiesAndStates);

// Fetch B2B KYC details by user ID
b2bRoute.get('/kyc/:userId', getB2BKycDetailsByUserId);

// Category routes
b2bRoute.post('/:userId/category', createCategory);
b2bRoute.get('/:userId/category', getAllCategories);
b2bRoute.get('/:userId/category/:categoryId', getCategoryById);
b2bRoute.put('/:userId/category/:categoryId', updateCategory);
b2bRoute.delete('/:userId/category/:categoryId', deleteCategory);

// Subcategory routes
b2bRoute.post('/:userId/category/:categoryId/subcategory', addSubCategory);
b2bRoute.put('/:userId/category/:categoryId/subcategory/:subCategoryId', updateSubCategory);
b2bRoute.delete('/:userId/category/:categoryId/subcategory/:subCategoryId', deleteSubCategory);

export default b2bRoute;

/**
 * @swagger
 * tags:
 *   name: B2BUsers
 *   description: B2B User management and retrieval
 */

/**
 * @swagger
 * /b2bUser:
 *   post:
 *     summary: Create a new B2B user
 *     description: Only admins can create B2B users.
 *     tags: [B2BUsers]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - phoneNumber
 *               - registerAs
 *               - name
 *             properties:
 *               phoneNumber:
 *                 type: string
 *                 description: Unique phone number of the B2B user
 *               registerAs:
 *                 type: string
 *                 description: User type (e.g., wholesaler, retailer, etc.)
 *               name:
 *                 type: string
 *                 description: Name of the user
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Email address of the user
 *               businessName:
 *                 type: string
 *                 description: Name of the business
 *               category:
 *                 type: array
 *                 description: Business category
 *               referralCode:
 *                 type: string
 *                 description: Referral code used for registration
 *             example:
 *               phoneNumber: "1234567890"
 *               registerAs: "retailer"
 *               name: "SoW"
 *               email: "sow@example.com"
 *               businessName: "Electronics"
 *               category: [{ "name": "Iron" }]
 *               referralCode: "SOW1234"
 *     responses:
 *       "201":
 *         description: Created
 *         content:
 *           application/json:
 *             schema:
 *                $ref: '#/components/schemas/B2BUser'
 *       "400":
 *         $ref: '#/components/responses/DuplicatePhoneNumber'
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *       "403":
 *         $ref: '#/components/responses/Forbidden'
 *
 *   get:
 *     summary: Get all B2B users
 *     description: Only admins can retrieve all B2B users.
 *     tags: [B2BUsers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: name
 *         schema:
 *           type: string
 *         description: User name
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Business category
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *         description: sort by query in the form of field:desc/asc (e.g., name:asc)
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
 *                     $ref: '#/components/schemas/B2BUser'
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
 * /b2bUser/{userId}:
 *   get:
 *     summary: Get a B2B user by ID
 *     description: Logged in users can fetch only their own information. Only admins can fetch other users.
 *     tags: [B2BUsers]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: B2B user ID
 *     responses:
 *       "200":
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *                $ref: '#/components/schemas/B2BUser'
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *       "403":
 *         $ref: '#/components/responses/Forbidden'
 *       "404":
 *         $ref: '#/components/responses/NotFound'
 *
 *   put:
 *     summary: Update a B2B user
 *     description: Logged in users can only update their own information. Only admins can update other users.
 *     tags: [B2BUsers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: B2B user ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               phoneNumber:
 *                 type: string
 *               registerAs:
 *                 type: string
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               businessName:
 *                 type: string
 *               category:
 *                 type: string
 *               referralCode:
 *                 type: string
 *             example:
 *               phoneNumber: "9876543210"
 *               registerAs: "wholesaler"
 *               name: "TheOdin"
 *               email: "TheOdin@example.com"
 *               businessName: "Odin's Wholesale"
 *               category: "iron"
 *               referralCode: "REF5678"
 *     responses:
 *       "200":
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *                $ref: '#/components/schemas/B2BUser'
 *       "400":
 *         $ref: '#/components/responses/InvalidInput'
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *       "403":
 *         $ref: '#/components/responses/Forbidden'
 *       "404":
 *         $ref: '#/components/responses/NotFound'
 *
 *   delete:
 *     summary: Delete a B2B user
 *     description: Logged in users can delete only themselves. Only admins can delete other users.
 *     tags: [B2BUsers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: B2B user ID
 *     responses:
 *       "204":
 *         description: No content
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *       "403":
 *         $ref: '#/components/responses/Forbidden'
 *       "404":
 *         $ref: '#/components/responses/NotFound'
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     B2BUser:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           description: Unique identifier for the B2B user
 *         phoneNumber:
 *           type: string
 *           description: Unique phone number of the B2B user
 *         registerAs:
 *           type: string
 *           description: User type (e.g., wholesaler, retailer, etc.)
 *         name:
 *           type: string
 *           description: Name of the user
 *         email:
 *           type: string
 *           format: email
 *           description: Email address of the user
 *         businessName:
 *           type: string
 *           description: Name of the business
 *         category:
 *           type: string
 *           description: Business category
 *         referralCode:
 *           type: string
 *           description: Referral code used for registration
 *       example:
 *         id: "1"
 *         phoneNumber: "1234567890"
 *         registerAs: "retailer"
 *         name: "SoW"
 *         email: "sow@example.com"
 *         businessName: "Electronics"
 *         category: "electronics"
 *         referralCode: "SOW1234"
 *   responses:
 *     DuplicatePhoneNumber:
 *       description: Phone number already exists
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               message:
 *                 type: string
 *                 example: "Phone number already exists"
 *     Unauthorized:
 *       description: Unauthorized
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               message:
 *                 type: string
 *                 example: "Unauthorized"
 *     Forbidden:
 *       description: Forbidden
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               message:
 *                 type: string
 *                 example: "Forbidden"
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
 */

// Address Section

/**
 * @swagger
 * tags:
 *   name: B2B Address
 *   description: Address management and retrieval
 */

/**
 * @swagger
 * /b2bUser/address:
 *   post:
 *     summary: Add a B2B address
 *     description: Users can add a new B2B address to their account.
 *     tags: [B2B Address]
 *     security:
 *      - bearerAuth: []
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
 *               - city
 *               - state    
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
 *               city:
 *                 type: string
 *                 description: City of the address
 *               state:
 *                 type: string
 *                 description: State of the address
 *             example:
 *               userId: 12345
 *               latitude: 12.9716
 *               longitude: 77.5946
 *               googleAddress: "123 Main St, Springfield"
 *               addressType: "Warehouse"
 *               city: "Bangalore"
 *               state: "Karnataka"
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
 *                 city:
 *                   type: string
 *                 state:
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
 * /b2bUser/address/{userId}:
 *   get:
 *     summary: Get all B2B addresses by User ID
 *     description: Retrieve all B2B addresses associated with a user.
 *     tags: [B2B Address]
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
 * /b2bUser/address/{addressId}:
 *   patch:
 *     summary: Update a B2B address
 *     description: Users can update an existing B2B address.
 *     tags: [B2B Address]
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
 * /b2bUser/address/{addressId}:
 *   delete:
 *     summary: Delete a B2B address
 *     description: Users can delete an existing B2B address.
 *     tags: [B2B Address]
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

/**
 * @swagger
 * /b2bUser/address/citystate:
 *   post:
 *     summary: Get unique cities and states
 *     description: Retrieve unique cities and states from all addresses.
 *     tags: [B2B Address]
 *     responses:
 *       "200":
 *         description: Unique cities and states retrieved successfully
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
 *                     uniqueCities:
 *                       type: array
 *                       items:
 *                         type: string
 *                       example: ["New York", "Los Angeles", "Chicago"]
 *                     uniqueStates:
 *                       type: array
 *                       items:
 *                         type: string
 *                       example: ["New York", "California", "Illinois"]
 *       "500":
 *         $ref: '#/components/responses/ServerError'
 */

/**
 * @swagger
 * components:
 *   responses:
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
 *                 example: "An error occurred while fetching unique cities and states"
 *               error:
 *                 type: string
 *                 example: "Error message"
 */

// KYC Section

/**
 * @swagger
 * tags:
 *   name: B2B KYC
 *   description: KYC management and retrieval
 */

/**
 * @swagger
 * /b2bUser/kyc:
 *   post:
 *     summary: Add B2B KYC details
 *     description: Users can add new KYC details to their account.
 *     tags: [B2B KYC]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *               - panNumber
 *               - gstinNumber
 *               - panImage
 *               - gstinImage
 *               - status
 *               - remarks
 *             properties:
 *               userId:
 *                 type: string
 *                 description: ID of the user who owns the KYC details
 *               documentType:
 *                 type: string
 *                 description: Type of the document (e.g., Passport, Driver's License)
 *               documentNumber:
 *                 type: string
 *                 description: Document number
 *               documentFile:
 *                 type: string
 *                 format: binary
 *                 description: File of the document
 *             example:
 *               userId: "12345"
 *               panNumber: "ABCDE1234F"
 *               gstinNumber: "29ABCDE1234F1Z2"
 *               panImage: "base64encodedstring"
 *               gstinImage: "base64encodedstring"
 *               status: "pending"
 *               remarks: "Pending verification"
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
 *                   description: KYC ID
 *                 userId:
 *                   type: string
 *                   description: User ID
 *                 documentType:
 *                   type: string
 *                 documentNumber:
 *                   type: string
 *                 documentFile:
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
 * /b2bUser/kyc/{userId}:
 *   get:
 *     summary: Get B2B KYC details by User ID
 *     description: Retrieve all KYC details associated with a user.
 *     tags: [B2B KYC]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the user whose KYC details are to be retrieved
 *     responses:
 *       "200":
 *         description: List of KYC details for the user
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
 *                   documentType:
 *                     type: string
 *                   documentNumber:
 *                     type: string
 *                   documentFile:
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
 * /b2bUser/kyc/{id}:
 *   put:
 *     summary: Update B2B KYC details
 *     description: Users can update existing KYC details.
 *     tags: [B2B KYC]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the KYC details to be updated
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               documentType:
 *                 type: string
 *                 description: Type of the document (e.g., Passport, Driver's License)
 *               documentNumber:
 *                 type: string
 *                 description: Document number
 *               documentFile:
 *                 type: string
 *                 format: binary
 *                 description: File of the document
 *             example:
 *               documentType: "Driver's License"
 *               documentNumber: "B9876543"
 *               documentFile: "base64encodedstring"
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
 *                 documentType:
 *                   type: string
 *                 documentNumber:
 *                   type: string
 *                 documentFile:
 *                   type: string
 *       "400":
 *         description: Invalid input data
 *       "401":
 *         description: Unauthorized access
 *       "404":
 *         description: KYC details not found
 */

/**
 * @swagger
 * /b2bUser/kyc/{id}:
 *   delete:
 *     summary: Delete B2B KYC details
 *     description: Users can delete existing KYC details.
 *     tags: [B2B KYC]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the KYC details to be deleted
 *     responses:
 *       "200":
 *         description: Deleted successfully
 *       "400":
 *         description: Invalid KYC ID
 *       "401":
 *         description: Unauthorized access
 *       "404":
 *         description: KYC details not found
 */


/**
 * @swagger
 * tags:
 *   name: B2B Categories
 *   description: Category management and retrieval
 */

/**
 * @swagger
 * /b2bUser/{userId}/category:
 *   post:
 *     summary: Create a new category for a B2B user
 *     description: Allows users to create a new category.
 *     tags: [B2B Categories]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the B2B user
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *                 description: Name of the category
 *             example:
 *               name: "Electronics"
 *     responses:
 *       "201":
 *         description: Category created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Category'
 *       "400":
 *         $ref: '#/components/responses/InvalidInput'
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 */

/**
 * @swagger
 * /b2bUser/{userId}/category:
 *   get:
 *     summary: Get all categories for a B2B user
 *     description: Retrieve all categories for a specific B2B user.
 *     tags: [B2B Categories]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the B2B user
 *     responses:
 *       "200":
 *         description: List of categories
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Category'
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 */

/**
 * @swagger
 * /b2bUser/{userId}/category/{categoryId}:
 *   get:
 *     summary: Get a category by ID for a B2B user
 *     description: Retrieve a category by its ID for a specific B2B user.
 *     tags: [B2B Categories]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the B2B user
 *       - in: path
 *         name: categoryId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the category
 *     responses:
 *       "200":
 *         description: Category details retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Category'
 *       "404":
 *         $ref: '#/components/responses/NotFound'
 */

/**
 * @swagger
 * /b2bUser/{userId}/category/{categoryId}:
 *   put:
 *     summary: Update a category by ID for a B2B user
 *     description: Update a category by its ID for a specific B2B user.
 *     tags: [B2B Categories]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the B2B user
 *       - in: path
 *         name: categoryId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the category
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: Name of the category
 *             example:
 *               name: "Updated Electronics"
 *     responses:
 *       "200":
 *         description: Category updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Category'
 *       "404":
 *         $ref: '#/components/responses/NotFound'
 */

/**
 * @swagger
 * /b2bUser/{userId}/category/{categoryId}:
 *   delete:
 *     summary: Delete a category by ID for a B2B user
 *     description: Delete a category by its ID for a specific B2B user.
 *     tags: [B2B Categories]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the B2B user
 *       - in: path
 *         name: categoryId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the category
 *     responses:
 *       "204":
 *         description: Category deleted successfully
 *       "404":
 *         $ref: '#/components/responses/NotFound'
 */

/**
 * @swagger
 * tags:
 *   name: B2B Subcategories
 *   description: Subcategory management and retrieval
 */

/**
 * @swagger
 * /b2bUser/{userId}/category/{categoryId}/subcategory:
 *   post:
 *     summary: Add a subcategory to a category for a B2B user
 *     description: Allows users to add a subcategory to a category.
 *     tags: [B2B Subcategories]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the B2B user
 *       - in: path
 *         name: categoryId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the category
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - price
 *               - unit
 *             properties:
 *               name:
 *                 type: string
 *                 description: Name of the subcategory
 *               price:
 *                 type: string
 *                 description: Price of the subcategory
 *               unit:
 *                 type: string
 *                 description: Unit of the subcategory
 *             example:
 *               name: "Mobile Phones"
 *               price: "500"
 *               unit: "pieces"
 *     responses:
 *       "201":
 *         description: Subcategory added successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Subcategory'
 *       "400":
 *         $ref: '#/components/responses/InvalidInput'
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 */

/**
 * @swagger
 * /b2bUser/{userId}/category/{categoryId}/subcategory/{subCategoryId}:
 *   put:
 *     summary: Update a subcategory by ID for a B2B user
 *     description: Update a subcategory by its ID for a specific B2B user.
 *     tags: [B2B Subcategories]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the B2B user
 *       - in: path
 *         name: categoryId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the category
 *       - in: path
 *         name: subCategoryId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the subcategory
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: Name of the subcategory
 *               price:
 *                 type: string
 *                 description: Price of the subcategory
 *               unit:
 *                 type: string
 *                 description: Unit of the subcategory
 *             example:
 *               name: "Updated Mobile Phones"
 *               price: "600"
 *               unit: "pieces"
 *     responses:
 *       "200":
 *         description: Subcategory updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Subcategory'
 *       "404":
 *         $ref: '#/components/responses/NotFound'
 */

/**
 * @swagger
 * /b2bUser/{userId}/category/{categoryId}/subcategory/{subCategoryId}:
 *   delete:
 *     summary: Delete a subcategory by ID for a B2B user
 *     description: Delete a subcategory by its ID for a specific B2B user.
 *     tags: [B2B Subcategories]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the B2B user
 *       - in: path
 *         name: categoryId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the category
 *       - in: path
 *         name: subCategoryId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the subcategory
 *     responses:
 *       "204":
 *         description: Subcategory deleted successfully
 *       "404":
 *         $ref: '#/components/responses/NotFound'
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Category:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           description: Unique identifier for the category
 *         name:
 *           type: string
 *           description: Name of the category
 *         sub_category:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/Subcategory'
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: The date and time when the category was last updated
 *       example:
 *         id: "63b8e5b934e3e3f7d4a1c6f4"
 *         name: "Electronics"
 *         sub_category:
 *           - id: "63b8e5b934e3e3f7d4a1c6f5"
 *             name: "Mobile Phones"
 *             price: "500"
 *             unit: "pieces"
 *             status: "active"
 *             updatedAt: "2024-11-22T10:30:00Z"
 *         updatedAt: "2024-11-22T10:30:00Z"
 *     Subcategory:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           description: Unique identifier for the subcategory
 *         name:
 *           type: string
 *           description: Name of the subcategory
 *         price:
 *           type: string
 *           description: Price of the subcategory
 *         unit:
 *           type: string
 *           description: Unit of the subcategory
 *         status:
 *           type: string
 *           enum:
 *             - active
 *             - inactive
 *           description: Status of the subcategory
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: The date and time when the subcategory was last updated
 *       example:
 *         id: "63b8e5b934e3e3f7d4a1c6f5"
 *         name: "Mobile Phones"
 *         price: "500"
 *         unit: "pieces"
 *         status: "active"
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
 *                 example: "Resource not found"
 */

/**
 * @swagger
 * /b2bUser/generateOTP:
 *   post:
 *     summary: Generate OTP
 *     description: Allows users to generate an OTP using their phone number.
 *     tags: [B2BUsers]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - phoneNumber
 *             properties:
 *               phoneNumber:
 *                 type: string
 *                 description: Phone number to generate OTP
 *             example:
 *               phoneNumber: "1234567890"
 *     responses:
 *       "200":
 *         description: OTP generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "OTP sent successfully"
 *       "400":
 *         $ref: '#/components/responses/InvalidInput'
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 */

/**
 * @swagger
 * /b2bUser/loginWithOTP:
 *   post:
 *     summary: Login with OTP
 *     description: Allows users to login using their phone number and OTP.
 *     tags: [B2BUsers]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - phoneNumber
 *               - otp
 *             properties:
 *               phoneNumber:
 *                 type: string
 *                 description: Phone number used to generate OTP
 *               otp:
 *                 type: string
 *                 description: OTP received by the user
 *             example:
 *               phoneNumber: "1234567890"
 *               otp: "123456"
 *     responses:
 *       "200":
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                   description: JWT token
 *                 user:
 *                   $ref: '#/components/schemas/B2BUser'
 *       "400":
 *         $ref: '#/components/responses/InvalidInput'
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 */


/**
 * @swagger
 * /b2bUser/updateStatus/{userId}:
 *   patch:
 *     summary: Update user status
 *     description: Allows users to update their status.
 *     tags: [B2BUsers]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the B2B user
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
 *                 description: Status of the user
 *             example:
 *               status: "active"
 *     responses:
 *       "200":
 *         description: User status updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/B2BUser'
 *       "400":
 *         $ref: '#/components/responses/InvalidInput'
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *       "403":
 *         $ref: '#/components/responses/Forbidden'
 *       "404":
 *         $ref: '#/components/responses/NotFound'
 */

/**
 * @swagger
 * /b2bUser/{userId}/update-token:
 *   post:
 *     summary: Update notification token
 *     description: Allows users to update their notification token.
 *     tags: [B2BUsers]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the B2B user
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - notificationToken
 *             properties:
 *               notificationToken:
 *                 type: string
 *                 description: Notification token of the user
 *             example:
 *               notificationToken: "some_notification_token"
 *     responses:
 *       "200":
 *         description: Notification token updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/B2BUser'
 *       "400":
 *         $ref: '#/components/responses/InvalidInput'
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *       "403":
 *         $ref: '#/components/responses/Forbidden'
 *       "404":
 *         $ref: '#/components/responses/NotFound'
 */

/**
 * @swagger
 * /b2bUser/add-mandi:
 *   post:
 *     summary: Add Mandi to user's list
 *     description: Add a Mandi to the user's list.
 *     tags: [B2BUsers]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *               - mandiId
 *             properties:
 *               userId:
 *                 type: string
 *                 description: ID of the user
 *               mandiId:
 *                 type: string
 *                 description: ID of the Mandi
 *             example:
 *               userId: "63b8e5b934e3e3f7d4a1c6f5"
 *               mandiId: "63b8e5b934e3e3f7d4a1c6f4"
 *     responses:
 *       "200":
 *         description: Mandi added to user's list successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Mandi added to user's list successfully"
 *       "400":
 *         $ref: '#/components/responses/InvalidInput'
 *       "500":
 *         $ref: '#/components/responses/ServerError'
 */

/**
 * @swagger
 * /b2bUser/remove-mandi:
 *   post:
 *     summary: Remove Mandi from user's list
 *     description: Remove a Mandi from the user's list.
 *     tags: [B2BUsers]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *               - mandiId
 *               - listType
 *             properties:
 *               userId:
 *                 type: string
 *                 description: ID of the user
 *               mandiId:
 *                 type: string
 *                 description: ID of the Mandi
 *               listType:
 *                 type: string
 *                 description: Type of list (notification or favorite)
 *             example:
 *               userId: "63b8e5b934e3e3f7d4a1c6f5"
 *               mandiId: "63b8e5b934e3e3f7d4a1c6f4"
 *               listType: "favorite"
 *     responses:
 *       "200":
 *         description: Mandi removed from user's list successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Mandi removed from user's list successfully"
 *                 user:
 *                   $ref: '#/components/schemas/B2BUser'
 *       "400":
 *         $ref: '#/components/responses/InvalidInput'
 *       "500":
 *         $ref: '#/components/responses/ServerError'
 */

/**
 * @swagger
 * /b2bUser/{userId}/mandis:
 *   get:
 *     summary: Get user's Mandis
 *     description: Retrieve the list of Mandis for a specific user.
 *     tags: [B2BUsers]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the user
 *     responses:
 *       "200":
 *         description: List of Mandis for the user
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



