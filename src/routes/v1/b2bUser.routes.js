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
} from '../../controllers/b2bUser.controller.js';

const b2bRoute = express.Router();

// Create a B2B user
b2bRoute.post(
  '/',
  validate(b2bUserValidation.createB2BUser),
  createB2BUser
);

// Fetch all B2B users
b2bRoute.get(
  '/',
  auth('getB2BUsers'),
  validate(b2bUserValidation.getB2BUsers),
  getB2BUsers
);

// Fetch a B2B user by ID
b2bRoute.get(
  '/:userId',
  validate(b2bUserValidation.getB2BUser),
  getB2BUser
);

// Update a B2B user by ID
b2bRoute.put(
  '/:userId',
  auth('manageB2BUsers'),
  validate(b2bUserValidation.updateB2BUser),
  updateB2BUser
);

// Delete a B2B user by ID
b2bRoute.delete(
  '/:userId',
  auth('manageB2BUsers'),
  validate(b2bUserValidation.deleteB2BUser),
  deleteB2BUser
);

export default b2bRoute;

/**
 * @swagger
 * tags:
 *   name: B2BUser
 *   description: B2B User management and retrieval
 */

/**
 * @swagger
 * /b2bUser:
 *   post:
 *     summary: Create a new B2B user
 *     description: Only admins can create B2B users.
 *     tags: [B2BUser]
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
 *                 type: string
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
 *               category: "electronics"
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
 *     tags: [B2BUser]
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
 *     tags: [B2BUser]
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
 *     tags: [B2BUser]
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
 *     tags: [B2BUser]
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