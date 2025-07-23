/* using crypto module */
import crypto from 'crypto';
/**
* Encrypt data using AES Cipher (CBC) with 128 bit key
*
* @param type workingKey -password shared by AuthBridge
* @param type iv - initialization vector
* @param type plainText - data to encrypt
* @return encrypted data in base64 encoding
*/
function encrypt(plainText,pass) {
 var iv = crypto.randomBytes(16);
 const hash = crypto.createHash('sha512');
 const dataKey = hash.update(pass, 'utf-8');
 const genHash = dataKey.digest('hex');
 const key = genHash.substring(0, 16);
 const cipher = crypto.createCipheriv('aes-128-cbc', Buffer.from(key), iv);
 let requestData = cipher.update(plainText, 'utf-8', 'base64');
 requestData += cipher.final('base64')+":"+new Buffer(iv).toString('base64');
 return requestData;
}
/**
* Decrypt data using AES Cipher (CBC) with 128 bit key
*
* @param type workingkey - password shared by AuthBridge
* @param type encText - data to be decrypted in base64 encoding
* @return decrypted data
*/
function decrypt(encText,pass) {
 var m = crypto.createHash('sha512');
 var datakey = m.update(pass, 'utf-8');
 var genHash = datakey.digest('hex');
 var key = genHash.substring(0, 16);
 var result = encText.split(":");
 var iv = Buffer.from(result[1], 'base64');
 var decipher = crypto.createDecipheriv('aes-128-cbc', Buffer.from(key), iv);
 var decoded = decipher.update(result[0],'base64','utf8');
 decoded += decipher.final('utf8');
 return decoded;
};


export { encrypt, decrypt };