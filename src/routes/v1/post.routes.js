import express from 'express';
import {
  createPost,
  getAllPosts,
  getPostById,
  updatePost,
  deletePost,
} from '../../controllers/post.controller.js';

const router = express.Router();

// Create a new Post
router.post('/', createPost);

// Get all Posts
router.get('/', getAllPosts);

// Get a single Post by ID
router.get('/:id', getPostById);

// Update a Post by ID
router.put('/:id', updatePost);

// Delete a Post by ID
router.delete('/:id', deletePost);

export default router;
