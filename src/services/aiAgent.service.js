import OpenAI from 'openai';
import config from '../config/config.js';
import { removeEmojis, removeSpecialChars } from '../utils/textCleaner.js';
import Category from '../models/category.modal.js';
import SubCategory from '../models/subCategory.modal.js';
import Mandi from '../models/Mandi.model.js';

const openai = new OpenAI({
  apiKey: config.openai.apiKey,
});

/**
 * System prompt for OpenAI to parse market rate messages
 */
const SYSTEM_PROMPT = `You are an expert at parsing Indian steel market rate messages. Extract structured data from unstructured text.

IMPORTANT STRUCTURE RULES:
1. When you see a category header like "*FINISH GOODS*" or "*Cast Iron*", this is the MAIN CATEGORY
2. Items listed under a category header (like "Tmt 12mm=45500", "Angle=38100", "Toka=34000") are SUBCATEGORIES, not separate categories
3. If you see "*Mandi [Name]*" as a section header, it's just indicating the mandi location - the items below are still subcategories of the parent category
4. Each subcategory should have its own entry with the mandi name and price

Rules:
1. Extract date in format: YYYY-MM-DD (if date is in DD-MM-YYYY format, convert it)
2. Extract time in 12-hour format: "HH:MM AM/PM" (e.g., "11:00 AM", "03:45 PM")
3. Identify categories (main product types like "Finish Goods", "Cast Iron", "M.S Ingot", "Old Scrap", "Pig Iron Foundry Grade")
4. Identify subcategories (items listed under categories like "Tmt 12mm", "Angle", "T-Iron", "Toka", "Imported", "Ludhiana", "Rolling 9Kg", etc.)
5. Extract mandi names from section headers or price lines (e.g., "Mandi Gobindgarh" = "Gobindgarh", remove "Mandi" prefix)
6. Extract price differences (numbers in parentheses like (+0), (-100), (+500))
7. Infer unit (default: "Ton" for bulk commodities, "Kg" for smaller quantities like "Rolling 9Kg")
8. Handle variations in mandi names (e.g., "Mandi Gobindgarh" = "Gobindgarh", remove "Mandi" prefix if present)
9. Handle category variations (e.g., "M.S Ingot" = "MS Ingot", "M.S" = "MS", "Finish Goods" = "FINISH GOODS")

EXAMPLE STRUCTURE:
If you see:
*FINISH GOODS*
*Mandi Gobindgarh*
Tmt 12mm=45500(+0)
Angle=38100(+0)
T-Iron =48400(+0)

This should be parsed as:
- Category: "Finish Goods"
- Subcategory: "Tmt 12mm", Mandi: "Gobindgarh", Price: 45500
- Subcategory: "Angle", Mandi: "Gobindgarh", Price: 38100
- Subcategory: "T-Iron", Mandi: "Gobindgarh", Price: 48400

Output format: JSON only, no markdown. Use this exact structure:
{
  "date": "YYYY-MM-DD",
  "time": "HH:MM AM/PM",
  "rates": [
    {
      "category": "Category Name",
      "subCategory": "SubCategory Name (REQUIRED if items are listed under category)",
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
}

CRITICAL: If items are listed under a category (like "Tmt 12mm", "Angle", etc.), they MUST be extracted as subcategories, not as separate categories with null subcategories.`;

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
 * Get context about existing categories, subcategories, and mandis from database
 * @returns {Promise<Object>} Context data with lists of entities
 */
const getDatabaseContext = async () => {
  try {
    // Fetch all categories
    const categories = await Category.find({}).select('name').lean();
    const categoryNames = categories.map(cat => cat.name).filter(Boolean);

    // Fetch all subcategories with their parent categories
    const subCategories = await SubCategory.find({})
      .populate('categoryId', 'name')
      .select('name categoryId')
      .lean();
    
    const subCategoryMap = {};
    subCategories.forEach(subCat => {
      if (subCat.name && subCat.categoryId) {
        const categoryName = subCat.categoryId.name;
        if (!subCategoryMap[categoryName]) {
          subCategoryMap[categoryName] = [];
        }
        subCategoryMap[categoryName].push(subCat.name);
      }
    });

    // Fetch all mandis (only valid ones, not with Unknown state)
    const mandis = await Mandi.find({ 
      state: { $ne: 'Unknown', $exists: true },
      city: { $exists: true, $ne: null }
    })
      .select('mandiname city state')
      .lean();
    
    const mandiNames = mandis
      .map(m => m.mandiname || m.city)
      .filter(Boolean)
      .filter((name, index, self) => self.indexOf(name) === index); // Remove duplicates

    return {
      categories: categoryNames,
      subCategories: subCategoryMap,
      mandis: mandiNames,
    };
  } catch (error) {
    console.error('Error fetching database context:', error);
    // Return empty context if there's an error
    return {
      categories: [],
      subCategories: {},
      mandis: [],
    };
  }
};

/**
 * Build enhanced system prompt with database context
 * @param {Object} context - Database context with categories, subcategories, mandis
 * @returns {string} Enhanced system prompt
 */
const buildSystemPrompt = (context) => {
  const { categories, subCategories, mandis } = context;

  let contextSection = '';

  if (categories.length > 0) {
    contextSection += `\n\nEXISTING CATEGORIES IN DATABASE (use these exact names when possible):\n${categories.slice(0, 50).join(', ')}${categories.length > 50 ? ` (and ${categories.length - 50} more)` : ''}`;
  }

  if (Object.keys(subCategories).length > 0) {
    contextSection += '\n\nEXISTING SUBCATEGORIES BY CATEGORY:';
    for (const [categoryName, subCats] of Object.entries(subCategories)) {
      if (subCats.length > 0) {
        contextSection += `\n- ${categoryName}: ${subCats.slice(0, 20).join(', ')}${subCats.length > 20 ? ` (and ${subCats.length - 20} more)` : ''}`;
      }
    }
  }

  if (mandis.length > 0) {
    contextSection += `\n\nEXISTING MANDIS IN DATABASE (use these exact names when possible):\n${mandis.slice(0, 50).join(', ')}${mandis.length > 50 ? ` (and ${mandis.length - 50} more)` : ''}`;
  }

  if (contextSection) {
    contextSection += '\n\nIMPORTANT: When extracting data, try to match the category/subcategory/mandi names to the existing names listed above. Use the exact names from the database when there is a close match.';
  }

  return SYSTEM_PROMPT + contextSection;
};

/**
 * Parse market rate message using OpenAI with database context
 * @param {string} message - Raw message text
 * @returns {Promise<Object>} Parsed structured data
 */
const parseMessage = async (message) => {
  if (!message || !message.trim()) {
    throw new Error('Message is required for parsing');
  }

  const cleanedMessage = cleanMessage(message);

  // Get database context to help AI make better decisions
  const dbContext = await getDatabaseContext();
  const enhancedPrompt = buildSystemPrompt(dbContext);

  try {
    const response = await openai.chat.completions.create({
      model: config.openai.model,
      messages: [
        {
          role: 'system',
          content: enhancedPrompt,
        },
        {
          role: 'user',
          content: `Parse this market rate message and extract all rates. Use the existing categories, subcategories, and mandis from the database context provided above when matching names:\n\n${cleanedMessage}`,
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







