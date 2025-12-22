import OpenAI from 'openai';
import config from '../config/config.js';
import { removeEmojis, removeSpecialChars } from '../utils/textCleaner.js';

const openai = new OpenAI({
  apiKey: config.openai.apiKey,
});

/**
 * System prompt for OpenAI to parse market rate messages
 */
const SYSTEM_PROMPT = `You are an expert at parsing Indian steel market rate messages. Extract structured data from unstructured text.

Rules:
1. Extract date in format: YYYY-MM-DD (if date is in DD-MM-YYYY format, convert it)
2. Extract time in 12-hour format: "HH:MM AM/PM" (e.g., "11:00 AM", "03:45 PM")
3. Identify categories (main product types like "M.S Ingot", "Old Scrap", "Pig Iron Foundry Grade")
4. Identify subcategories (if mentioned, like "Melting Scrap", "End cutting", "CRC scrap")
5. Extract mandi names and their prices
6. Extract price differences (numbers in parentheses like (+0), (-100), (+500))
7. Infer unit (default: "Ton" for bulk commodities, "Kg" for smaller quantities)
8. Handle variations in mandi names (e.g., "Mandi Gobindgarh" = "Gobindgarh", remove "Mandi" prefix if present)
9. Handle category variations (e.g., "M.S Ingot" = "MS Ingot", "M.S" = "MS")

Output format: JSON only, no markdown. Use this exact structure:
{
  "date": "YYYY-MM-DD",
  "time": "HH:MM AM/PM",
  "rates": [
    {
      "category": "Category Name",
      "subCategory": "SubCategory Name or null",
      "mandiPrices": [
        {
          "mandi": "Mandi Name",
          "price": number,
          "priceDifference": number or null,
          "unit": "Ton" or "Kg"
        }
      ]
    }
  ]
}`;

/**
 * Clean message text before parsing
 * @param {string} message - Raw message text
 * @returns {string} Cleaned message
 */
const cleanMessage = (message) => {
  if (!message) return '';
  
  let cleaned = removeEmojis(message);
  cleaned = removeSpecialChars(cleaned);
  
  // Remove URLs
  cleaned = cleaned.replace(/https?:\/\/[^\s]+/g, '');
  
  // Remove contact numbers
  cleaned = cleaned.replace(/\*?\d{10,}\*?/g, '');
  
  // Remove common footer text
  cleaned = cleaned.replace(/Please Download.*/gi, '');
  cleaned = cleaned.replace(/Please Subscribe.*/gi, '');
  cleaned = cleaned.replace(/Fast Service.*/gi, '');
  cleaned = cleaned.replace(/WhatsApp.*/gi, '');
  cleaned = cleaned.replace(/Contact no.*/gi, '');
  
  return cleaned.trim();
};

/**
 * Parse market rate message using OpenAI
 * @param {string} message - Raw message text
 * @returns {Promise<Object>} Parsed structured data
 */
const parseMessage = async (message) => {
  if (!message || !message.trim()) {
    throw new Error('Message is required for parsing');
  }

  const cleanedMessage = cleanMessage(message);

  try {
    const response = await openai.chat.completions.create({
      model: config.openai.model,
      messages: [
        {
          role: 'system',
          content: SYSTEM_PROMPT,
        },
        {
          role: 'user',
          content: `Parse this market rate message and extract all rates:\n\n${cleanedMessage}`,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.1, // Low temperature for consistent parsing
    });

    const content = response.choices[0].message.content;
    
    // Parse JSON response
    let parsedData;
    try {
      parsedData = JSON.parse(content);
    } catch (parseError) {
      // Try to extract JSON from markdown code blocks if present
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || content.match(/```\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        parsedData = JSON.parse(jsonMatch[1]);
      } else {
        throw new Error(`Failed to parse JSON response: ${parseError.message}`);
      }
    }

    // Validate parsed data structure
    if (!parsedData.date || !parsedData.rates || !Array.isArray(parsedData.rates)) {
      throw new Error('Invalid parsed data structure: missing date or rates array');
    }

    // Normalize date format
    if (parsedData.date) {
      parsedData.date = normalizeDate(parsedData.date);
    }

    // Normalize time format
    if (parsedData.time) {
      parsedData.time = normalizeTime(parsedData.time);
    }

    return parsedData;
  } catch (error) {
    if (error instanceof OpenAI.APIError) {
      throw new Error(`OpenAI API error: ${error.message}`);
    }
    throw error;
  }
};

/**
 * Normalize date to YYYY-MM-DD format
 * @param {string} dateStr - Date string in various formats
 * @returns {string} Normalized date
 */
const normalizeDate = (dateStr) => {
  if (!dateStr) return new Date().toISOString().split('T')[0];

  // Handle DD-MM-YYYY format
  const ddmmyyyy = dateStr.match(/(\d{2})-(\d{2})-(\d{4})/);
  if (ddmmyyyy) {
    const [, day, month, year] = ddmmyyyy;
    return `${year}-${month}-${day}`;
  }

  // Handle YYYY-MM-DD format
  const yyyymmdd = dateStr.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (yyyymmdd) {
    return dateStr;
  }

  // Try to parse as Date
  const date = new Date(dateStr);
  if (!isNaN(date.getTime())) {
    return date.toISOString().split('T')[0];
  }

  // Default to today
  return new Date().toISOString().split('T')[0];
};

/**
 * Normalize time to HH:MM AM/PM format
 * @param {string} timeStr - Time string in various formats
 * @returns {string} Normalized time
 */
const normalizeTime = (timeStr) => {
  if (!timeStr) return null;

  // Already in correct format
  if (/^\d{1,2}:\d{2}\s*(AM|PM)$/i.test(timeStr)) {
    return timeStr.toUpperCase().replace(/\s+/g, ' ');
  }

  // Handle 24-hour format
  const time24 = timeStr.match(/(\d{1,2}):(\d{2})/);
  if (time24) {
    const hours = parseInt(time24[1], 10);
    const minutes = time24[2];
    const period = hours >= 12 ? 'PM' : 'AM';
    const hours12 = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours;
    return `${hours12}:${minutes} ${period}`;
  }

  return null;
};

export {
  parseMessage,
  cleanMessage,
  normalizeDate,
  normalizeTime,
};






