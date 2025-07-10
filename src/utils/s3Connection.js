import AWS from 'aws-sdk';
import { aws } from '../config/config.js';

// Configure AWS
const s3Config = new AWS.S3({
    accessKeyId: aws.accessKeyId,
    secretAccessKey: aws.secretAccessKey,
    region: aws.region,
    signatureVersion: 'v4'
});

/**
 * Test S3 connection by attempting to list buckets
 * @returns {Promise<boolean>} - Returns true if connection is successful
 */
const testS3Connection = async () => {
    try {
        // Test connection by listing buckets
        await s3Config.listBuckets().promise();
        console.log('✅ AWS S3 connection successful');
        return true;
    } catch (error) {
        console.error('❌ AWS S3 connection failed:', error.message);
        return false;
    }
};

export {
    s3Config as s3,
    testS3Connection
}; 