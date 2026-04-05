import httpStatus from 'http-status';
import ApiError from '../utils/ApiError.js';
import { parseMessage } from './aiAgent.service.js';
import { findBestSingleMatch, findBestSubcategoryMatchForCategory } from './vectorEmbedding.service.js';
import { namesMatchLoosely } from '../utils/textSimilarity.js';
import MandiCategoryPrice from '../models/MandiRates.model.js';
import Mandi from '../models/Mandi.model.js';
import Category from '../models/category.modal.js';
import SubCategory from '../models/subCategory.modal.js';

const LOG_PREFIX = '[marketRateParser]';

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
  if (!subCategoryName || !category) {
    console.log(LOG_PREFIX, 'matchSubCategory: skip — missing subCategoryName or category', {
      subCategoryName,
      categoryId: category?._id,
    });
    return null;
  }

  const categorySubCategories = await SubCategory.find({ categoryId: category._id });

  // 1) String-first: case, spacing, word order, typos — no embeddings required
  for (const subCat of categorySubCategories) {
    if (namesMatchLoosely(subCategoryName, subCat.name)) {
      return {
        _id: subCat._id,
        name: subCat.name,
        similarity: 0.96,
        isFuzzyMatch: true,
      };
    }
  }

  // 2) Embeddings only among this category's subcategories (avoids wrong-category global hits)
  const scoped = await findBestSubcategoryMatchForCategory(subCategoryName, category._id);
  if (scoped) {
    return {
      _id: scoped._id,
      name: scoped.name,
      similarity: scoped.similarity,
    };
  }

  // 3) Global vector match — keep only if it belongs to this category
  const match = await findBestSingleMatch(subCategoryName, 'subcategory');

  if (match && match.originalId) {
    const subCategory = await SubCategory.findById(match.originalId._id || match.originalId);
    if (subCategory && category && subCategory.categoryId.toString() === category._id.toString()) {
      return {
        _id: subCategory._id,
        name: subCategory.name,
        similarity: match.similarity,
      };
    }
    if (subCategory) {
      console.log(LOG_PREFIX, 'matchSubCategory: vector hit but wrong parent category', {
        parsedSubCategory: subCategoryName,
        matchedSubCatName: subCategory.name,
        matchedSubCatCategoryId: subCategory.categoryId?.toString(),
        expectedCategoryId: category._id?.toString(),
        similarity: match.similarity,
      });
    }
  }

  if (category.matchedSubCategory) {
    return category.matchedSubCategory;
  }

  console.log(LOG_PREFIX, 'matchSubCategory: unresolved after fuzzy + strategies', {
    subCategoryName,
    categoryName: category.name,
    categoryId: category._id?.toString(),
  });
  return null;
};

/**
 * Match extracted mandi name against vector embeddings with auto-creation
 * @param {string} mandiName - Mandi name from parsed data
 * @param {boolean} autoCreate - Whether to auto-create if not found
 * @returns {Promise<Object|null>} Matched or created mandi with ObjectId or null
 */
const matchMandi = async (mandiName, autoCreate = false) => {
  if (!mandiName) return null;

  // Filter out invalid mandi names
  const invalidNames = ['unknown', 'null', 'none', ''];
  const cleanedName = mandiName.replace(/^Mandi\s+/i, '').trim();
  
  if (invalidNames.includes(cleanedName.toLowerCase())) {
    return null;
  }

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
    const mandi = await Mandi.findById(match.originalId._id || match.originalId);
    // Don't return mandis with Unknown state or null city
    if (mandi && mandi.state && mandi.state.toLowerCase() !== 'unknown' && mandi.city) {
      return {
        _id: mandi._id,
        name: mandi.mandiname || mandi.city,
        similarity: match.similarity || 0.9,
      };
    }
  }

  // Don't auto-create mandis with unknown state - skip them instead
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

  for (let idx = 0; idx < parsedData.rates.length; idx++) {
    const rate = parsedData.rates[idx];
    console.log(LOG_PREFIX, `rate[${idx}] from AI`, {
      category: rate.category,
      subCategory: rate.subCategory,
      mandiPricesCount: (rate.mandiPrices || []).length,
    });

    // Skip if category is null, unknown, or empty
    if (!rate.category || rate.category.toLowerCase() === 'null' || rate.category.toLowerCase() === 'unknown' || rate.category.trim() === '') {
      warnings.push(`Skipping rate with invalid category: '${rate.category}'`);
      console.log(LOG_PREFIX, `rate[${idx}] skipped: invalid category`);
      continue;
    }

    // Match category using vector data to understand relationships
    const category = await matchCategory(rate.category);
    if (!category) {
      warnings.push(`Could not match category: '${rate.category}'`);
      console.log(LOG_PREFIX, `rate[${idx}] skipped: category not matched`, { rawCategory: rate.category });
      continue;
    }

    console.log(LOG_PREFIX, `rate[${idx}] matched category`, {
      rawCategory: rate.category,
      resolvedName: category.name,
      categoryId: category._id?.toString(),
      isFromSubCategory: !!category.isFromSubCategory,
      matchedSubCategory: category.matchedSubCategory || null,
    });

    if (category.similarity && category.similarity < 0.9) {
      warnings.push(`Category '${rate.category}' matched with low confidence (${category.similarity.toFixed(2)})`);
    }

    // Match subcategory - if items are listed under a category, they should be subcategories
    let subCategory = null;
    
    // If category was matched via subcategory, use that subcategory
    if (category.matchedSubCategory) {
      subCategory = category.matchedSubCategory;
      console.log(LOG_PREFIX, `rate[${idx}] subCategory from category.matchedSubCategory`, {
        name: subCategory?.name,
        _id: subCategory?._id?.toString?.() || subCategory?._id,
      });
    } else if (rate.subCategory) {
      // Skip if subcategory is null, unknown, or empty
      if (rate.subCategory.toLowerCase() === 'null' || rate.subCategory.toLowerCase() === 'unknown' || rate.subCategory.trim() === '') {
        warnings.push(`Skipping rate with invalid subcategory: '${rate.subCategory}'`);
        console.log(LOG_PREFIX, `rate[${idx}] skipped: invalid subcategory string from AI`, { subCategory: rate.subCategory });
        continue;
      }
      
      // Try to match the provided subcategory using vector embeddings
      subCategory = await matchSubCategory(rate.subCategory, category);
      if (subCategory) {
        console.log(LOG_PREFIX, `rate[${idx}] subCategory matched`, {
          aiSubCategory: rate.subCategory,
          resolvedName: subCategory.name,
          subCategoryId: subCategory._id?.toString?.() || subCategory._id,
        });
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

    if (!subCategory) {
      warnings.push(
        `Skipping rate (not saved): resolved subcategory is required for category '${category.name}'` +
          (rate.subCategory ? ` (AI subcategory: '${rate.subCategory}' could not be matched)` : ` (no subcategory in parsed data)`)
      );
      console.log(LOG_PREFIX, `rate[${idx}] NOT SAVED: subCategory required — null or unmatched`, {
        category: category.name,
        aiSubCategory: rate.subCategory,
      });
      continue;
    }

    // Process mandi prices
    const matchedMandiPrices = [];
    for (const mandiPrice of rate.mandiPrices || []) {
      // Skip if mandi is null, unknown, or empty
      if (!mandiPrice.mandi || mandiPrice.mandi.toLowerCase() === 'null' || mandiPrice.mandi.toLowerCase() === 'unknown' || mandiPrice.mandi.trim() === '') {
        warnings.push(`Skipping price with invalid mandi: '${mandiPrice.mandi}'`);
        continue;
      }

      const mandi = await matchMandi(mandiPrice.mandi, false); // Don't auto-create
      
      if (!mandi) {
        warnings.push(`Could not match mandi: '${mandiPrice.mandi}' (skipped to avoid unknown state)`);
        continue;
      }

      if (mandi.similarity && mandi.similarity < 0.9) {
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

    // Only add rate if it has valid mandi prices
    if (matchedMandiPrices.length > 0) {
      matchedRates.push({
        category: category.name,
        categoryId: category._id,
        subCategory: subCategory ? subCategory.name : null,
        subCategoryId: subCategory ? subCategory._id : null,
        mandiPrices: matchedMandiPrices,
      });
    } else {
      console.log(LOG_PREFIX, `rate[${idx}] NOT SAVED: no mandi prices matched (all mandis skipped or invalid)`, {
        category: category.name,
        subCategory: subCategory ? subCategory.name : null,
        rawMandiPrices: rate.mandiPrices,
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
 * @returns {Promise<Object>} Updated documents count
 */
const updateDatabase = async (matchedData, date, time) => {
  const updatedDocuments = [];
  let mandiCategoryPricesCount = 0;

  console.log(LOG_PREFIX, 'updateDatabase', {
    date,
    time,
    matchedRatesCount: matchedData.matchedRates?.length ?? 0,
  });

  for (const rate of matchedData.matchedRates) {
    // Skip if category is null or unknown
    if (!rate.category || rate.category.toLowerCase() === 'null' || rate.category.toLowerCase() === 'unknown') {
      continue;
    }

    const subCategoryValue = (rate.subCategory &&
        rate.subCategory.toLowerCase() !== 'null' &&
        rate.subCategory.toLowerCase() !== 'unknown' &&
        rate.subCategory.trim() !== '')
      ? rate.subCategory
      : null;

    if (!subCategoryValue) {
      console.log(LOG_PREFIX, 'updateDatabase: skip — subCategory is required; will not persist null', {
        category: rate.category,
      });
      continue;
    }

    for (const mandiPrice of rate.mandiPrices) {
      // Skip if mandi is invalid
      if (!mandiPrice.mandi) {
        continue;
      }

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
          cp.subCategory === subCategoryValue &&
          cp.date &&
          new Date(cp.date).toISOString().split('T')[0] === dateObj.toISOString().split('T')[0] &&
          cp.time === time
      );

      const categoryPriceData = {
        category: rate.category,
        subCategory: subCategoryValue,
        price: mandiPrice.price,
        priceDifference: mandiPrice.priceDifference || null,
        unit: mandiPrice.unit || 'Ton',
        date: dateObj,
        time: time,
      };

      if (existingPriceIndex >= 0) {
        // Update existing price
        mandiCategoryPrice.categoryPrices[existingPriceIndex] = categoryPriceData;
        console.log(LOG_PREFIX, 'updateDatabase: replaced existing row (same date/time/category/subCategory)', {
          mandiId: mandiPrice.mandi?.toString?.(),
          category: rate.category,
          subCategory: subCategoryValue,
          date,
          time,
        });
      } else {
        // Add new price
        mandiCategoryPrice.categoryPrices.push(categoryPriceData);
        mandiCategoryPricesCount++;
        console.log(LOG_PREFIX, 'updateDatabase: appended new price row', {
          mandiId: mandiPrice.mandi?.toString?.(),
          category: rate.category,
          subCategory: subCategoryValue,
          price: mandiPrice.price,
          date,
          time,
        });
      }

      await mandiCategoryPrice.save();
      if (!updatedDocuments.find(doc => doc._id.toString() === mandiCategoryPrice._id.toString())) {
        updatedDocuments.push(mandiCategoryPrice);
      }
    }
  }

  return {
    documents: updatedDocuments,
    count: mandiCategoryPricesCount,
  };
};

/**
 * Main function to parse message and update database
 * @param {string} message - Raw message text
 * @returns {Promise<Object>} Result with parsed data, matches, and updates
 */
const parseAndUpdate = async (message) => {
  // Step 1: Parse message using AI agent
  const parsedData = await parseMessage(message);

  console.log(LOG_PREFIX, 'parseMessage result', {
    date: parsedData.date,
    time: parsedData.time,
    ratesCount: parsedData.rates?.length ?? 0,
    rawRates: parsedData.rates?.map((r, i) => ({
      i,
      category: r.category,
      subCategory: r.subCategory,
      mandiPrices: (r.mandiPrices || []).map((mp) => ({ mandi: mp.mandi, price: mp.price })),
    })),
  });

  // Step 2: Match entities against vector embeddings
  const matchedData = await matchEntities(parsedData);

  console.log(LOG_PREFIX, 'matchEntities summary', {
    matchedRatesCount: matchedData.matchedRates.length,
    warningsCount: matchedData.warnings.length,
    warnings: matchedData.warnings,
  });

  // Step 3: Update database
  const updateResult = await updateDatabase(
    matchedData,
    parsedData.date,
    parsedData.time
  );

  // Extract unique matched mandis (we don't create new ones anymore)
  const matchedMandiIds = new Set();
  const matchedMandis = [];
  for (const rate of matchedData.matchedRates) {
    for (const mandiPrice of rate.mandiPrices) {
      if (!matchedMandiIds.has(mandiPrice.mandi.toString())) {
        matchedMandiIds.add(mandiPrice.mandi.toString());
        matchedMandis.push({
          _id: mandiPrice.mandi,
          name: mandiPrice.mandiName,
        });
      }
    }
  }

  return {
    parsed: parsedData,
    matched: {
      categories: [...new Set(matchedData.matchedRates.map((r) => r.category))],
      subCategories: [...new Set(matchedData.matchedRates
        .map((r) => r.subCategory)
        .filter((sc) => sc !== null && sc !== 'null' && sc !== 'unknown'))],
      mandis: [...new Set(matchedData.matchedRates.flatMap((r) => r.mandiPrices.map((mp) => mp.mandiName)))],
    },
    created: {
      mandis: matchedMandis, // These are matched mandis, not newly created
    },
    updated: {
      mandiCategoryPrices: updateResult.count,
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

