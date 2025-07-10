import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import AWS from 'aws-sdk';
import { aws } from '../config/config.js';

// Configure AWS
const s3Config = new AWS.S3({
    accessKeyId: aws.accessKeyId,
    secretAccessKey: aws.secretAccessKey,
    region: aws.region,
    signatureVersion: 'v4'
});

// Configure multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    },
    fileFilter: (req, file, cb) => {
        // Add file type validation if needed
        cb(null, true);
    }
});

/**
 * Utility function to upload a file to S3
 * @param {Object} file - The file object from multer
 * @returns {Promise<{url: string, key: string}>} - Returns the file URL and key
 */
const uploadFileToS3 = async (file) => {
    console.log('Uploading file:', file);
    try {
        if (!file) {
            throw new Error('No file provided');
        }

        const uniqueFileName = `${Date.now()}-${uuidv4()}${path.extname(file.originalname)}`;
        
        const params = {
            Bucket: aws.s3.bucket,
            Key: uniqueFileName,
            Body: file.buffer,
            ContentType: file.mimetype
        };

        const uploadResult = await s3Config.upload(params).promise();
        
        return {
            url: uploadResult.Location,
            key: uploadResult.Key
        };
    } catch (error) {
        console.error('Error in uploadFileToS3:', error);
        throw error;
    }
};

/**
 * Utility function to delete a file from S3
 * @param {string} key - The file key in S3
 * @returns {Promise<void>}
 */
const deleteFileFromS3 = async (key) => {
    try {
        if (!key) {
            throw new Error('File key is required');
        }

        await s3Config.deleteObject({
            Bucket: aws.s3.bucket,
            Key: key
        }).promise();
    } catch (error) {
        console.error('Error in deleteFileFromS3:', error);
        throw error;
    }
};

// Controller methods
const uploadFile = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No file uploaded'
            });
        }

        const { url, key } = await uploadFileToS3(req.file);

        return res.status(200).json({
            success: true,
            message: 'File uploaded successfully',
            data: {
                url,
                key
            }
        });
    } catch (error) {
        console.error('File upload error:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Error uploading file',
            error: error.message
        });
    }
};

const deleteFile = async (req, res) => {
    try {
        const { key } = req.params;

        if (!key) {
            return res.status(400).json({
                success: false,
                message: 'File key is required'
            });
        }

        await deleteFileFromS3(key);

        return res.status(200).json({
            success: true,
            message: 'File deleted successfully'
        });
    } catch (error) {
        console.error('File deletion error:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Error deleting file',
            error: error.message
        });
    }
};

export {
    upload,
    uploadFile,
    deleteFile,
    uploadFileToS3,
    deleteFileFromS3
}; 