import express from 'express';
import auth from '../../middlewares/auth.js';
import validate from '../../middlewares/validate.js';
import * as b2cUserController from '../../controllers/b2cUser.controller.js';


const router = express.Router();
router.post('/generateOTP', b2cUserController.generateOTPController);
router.post('/loginWithOTP', b2cUserController.loginWithOTPController);

router.post('/', b2cUserController.createUser);
router.get('/',  b2cUserController.getUsers);

router.get('/:userId', b2cUserController.getUser);
router.patch('/:userId', b2cUserController.updateUser);
router.delete('/:userId', b2cUserController.deleteUser);
router.post('/update-profile-type', b2cUserController.updateUserProfileType);
router.get('/get-profile-type/:userId', b2cUserController.getUserProfileType);
router.get("/sales-summary/:userId", b2cUserController.getUserSaleSummary);
router.post('/update-field', b2cUserController.updateB2CKYCField);
// Add a B2B address
router.post('/address', b2cUserController.addB2CAddress);

// Delete a B2B address
router.delete(
  '/address/:addressId',
  b2cUserController.deleteB2CAddress
);

// Update a B2B address
router.put('/address/:addressId', b2cUserController.updateB2CAddress);
router.get('/:userId/active', b2cUserController.getB2CUserActiveAddress);

// Set an address as active
router.put('/:userId/:addressId/active', b2cUserController.setB2CAddressActive);


// Add a B2B KYC details
router.post('/kyc', b2cUserController.addB2CKycDetails);

// Delete a B2B KYC details
router.delete('/kyc/:id', b2cUserController.deleteB2CKycDetails);

// Update a B2B KYC details
router.put('/kyc/:id', b2cUserController.updateB2CKycDetails);

// Fetch all B2B addresses by user ID
router.get('/address/:userId', b2cUserController.getB2CAllAddressesByUserId);

// Fetch B2B KYC details by user ID
router.get('/kyc/:userId', b2cUserController.getB2CKycDetailsByUserId);

export default router;

/**
 * @swagger
 * tags:
 *   name: B2CUsers
 *   description: Manage B2C users
 */

/**
 * @swagger
 * /b2cUser:
 *   post:
 *     summary: Create a new B2C User
 *     description: This endpoint allows admins to create a new B2C user.
 *     tags: [B2CUsers]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - firstName
 *               - lastName
 *               - phoneNumber
 *               - profileType
 *             properties:
 *               firstName:
 *                 type: string
 *                 description: User's first name
 *               lastName:
 *                 type: string
 *                 description: User's last name
 *               phoneNumber:
 *                 type: string
 *                 description: User's unique phone number
 *               email:
 *                 type: string
 *                 format: email
 *                 description: User's email address (optional)
 *               isKYCVerified:
 *                 type: boolean
 *                 description: Indicates if KYC is verified
 *                 default: false
 *               status:
 *                 type: string
 *                 enum: [active, inactive]
 *                 description: User's account status
 *                 default: active
 *               profileType:
 *                 type: string
 *                 enum: [industry, office, shopkeeper]
 *                 description: Type of user profile
 *               referralCode:
 *                 type: string
 *                 description: Optional referral code
 *             example:
 *               firstName: John
 *               lastName: Doe
 *               phoneNumber: +1234567890
 *               email: johndoe@example.com
 *               isKYCVerified: true
 *               status: active
 *               profileType: shopkeeper
 *               referralCode: REF12345
 *     responses:
 *       "201":
 *         description: B2C User created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/B2CUser'
 *       "400":
 *         $ref: '#/components/responses/ValidationError'
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *       "403":
 *         $ref: '#/components/responses/Forbidden'
 *
 *   get:
 *     summary: Get all B2C Users
 *     description: Retrieve all B2C users with filtering and pagination options.
 *     tags: [B2CUsers]
 *     parameters:
 *       - in: query
 *         name: profileType
 *         schema:
 *           type: string
 *           enum: [industry, office, shopkeeper]
 *         description: Filter by user profile type
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, inactive]
 *         description: Filter by account status
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *         default: 10
 *         description: Number of users to retrieve
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *         default: 1
 *         description: Page number
 *     responses:
 *       "200":
 *         description: List of B2C users successfully retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 results:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/B2CUser'
 *                 page:
 *                   type: integer
 *                   example: 1
 *                 limit:
 *                   type: integer
 *                   example: 10
 *                 totalPages:
 *                   type: integer
 *                   example: 3
 *                 totalResults:
 *                   type: integer
 *                   example: 25
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *       "403":
 *         $ref: '#/components/responses/Forbidden'
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     B2CUser:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           description: Unique identifier for the user
 *         firstName:
 *           type: string
 *           description: User's first name
 *         lastName:
 *           type: string
 *           description: User's last name
 *         phoneNumber:
 *           type: string
 *           description: User's phone number
 *         email:
 *           type: string
 *           format: email
 *           description: User's email address
 *         isKYCVerified:
 *           type: boolean
 *           description: Indicates if the KYC is verified
 *         status:
 *           type: string
 *           enum: [active, inactive]
 *           description: User's account status
 *         profileType:
 *           type: string
 *           enum: [industry, office, shopkeeper]
 *           description: Type of user profile
 *         referralCode:
 *           type: string
 *           description: Referral code associated with the user
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Timestamp when the user was created
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: Timestamp when the user was last updated
 *       example:
 *         id: 64c84271d3f9b17b945eef19
 *         firstName: Jane
 *         lastName: Smith
 *         phoneNumber: +9876543210
 *         email: janesmith@example.com
 *         isKYCVerified: false
 *         status: active
 *         profileType: office
 *         referralCode: REF98765
 */

/**
 * @swagger
 * /b2cUser/{id}:
 *   get:
 *     summary: Get a B2C User by ID
 *     description: This endpoint allows retrieving a B2C user by their unique ID.
 *     tags: [B2CUsers]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: The unique identifier for the user.
 *         schema:
 *           type: string
 *           example: 64c84271d3f9b17b945eef19
 *     responses:
 *       "200":
 *         description: B2C User retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/B2CUser'
 *       "400":
 *         $ref: '#/components/responses/ValidationError'
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *       "403":
 *         $ref: '#/components/responses/Forbidden'
 *       "404":
 *         description: User not found
 */

/**
 * @swagger
 * /b2cUser/{id}:
 *   put:
 *     summary: Update a B2C User by ID
 *     description: This endpoint allows updating an existing B2C user by their unique ID.
 *     tags: [B2CUsers]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: The unique identifier for the user.
 *         schema:
 *           type: string
 *           example: 64c84271d3f9b17b945eef19
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               firstName:
 *                 type: string
 *                 description: User's first name
 *               lastName:
 *                 type: string
 *                 description: User's last name
 *               phoneNumber:
 *                 type: string
 *                 description: User's phone number
 *               email:
 *                 type: string
 *                 format: email
 *                 description: User's email address
 *               isKYCVerified:
 *                 type: boolean
 *                 description: Indicates if KYC is verified
 *                 default: false
 *               status:
 *                 type: string
 *                 enum: [active, inactive]
 *                 description: User's account status
 *                 default: active
 *               profileType:
 *                 type: string
 *                 enum: [industry, office, shopkeeper]
 *                 description: Type of user profile
 *               referralCode:
 *                 type: string
 *                 description: Referral code associated with the user
 *             example:
 *               firstName: Jane
 *               lastName: Smith
 *               phoneNumber: +9876543210
 *               email: janesmith@example.com
 *               isKYCVerified: true
 *               status: inactive
 *               profileType: office
 *               referralCode: REF98765
 *     responses:
 *       "200":
 *         description: B2C User updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/B2CUser'
 *       "400":
 *         $ref: '#/components/responses/ValidationError'
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *       "403":
 *         $ref: '#/components/responses/Forbidden'
 *       "404":
 *         description: User not found
 *
 *   delete:
 *     summary: Delete a B2C User by ID
 *     description: This endpoint allows deleting a B2C user by their unique ID.
 *     tags: [B2CUsers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: The unique identifier for the user.
 *         schema:
 *           type: string
 *           example: 64c84271d3f9b17b945eef19
 *     responses:
 *       "200":
 *         description: B2C User deleted successfully
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *       "403":
 *         $ref: '#/components/responses/Forbidden'
 *       "404":
 *         description: User not found
 */

/**
 * @swagger
 * components:
 *   responses:
 *     Unauthorized:
 *       description: Authentication is required or has failed
 *     Forbidden:
 *       description: You do not have permission to perform this action
 *     ValidationError:
 *       description: Validation error occurred during request processing
 */

// Address Section

/**
 * @swagger
 * tags:
 *   name: B2C Address
 *   description: Address management
 */

/**
 * @swagger
 * /b2cUser/address:
 *   post:
 *     summary: Add a B2C address
 *     description: Users can add a new B2B address to their account.
 *     tags: [B2C Address]
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
 * /b2cUser/address/{userId}:
 *   get:
 *     summary: Get all B2C addresses by User ID
 *     description: Retrieve all B2B addresses associated with a user.
 *     tags: [B2C Address]
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
 * /b2cUser/address/{addressId}:
 *   patch:
 *     summary: Update a B2C address
 *     description: Users can update an existing B2B address.
 *     tags: [B2C Address]
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
 * /b2cUser/address/{addressId}:
 *   delete:
 *     summary: Delete a B2C address
 *     description: Users can delete an existing B2B address.
 *     tags: [B2C Address]
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

// KYC Section

/**
 * @swagger
 * tags:
 *   name: B2C KYC
 *   description: KYC management and retrieval
 */

/**
 * @swagger
 * /b2cUser/kyc:
 *   post:
 *     summary: Add B2C KYC details
 *     description: Users can add new KYC details to their account.
 *     tags: [B2C KYC]
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
 * /b2cUser/kyc/{userId}:
 *   get:
 *     summary: Get B2C KYC details by User ID
 *     description: Retrieve all KYC details associated with a user.
 *     tags: [B2C KYC]
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
 * /b2cUser/kyc/{id}:
 *   put:
 *     summary: Update B2C KYC details
 *     description: Users can update existing KYC details.
 *     tags: [B2C KYC]
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
 * /b2cUser/kyc/{id}:
 *   delete:
 *     summary: Delete B2C KYC details
 *     description: Users can delete existing KYC details.
 *     tags: [B2C KYC]
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
 * /b2cUser/generateOTP:
 *   post:
 *     summary: Generate OTP
 *     description: Allows users to generate an OTP using their phone number.
 *     tags: [B2CUsers]
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
 * /b2cUser/loginWithOTP:
 *   post:
 *     summary: Login with OTP
 *     description: Allows users to login using their phone number and OTP.
 *     tags: [B2CUsers]
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
