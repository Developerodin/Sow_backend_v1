/**
 * Remove emojis and special characters from text
 * @param {string} text - Text to clean
 * @returns {string} Cleaned text
 */
export const removeEmojis = (text) => {
  if (!text) return '';
  
  // Remove emojis using regex
  const emojiRegex = /[\u{1F300}-\u{1F9FF}]|[\u{1F600}-\u{1F64F}]|[\u{1F680}-\u{1F6FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F900}-\u{1F9FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{1F018}-\u{1F270}]/gu;
  
  return text.replace(emojiRegex, '').trim();
};

/**
 * Remove special formatting characters but keep basic punctuation
 * @param {string} text - Text to clean
 * @returns {string} Cleaned text
 */
export const removeSpecialChars = (text) => {
  if (!text) return '';
  
  // Remove special Unicode characters but keep basic punctuation
  return text
    .replace(/[➖➖➖]/g, '') // Remove separator lines
    .replace(/[👑🅚🅘🅝🅖🅢🅣🅔🅔🅛🔶🗓️⏱️👇🏻]/g, '') // Remove specific emojis
    .replace(/\*+/g, '') // Remove asterisks
    .replace(/_+/g, '') // Remove underscores
    .trim();
};

/**
 * Normalize text for better matching
 * @param {string} text - Text to normalize
 * @returns {string} Normalized text
 */
export const normalizeText = (text) => {
  if (!text) return '';
  
  return text
    .toLowerCase()
    .replace(/\s+/g, ' ') // Multiple spaces to single space
    .replace(/[^\w\s]/g, '') // Remove punctuation
    .trim();
};

/**
 * Clean text for embedding generation
 * @param {string} text - Text to clean
 * @returns {string} Cleaned text
 */
export const cleanForEmbedding = (text) => {
  if (!text) return '';
  
  let cleaned = removeEmojis(text);
  cleaned = removeSpecialChars(cleaned);
  cleaned = normalizeText(cleaned);
  
  return cleaned;
};

/**
 * Extract price from text (handles various formats)
 * @param {string} text - Text containing price
 * @returns {number|null} Extracted price or null
 */
export const extractPrice = (text) => {
  if (!text) return null;
  
  // Remove commas and extract numbers
  const priceMatch = text.match(/[\d,]+/);
  if (!priceMatch) return null;
  
  const priceStr = priceMatch[0].replace(/,/g, '');
  const price = parseInt(priceStr, 10);
  
  return isNaN(price) ? null : price;
};

/**
 * Extract price difference from text (e.g., (+0), (-100), (+500))
 * @param {string} text - Text containing price difference
 * @returns {number|null} Extracted price difference or null
 */
export const extractPriceDifference = (text) => {
  if (!text) return null;
  
  const diffMatch = text.match(/\(([+-]?\d+)\)/);
  if (!diffMatch) return null;
  
  const diff = parseInt(diffMatch[1], 10);
  return isNaN(diff) ? null : diff;
};






