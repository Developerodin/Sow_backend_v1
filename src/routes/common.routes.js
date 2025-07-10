import express from 'express';
import { upload, uploadFile, uploadMultipleFiles, deleteFile } from '../controllers/common.controller.js';

const router = express.Router();

// Single file upload route
router.post('/upload', upload.single('file'), uploadFile);

// Multiple files upload route
router.post('/upload-multiple', upload.array('files', 10), uploadMultipleFiles);

// File deletion route
router.delete('/delete/:key', deleteFile);

export default router; 