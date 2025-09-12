/* using crypto module */
import crypto from 'crypto';

/**
* Encrypt data using AES Cipher (CBC) with 128 bit key
*
* @param {string} plainText - data to encrypt
* @param {string} pass - password shared by AuthBridge (Truthscreen account password)
* @return {string} encrypted data in base64 encoding
*/
function encrypt(plainText, pass) {
  // Generate random IV
  const iv = crypto.randomBytes(16);
  
  // Generate SHA512 hash of password and take first 16 characters for AES-128 key
  const hash = crypto.createHash('sha512');
  const dataKey = hash.update(pass, 'utf-8');
  const genHash = dataKey.digest('hex');
  const key = genHash.substring(0, 16);
  
  // Create cipher with AES-128-CBC
  const cipher = crypto.createCipheriv('aes-128-cbc', Buffer.from(key), iv);
  
  // Encrypt the data
  let requestData = cipher.update(plainText, 'utf-8', 'base64');
  requestData += cipher.final('base64');
  
  // Return encrypted data with IV separated by colon (format: encryptedData:iv)
  return requestData + ':' + iv.toString('base64');
}

/**
* Decrypt data using AES Cipher (CBC) with 128 bit key
*
* @param {string} encText - data to be decrypted in base64 encoding (format: encryptedData:iv)
* @param {string} pass - password shared by AuthBridge (Truthscreen account password)
* @return {string} decrypted data
*/
function decrypt(encText, pass) {
  try {
    // Split encrypted data and IV
    const result = encText.split(':');
    if (result.length !== 2) {
      throw new Error('Invalid encrypted data format');
    }
    
    const encryptedData = result[0];
    const iv = Buffer.from(result[1], 'base64');
    
    // Generate SHA512 hash of password and take first 16 characters for AES-128 key
    const hash = crypto.createHash('sha512');
    const dataKey = hash.update(pass, 'utf-8');
    const genHash = dataKey.digest('hex');
    const key = genHash.substring(0, 16);
    
    // Create decipher with AES-128-CBC
    const decipher = crypto.createDecipheriv('aes-128-cbc', Buffer.from(key), iv);
    
    // Decrypt the data
    let decoded = decipher.update(encryptedData, 'base64', 'utf8');
    decoded += decipher.final('utf8');
    
    return decoded;
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt response data');
  }
}

export { encrypt, decrypt };