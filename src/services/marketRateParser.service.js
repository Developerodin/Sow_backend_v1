import httpStatus from 'http-status';
import ApiError from '../utils/ApiError.js';
import { parseMessage } from './aiAgent.service.js';
import { findBestSingleMatch, storeEmbedding } from './vectorEmbedding.service.js';
import MandiCategoryPrice from '../models/MandiRates.model.js';
import Mandi from '../models/Mandi.model.js';
import Category from '../models/category.modal.js';
import SubCategory from '../models/subCategory.modal.js';

/**
 * Match extracted category name against vector embeddings
 * Uses vector data to understand relationships (e.g., "News Paper" → "Paper" category)
 * @param {string} categoryName - Category name from parsed data
 * @returns {Promise<Object|null>} Matched category with ObjectId or null
 */
const matchCategory = async (categoryName) => {
  if (!categoryName) return null;

  // Strategy 1: First try to match as subcategory to find parent category
  // This handles cases like "News Paper" which is a subcategory of "Paper"
  const subCategoryMatch = await findBestSingleMatch(categoryName, 'subcategory');
  if (subCategoryMatch && subCategoryMatch.originalId) {
    const subCategory = await SubCategory.findById(subCategoryMatch.originalId._id || subCategoryMatch.originalId).populate('categoryId');
    if (subCategory && subCategory.categoryId) {
      return {
        _id: subCategory.categoryId._id,
        name: subCategory.categoryId.name,
        similarity: subCategoryMatch.similarity,
        isFromSubCategory: true, // Flag to indicate this was matched via subcategory
        matchedSubCategory: {
          _id: subCategory._id,
          name: subCategory.name,
        },
      };
    }
  }

  // Strategy 2: Try to match directly as category
  let match = await findBestSingleMatch(categoryName, 'category');
  
  if (match && match.originalId) {
    return {
      _id: match.originalId._id || match.originalId,
      name: match.originalId.name || categoryName,
      similarity: match.similarity,
    };
  }

  // Strategy 3: Try fuzzy matching with existing categories
  // Check if the parsed name contains or is contained in any category name
  const allCategories = await Category.find({});
  const searchNameLower = categoryName.toLowerCase().trim();
  
  for (const cat of allCategories) {
    const catNameLower = (cat.name || '').toLowerCase().trim();
    
    // Check if category name contains search term or vice versa
    // e.g., "News Paper" contains "Paper", or "Paper" is in "News Paper"
    if (catNameLower === searchNameLower ||
        catNameLower.includes(searchNameLower) || 
        searchNameLower.includes(catNameLower) ||
        searchNameLower.replace(/\s+/g, '') === catNameLower.replace(/\s+/g, '')) {
      // Found a potential match, verify with vector matching
      const embeddingMatch = await findBestSingleMatch(cat.name, 'category');
      if (embeddingMatch && embeddingMatch.originalId) {
        return {
          _id: cat._id,
          name: cat.name,
          similarity: embeddingMatch.similarity || 0.85,
          isFuzzyMatch: true,
        };
      }
    }
  }

  return null;
};

/**
 * Match extracted subcategory name against vector embeddings
 * Uses vector data to find the correct subcategory within a category
 * @param {string} subCategoryName - Subcategory name from parsed data
 * @param {Object} category - Matched category object
 * @returns {Promise<Object|null>} Matched subcategory with ObjectId or null
 */
const matchSubCategory = async (subCategoryName, category) => {
  if (!subCategoryName || !category) return null;

  // Strategy 1: Try vector matching first
  const match = await findBestSingleMatch(subCategoryName, 'subcategory');
  
  if (match && match.originalId) {
    // Verify subcategory belongs to the matched category
    const subCategory = await SubCategory.findById(match.originalId._id || match.originalId);
    if (subCategory && category && subCategory.categoryId.toString() === category._id.toString()) {
      return {
        _id: subCategory._id,
        name: subCategory.name,
        similarity: match.similarity,
      };
    }
  }

  // Strategy 2: Try fuzzy matching within the category
  // Search all subcategories of this category
  const categorySubCategories = await SubCategory.find({ categoryId: category._id });
  const searchNameLower = subCategoryName.toLowerCase().trim();
  
  for (const subCat of categorySubCategories) {
    const subCatNameLower = (subCat.name || '').toLowerCase().trim();
    
    // Check if names match or contain each other
    if (subCatNameLower === searchNameLower ||
        subCatNameLower.includes(searchNameLower) || 
        searchNameLower.includes(subCatNameLower) ||
        searchNameLower.replace(/\s+/g, '') === subCatNameLower.replace(/\s+/g, '')) {
      // Found a potential match, verify with vector matching
      const embeddingMatch = await findBestSingleMatch(subCat.name, 'subcategory');
      if (embeddingMatch && embeddingMatch.originalId) {
        return {
          _id: subCat._id,
          name: subCat.name,
          similarity: embeddingMatch.similarity || 0.85,
          isFuzzyMatch: true,
        };
      }
    }
  }

  // Strategy 3: If category was matched via subcategory, use that subcategory
  if (category.matchedSubCategory) {
    return category.matchedSubCategory;
  }

  return null;
};

/**
 * Match extracted mandi name against vector embeddings with auto-creation
 * @param {string} mandiName - Mandi name from parsed data
 * @param {boolean} autoCreate - Whether to auto-create if not found
 * @returns {Promise<Object|null>} Matched or created mandi with ObjectId or null
 */
const matchMandi = async (mandiName, autoCreate = true) => {
  if (!mandiName) return null;

  // Remove "Mandi" prefix if present and clean
  let cleanedName = mandiName.replace(/^Mandi\s+/i, '').trim();
  
  // Try matching with original name first
  let match = await findBestSingleMatch(cleanedName, 'mandi');
  
  // If not found, try with "Mandi" prefix
  if (!match || !match.originalId) {
    const withPrefix = `Mandi ${cleanedName}`;
    match = await findBestSingleMatch(withPrefix, 'mandi');
  }
  
  // If still not found, try direct database lookup for fuzzy matching
  if (!match || !match.originalId) {
    const allMandis = await Mandi.find({});
    const searchNameLower = cleanedName.toLowerCase();
    
    for (const mandi of allMandis) {
      const mandiCity = (mandi.city || '').toLowerCase();
      const mandiNameLower = (mandi.mandiname || '').toLowerCase();
      
      // Direct match or contains match (handle variations like "Tamil Naidu" → "Tamil Nadu")
      if (mandiCity === searchNameLower || mandiNameLower === searchNameLower ||
          mandiCity.includes(searchNameLower) || searchNameLower.includes(mandiCity) ||
          mandiNameLower.includes(searchNameLower) || searchNameLower.includes(mandiNameLower) ||
          // Handle common misspellings
          (searchNameLower.includes('naidu') && mandiCity.includes('nadu')) ||
          (searchNameLower.includes('nadu') && mandiCity.includes('naidu'))) {
        // Found a match, get the embedding
        const embeddingMatch = await findBestSingleMatch(mandi.mandiname || mandi.city, 'mandi');
        if (embeddingMatch && embeddingMatch.originalId) {
          match = embeddingMatch;
          break;
        }
      }
    }
  }
  
  if (match && match.originalId) {
    return {
      _id: match.originalId._id || match.originalId,
      name: match.originalId.mandiname || match.originalId.city || cleanedName,
      similarity: match.similarity || 0.9, // Default high similarity for direct matches
    };
  }

  // Auto-create mandi if not found and autoCreate is true
  if (autoCreate) {
    try {
      // Check if mandi already exists (case-insensitive, by city)
      const existingMandi = await Mandi.findOne({
        $or: [
          { city: { $regex: new RegExp(`^${cleanedName}$`, 'i') } },
          { mandiname: { $regex: new RegExp(`^${cleanedName}$`, 'i') } }
        ]
      });

      if (existingMandi) {
        // Generate embedding for existing mandi
        await storeEmbedding({
          type: 'mandi',
          originalId: existingMandi._id,
          text: existingMandi.mandiname || existingMandi.city,
          aliases: [cleanedName, `Mandi ${cleanedName}`],
        });
        return {
          _id: existingMandi._id,
          name: existingMandi.mandiname || existingMandi.city,
          similarity: 1.0,
          wasCreated: false,
        };
      }

      // Create new mandi (use cleanedName as city, state will be null)
      const newMandi = await Mandi.create({
        mandiname: cleanedName,
        city: cleanedName,
        state: 'Unknown', // Will need to be updated manually
        categories: [], // Empty categories array
      });

      // Generate and store embedding
      await storeEmbedding({
        type: 'mandi',
        originalId: newMandi._id,
        text: newMandi.mandiname || newMandi.city,
        aliases: [cleanedName, `Mandi ${cleanedName}`],
      });

      return {
        _id: newMandi._id,
        name: newMandi.mandiname || newMandi.city,
        similarity: 1.0,
        wasCreated: true,
      };
    } catch (error) {
      // Handle errors (might be duplicate)
      const existingMandi = await Mandi.findOne({
        $or: [
          { city: { $regex: new RegExp(`^${cleanedName}$`, 'i') } },
          { mandiname: { $regex: new RegExp(`^${cleanedName}$`, 'i') } }
        ]
      });
      if (existingMandi) {
        await storeEmbedding({
          type: 'mandi',
          originalId: existingMandi._id,
          text: existingMandi.mandiname || existingMandi.city,
        });
        return {
          _id: existingMandi._id,
          name: existingMandi.mandiname || existingMandi.city,
          similarity: 1.0,
          wasCreated: false,
        };
      }
      throw error;
    }
  }

  return null;
};

/**
 * Process parsed rates and match against database entities with auto-creation
 * @param {Object} parsedData - Parsed data from AI agent
 * @returns {Promise<Object>} Matched data with warnings and created entities
 */
const matchEntities = async (parsedData) => {
  const warnings = [];
  const matchedRates = [];
  const createdEntities = {
    categories: [],
    subCategories: [],
  };

  for (const rate of parsedData.rates) {
    // Match category using vector data to understand relationships
    const category = await matchCategory(rate.category);
    if (!category) {
      warnings.push(`Could not match category: '${rate.category}'`);
      continue;
    }

    if (category.similarity && category.similarity < 0.9) {
      warnings.push(`Category '${rate.category}' matched with low confidence (${category.similarity.toFixed(2)})`);
    }

    // Match subcategory (optional)
    let subCategory = null;
    
    // If category was matched via subcategory, use that subcategory
    if (category.matchedSubCategory) {
      subCategory = category.matchedSubCategory;
    } else if (rate.subCategory) {
      // Try to match the provided subcategory
      subCategory = await matchSubCategory(rate.subCategory, category);
      if (!subCategory && rate.subCategory) {
        warnings.push(`Could not match subcategory: '${rate.subCategory}' under category '${category.name}'`);
      }
    } else if (category.isFromSubCategory) {
      // If category was matched via subcategory but no matchedSubCategory object, find it
      const subCategoryMatch = await findBestSingleMatch(rate.category, 'subcategory');
      if (subCategoryMatch && subCategoryMatch.originalId) {
        const subCat = await SubCategory.findById(subCategoryMatch.originalId._id || subCategoryMatch.originalId);
        if (subCat && subCat.categoryId.toString() === category._id.toString()) {
          subCategory = {
            _id: subCat._id,
            name: subCat.name,
            similarity: subCategoryMatch.similarity,
          };
        }
      }
    }

    // Process mandi prices
    const matchedMandiPrices = [];
    for (const mandiPrice of rate.mandiPrices || []) {
      const mandi = await matchMandi(mandiPrice.mandi, true);
      
      if (!mandi) {
        warnings.push(`Could not match or create mandi: '${mandiPrice.mandi}'`);
        continue;
      }

      // Note: Mandis can still be auto-created if needed, but categories/subcategories cannot

      if (mandi.similarity && mandi.similarity < 0.9 && !mandi.wasCreated) {
        warnings.push(`Mandi '${mandiPrice.mandi}' matched with low confidence (${mandi.similarity.toFixed(2)})`);
      }

      matchedMandiPrices.push({
        mandi: mandi._id,
        mandiName: mandi.name,
        price: mandiPrice.price,
        priceDifference: mandiPrice.priceDifference || null,
        unit: mandiPrice.unit || 'Ton',
      });
    }

    if (matchedMandiPrices.length > 0) {
      matchedRates.push({
        category: category.name,
        categoryId: category._id,
        subCategory: subCategory ? subCategory.name : null,
        subCategoryId: subCategory ? subCategory._id : null,
        mandiPrices: matchedMandiPrices,
      });
    }
  }

  return {
    matchedRates,
    warnings,
    createdEntities: {
      mandis: createdEntities.mandis || [],
    },
  };
};

/**
 * Update database with matched rates
 * @param {Object} matchedData - Matched data from matchEntities
 * @param {string} date - Date string (YYYY-MM-DD)
 * @param {string} time - Time string (HH:MM AM/PM)
 * @returns {Promise<Array>} Updated MandiCategoryPrice documents
 */
const updateDatabase = async (matchedData, date, time) => {
  const updatedDocuments = [];

  for (const rate of matchedData.matchedRates) {
    for (const mandiPrice of rate.mandiPrices) {
      // Find or create MandiCategoryPrice document
      let mandiCategoryPrice = await MandiCategoryPrice.findOne({
        mandi: mandiPrice.mandi,
      });

      if (!mandiCategoryPrice) {
        mandiCategoryPrice = await MandiCategoryPrice.create({
          mandi: mandiPrice.mandi,
          categoryPrices: [],
        });
      }

      // Check if category price already exists for this date/time
      const dateObj = new Date(date);
      const existingPriceIndex = mandiCategoryPrice.categoryPrices.findIndex(
        (cp) =>
          cp.category === rate.category &&
          cp.subCategory === (rate.subCategory || null) &&
          cp.date &&
          new Date(cp.date).toISOString().split('T')[0] === dateObj.toISOString().split('T')[0] &&
          cp.time === time
      );

      const categoryPriceData = {
        category: rate.category,
        subCategory: rate.subCategory || null,
        price: mandiPrice.price,
        priceDifference: mandiPrice.priceDifference,
        unit: mandiPrice.unit,
        date: dateObj,
        time: time,
      };

      if (existingPriceIndex >= 0) {
        // Update existing price
        mandiCategoryPrice.categoryPrices[existingPriceIndex] = categoryPriceData;
      } else {
        // Add new price
        mandiCategoryPrice.categoryPrices.push(categoryPriceData);
      }

      await mandiCategoryPrice.save();
      updatedDocuments.push(mandiCategoryPrice);
    }
  }

  return updatedDocuments;
};

/**
 * Main function to parse message and update database
 * @param {string} message - Raw message text
 * @returns {Promise<Object>} Result with parsed data, matches, and updates
 */
const parseAndUpdate = async (message) => {
  // Step 1: Parse message using AI agent
  const parsedData = await parseMessage(message);

  // Step 2: Match entities against vector embeddings
  const matchedData = await matchEntities(parsedData);

  // Step 3: Update database
  const updatedDocuments = await updateDatabase(
    matchedData,
    parsedData.date,
    parsedData.time
  );

  return {
    parsed: parsedData,
    matched: {
      categories: matchedData.matchedRates.map((r) => r.category),
      subCategories: matchedData.matchedRates
        .map((r) => r.subCategory)
        .filter((sc) => sc !== null),
      mandis: [...new Set(matchedData.matchedRates.flatMap((r) => r.mandiPrices.map((mp) => mp.mandiName)))],
    },
    created: matchedData.createdEntities,
    updated: {
      mandiCategoryPrices: updatedDocuments.length,
    },
    warnings: matchedData.warnings,
  };
};

export {
  parseAndUpdate,
  matchCategory,
  matchSubCategory,
  matchMandi,
  matchEntities,
  updateDatabase,
};

