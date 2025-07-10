import express from 'express';
import { upload, uploadFile, deleteFile } from '../controllers/common.controller.js';

const router = express.Router();

// File upload route
router.post('/upload', upload.single('file'), uploadFile);

// File deletion route
router.delete('/delete/:key', deleteFile);

export default router; 