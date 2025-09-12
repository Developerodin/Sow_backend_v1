import axios from 'axios';
import crypto from 'crypto';
import { encrypt, decrypt } from '../utils/truthscreen.js';

// Use environment variables for production credentials
const TRUTHSCREEN_USERNAME = process.env.TRUTHSCREEN_USERNAME;
const TRUTHSCREEN_PASSWORD = process.env.TRUTHSCREEN_PASSWORD;
const TRUTHSCREEN_BASE_URL = process.env.TRUTHSCREEN_BASE_URL || 'https://www.truthscreen.com';
const PAN_ENDPOINT = `${TRUTHSCREEN_BASE_URL}/api/v2.2/idsearch`;




/**
 * Verify PAN number
 * @param {string} panNumber - PAN number to verify
 * @param {string} name - Name to verify (optional, for future use)
 * @returns {Promise<Object>} - PAN verification result
 */
export const verifyPan = async (panNumber, name) => {
  try {
    // Check environment variables
    if (!TRUTHSCREEN_USERNAME || !TRUTHSCREEN_PASSWORD) {
      throw new Error('Truthscreen credentials not configured. Please check environment variables.');
    }

    // Validate PAN number format
    if (!panNumber || typeof panNumber !== 'string') {
      throw new Error('PAN number is required and must be a string');
    }

    if (panNumber.length !== 10) {
      throw new Error('PAN number must be exactly 10 characters');
    }

    // Validate PAN number format (should be alphanumeric)
    if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(panNumber)) {
      throw new Error('Invalid PAN number format. Should be in format: ABCDE1234F');
    }

    // Prepare input structure as per Truthscreen API documentation
    const input = {
      transID: `TS${Date.now()}`,
      docType: 2, // PAN (as number, not string)
      docNumber: panNumber.toUpperCase(),
      isAsync: 0 // Normal request, not asynchronous (as integer, not string)
    };

    console.log('📝 Input data:', JSON.stringify(input));
    
    // Debug: Show what we're encrypting
    const inputString = JSON.stringify(input);
    console.log('🔍 Input string to encrypt:', inputString);
    console.log('🔑 Password length:', TRUTHSCREEN_PASSWORD.length);
    console.log('🔑 Password first 4 chars:', TRUTHSCREEN_PASSWORD.substring(0, 4) + '...');
    
    // Encrypt the input using AES128 with SHA512 hash of password as key
    const encryptedRequest = encrypt(inputString, TRUTHSCREEN_PASSWORD);
    console.log("🔐 Encrypted request:", encryptedRequest);
    
    // Verify encryption worked
    try {
      const testDecrypt = decrypt(encryptedRequest, TRUTHSCREEN_PASSWORD);
      console.log('✅ Test decryption successful:', testDecrypt === inputString);
    } catch (decryptError) {
      console.error('❌ Test decryption failed:', decryptError.message);
    }
    
    // Prepare payload with encrypted data
    const payload = {
      requestData: encryptedRequest
    };

    const headers = {
      'Content-Type': 'application/json',
      'username': TRUTHSCREEN_USERNAME
    };

    console.log('🔧 Request headers:', headers);
    console.log('🔧 Request payload keys:', Object.keys(payload));
    console.log('🌐 Endpoint:', PAN_ENDPOINT);
    console.log('📤 Sending request...');

    const response = await axios.post(PAN_ENDPOINT, payload, { 
      headers,
      timeout: 30000, // 30 second timeout
      validateStatus: function (status) {
        return status < 500; // Accept all status codes less than 500
      }
    });
    
    console.log("📡 Response status:", response.status);
    console.log("📡 Response headers:", response.headers);
    console.log("📡 Response data:", response.data);
    
    if (response.data && response.data.responseData) {
      // Decrypt the response data
      const decryptedData = decrypt(response.data.responseData, TRUTHSCREEN_PASSWORD);
      console.log('✅ Decrypted Response:', decryptedData);
      
      let result;
      if (typeof decryptedData === 'string') {
        try {
          result = JSON.parse(decryptedData);
        } catch (parseError) {
          console.error('JSON parse error:', parseError);
          throw new Error('Invalid response format from verification service');
        }
      } else {
        result = decryptedData;
      }

      // Handle different response statuses as per Truthscreen documentation
      if (result.status === 1) {
        // Success - PAN found and verified
        return {
          valid: true,
          message: result.msg?.StatusDescription || 'PAN verification successful',
          status: 'VALID',
          data: result.msg,
          panNumber: panNumber.toUpperCase(),
          transactionId: input.transID,
          name: result.msg?.Name,
          nameOnCard: result.msg?.NameOnTheCard,
          panStatus: result.msg?.STATUS,
          panHolderType: result.msg?.panHolderStatusType,
          lastUpdate: result.msg?.LastUpdate,
          verificationDate: new Date().toISOString()
        };
      } else if (result.status === 0) {
        // Technical error
        return {
          valid: false,
          message: result.msg || 'Technical error occurred during verification',
          status: 'ERROR',
          data: result,
          panNumber: panNumber.toUpperCase(),
          transactionId: input.transID
        };
      } else if (result.status === 9) {
        // PAN not found or invalid
        return {
          valid: false,
          message: result.msg || 'PAN not found in income tax database or invalid PAN number',
          status: 'NOT_FOUND',
          data: result,
          panNumber: panNumber.toUpperCase(),
          transactionId: input.transID
        };
      } else {
        // Unknown status
        return {
          valid: false,
          message: `Unknown response status: ${result.status}`,
          status: 'UNKNOWN',
          data: result,
          panNumber: panNumber.toUpperCase(),
          transactionId: input.transID
        };
      }
    } else {
      console.log('❌ No responseData found:', response.data);
      return {
        valid: false,
        message: 'No response data received from verification service',
        status: 'ERROR',
        data: response.data,
        panNumber: panNumber.toUpperCase(),
        transactionId: input.transID
      };
    }
  } catch (error) {
    console.error('❌ PAN Verification Error Details:');
    console.error('- Status:', error.response?.status);
    console.error('- Status Text:', error.response?.statusText);
    console.error('- Response Data:', error.response?.data);
    console.error('- Error Message:', error.message);
    console.error('- Full Error:', error);
    
    // Return a proper error response instead of throwing
    return {
      valid: false,
      message: error.response?.data?.msg || error.message || 'PAN verification failed',
      status: 'ERROR',
      error: error.response?.data || error.message,
      panNumber: panNumber.toUpperCase(),
      transactionId: `TS${Date.now()}`
    };
  }
}; 
  

