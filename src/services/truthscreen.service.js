import axios from 'axios';
import crypto from 'crypto';
import { encrypt, decrypt } from '../utils/truthscreen.js';

// Use environment variables for production credentials
const TRUTHSCREEN_USERNAME = process.env.TRUTHSCREEN_USERNAME ;
const TRUTHSCREEN_PASSWORD = process.env.TRUTHSCREEN_PASSWORD  ;
const TRUTHSCREEN_BASE_URL = process.env.TRUTHSCREEN_BASE_URL ;
const PAN_ENDPOINT = `${TRUTHSCREEN_BASE_URL}/api/v2.2/idsearch`;

/**
 * Verify PAN number
 * @param {string} panNumber - PAN number to verify
 * @param {string} name - Name to verify (optional, for future use)
 * @returns {Promise<Object>} - PAN verification result
 */
export const verifyPan = async (panNumber, name) => {
    try {
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
  
      const input = {
        transID: `TS${Date.now()}`,
        docType: "2", // PAN (as string)
        docNumber: panNumber.toUpperCase()
      };
  
      console.log('📝 Input data:', JSON.stringify(input));
      
      // Use the correct encryption method from utils
      const encryptedRequest = encrypt(JSON.stringify(input), TRUTHSCREEN_PASSWORD);
      console.log("encryptedRequest",encryptedRequest);
      
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
  
      const response = await axios.post(`${TRUTHSCREEN_BASE_URL}/api/v2.2/idsearch`, payload, { headers });
      console.log("📡 Response status:", response.status);
      console.log("📡 Response data keys:", Object.keys(response.data || {}));
      
      if (response.data && response.data.responseData) {
        // Use the correct decryption method from utils
        const decryptedData = decrypt(response.data.responseData, TRUTHSCREEN_PASSWORD);
        console.log("result:", decryptedData);
        console.log('✅ Decrypted Response:', decryptedData);
        
        let result;
        if (typeof decryptedData === 'string') {
          try {
            result = JSON.parse(decryptedData);
          } catch (parseError) {
            console.error('JSON parse error:', parseError);
            result = decryptedData;
          }
        } else {
          result = decryptedData;
        }
        // Transform the response to match the expected format
        return {
          valid: Boolean(result.status === 1),
          message: result.msg?.StatusDescription || 'PAN verification completed',
          status: result.status === 1 ? 'VALID' : 'INVALID',
          data: result.msg,
          panNumber: panNumber.toUpperCase(),
          transactionId: input.transID,
          name: result.msg?.Name,
          nameOnCard: result.msg?.NameOnTheCard,
          panStatus: result.msg?.STATUS,
          panHolderType: result.msg?.PanHolderStatusType,
          lastUpdate: result.msg?.LastUpdate,
          verificationDate: new Date().toISOString()
        };
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
    } 
      catch (error) {
      console.error('❌ PAN Verification Error Details:');
      console.error('- Status:', error.response?.status);
      console.error('- Status Text:', error.response?.statusText);
      console.error('- Response Data:', error.response?.data);
      console.error('- Error Message:', error.message);
      
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
  

