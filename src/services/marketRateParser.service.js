import httpStatus from 'http-status';
import ApiError from '../utils/ApiError.js';
import OpenAI from 'openai';
import config from '../config/config.js';
import { parseMessage } from './aiAgent.service.js';
import { findBestSingleMatch, findBestSubcategoryMatchForCategory } from './vectorEmbedding.service.js';
import { namesMatchLoosely, normalizeName, normalizeVariantSuffix, trailingVariant } from '../utils/textSimilarity.js';
import MandiCategoryPrice from '../models/MandiRates.model.js';
import Mandi from '../models/Mandi.model.js';
import Category from '../models/category.modal.js';
import SubCategory from '../models/subCategory.modal.js';
import { notifyMandiRatesUpdated } from '../controllers/pushNotifications.controller.js';

const openai = new OpenAI({ apiKey: config.openai.apiKey });

const LOG_PREFIX = '[marketRateParser]';

/** YYYY-MM-DD calendar day must not be after today (matches Excel upload validation). */
const isFutureMandiRateDate = (dateStr) => {
  if (!dateStr || typeof dateStr !== 'string') return false;
  const parsedDay = new Date(`${dateStr}T12:00:00`);
  if (Number.isNaN(parsedDay.getTime())) return false;
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);
  return parsedDay > todayEnd;
};

const buildFailureRow = ({ rate = {}, mandiPrice = null, reason, missingFields = [] }) => ({
  category: rate.category ?? null,
  subCategory: rate.subCategory ?? null,
  mandi: mandiPrice ? (mandiPrice.mandi ?? null) : null,
  price: mandiPrice && mandiPrice.price !== undefined ? mandiPrice.price : null,
  priceDifference:
    mandiPrice && mandiPrice.priceDifference !== undefined ? mandiPrice.priceDifference : null,
  unit: mandiPrice && mandiPrice.unit ? mandiPrice.unit : null,
  reason,
  missingFields,
});

const buildFutureDateFailures = (parsedData) => {
  const failedRates = [];
  const reason = `Future date (${parsedData.date}) — live rates sort by date; use today or the actual rate date`;

  for (const rate of parsedData.rates || []) {
    const mandiPrices = rate.mandiPrices?.length ? rate.mandiPrices : [{}];
    for (const mandiPrice of mandiPrices) {
      failedRates.push(
        buildFailureRow({
          rate,
          mandiPrice,
          reason,
          missingFields: ['date'],
        })
      );
    }
  }

  return failedRates;
};

/**
 * Match extracted category name against vector embeddings
 * Uses vector data to understand relationships (e.g., "News Paper" → "Paper" category)
 * @param {string} categoryName - Category name from parsed data
 * @returns {Promise<Object|null>} Matched category with ObjectId or null
 */
const matchCategory = async (categoryName) => {
  if (!categoryName) return null;

  const normalizedSearch = categoryName.replace(/\s+/g, ' ').trim();
  if (!normalizedSearch) return null;

  // Strategy 0: Exact name match against Category collection (trim + case-insensitive).
  // Do not require VectorEmbedding — categories without embeddings used to fail here.
  const allCatsQuick = await Category.find({}).select('name').lean();
  const exactCat = allCatsQuick.find(
    (c) =>
      (c.name || '').replace(/\s+/g, ' ').trim().toLowerCase() ===
      normalizedSearch.toLowerCase()
  );
  if (exactCat) {
    return {
      _id: exactCat._id,
      name: exactCat.name,
      similarity: 1,
      isExactDbMatch: true,
    };
  }

  // Strategy 1: First try to match as subcategory to find parent category
  // This handles cases like "News Paper" which is a subcategory of "Paper"
  const subCategoryMatch = await findBestSingleMatch(normalizedSearch, 'subcategory');
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
  let match = await findBestSingleMatch(normalizedSearch, 'category');
  
  if (match && match.originalId) {
    return {
      _id: match.originalId._id || match.originalId,
      name: match.originalId.name || normalizedSearch,
      similarity: match.similarity,
    };
  }

  // Strategy 3: Try fuzzy matching with existing categories
  // Check if the parsed name contains or is contained in any category name
  const searchNameLower = normalizedSearch.toLowerCase();

  for (const cat of allCatsQuick) {
    const catNameLower = (cat.name || '').replace(/\s+/g, ' ').trim().toLowerCase();

    // Check if category name contains search term or vice versa
    // e.g., "News Paper" contains "Paper", or "Paper" is in "News Paper"
    if (
      catNameLower.includes(searchNameLower) ||
      searchNameLower.includes(catNameLower) ||
      searchNameLower.replace(/\s+/g, '') === catNameLower.replace(/\s+/g, '')
    ) {
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

/** Strip trailing parenthetical variant from a name. "Casting Ng Rod (W)" → "Casting Ng Rod" */
const stripVariantSuffix = (s) => (s || '').replace(/\s*\([^)]+\)\s*$/, '').trim();

/** Lowercase + collapse spaces — used for every string comparison in this file. */
const lc = (s) => normalizeName(s); // normalizeName already lowercases + trims

/** Normalize abbreviations that commonly appear in metal rate messages. */
const normalizeAbbreviations = (s) =>
  (s || '')
    .replace(/\bN\.G\b/gi, 'NG')
    .replace(/\bC\.R\b/gi, 'CR')
    .replace(/\bM\.S\b/gi, 'MS')
    .replace(/\bH\.R\b/gi, 'HR')
    .replace(/\bC\.C\b/gi, 'CC')
    .replace(/\bP\.P\b/gi, 'PP')
    .trim();

/**
 * Ask OpenAI to pick the best matching subcategory from a known list.
 * Both the parsed name and every candidate are lowercased before the prompt
 * so the model is not distracted by casing differences.
 * Returns the matched DB SubCategory object or null.
 */
const aiMatchSubCategory = async (parsedName, candidates) => {
  if (!candidates.length) return null;

  const parsedLc = lc(parsedName);
  const candidateList = candidates
    .map((sc, i) => `${i + 1}. ${lc(sc.name)}`)
    .join('\n');

  try {
    const response = await openai.chat.completions.create({
      model: config.openai.model,
      temperature: 0,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content:
            'You are a strict matching assistant for Indian metal/scrap subcategory names. ' +
            'Given a parsed subcategory name and a numbered list of known names (all lowercase), ' +
            'return the number of the best matching candidate, or 0 if none reasonably matches. ' +
            'Consider abbreviations (NG = N.G., CR = C.R.), spacing, and typos. ' +
            'CRITICAL: A trailing variant suffix like (w), (s), (steel grade), (foundry grade) is part of the identity. ' +
            'NEVER match a parsed name that has a suffix to a candidate without it, and vice-versa. ' +
            'If the parsed name has "(w)", only candidates ending in "(w)" are acceptable. ' +
            'If the parsed name has no suffix, only candidates with no suffix are acceptable. ' +
            'Output JSON only: { "match": <number 0-N> }',
        },
        {
          role: 'user',
          content: `Parsed name: "${parsedLc}"\n\nCandidates:\n${candidateList}`,
        },
      ],
    });

    const body = JSON.parse(response.choices[0].message.content || '{}');
    const idx = parseInt(body.match, 10);
    if (idx >= 1 && idx <= candidates.length) {
      const matched = candidates[idx - 1];

      // Hard variant-suffix guard — AI must never cross (W) ↔ non-(W).
      const parsedVariant = trailingVariant(parsedName);
      const candidateVariant = trailingVariant(matched.name);
      if (parsedVariant !== candidateVariant) {
        console.log(LOG_PREFIX, 'matchSubCategory: AI pick rejected by variant guard', {
          parsed: parsedName,
          parsedVariant,
          aiPick: matched.name,
          aiPickVariant: candidateVariant,
        });
        return null;
      }

      // Final strict name check (variant guard + token-overlap rules)
      if (!namesMatchLoosely(parsedName, matched.name)) {
        console.log(LOG_PREFIX, 'matchSubCategory: AI pick rejected by name check', {
          parsed: parsedName,
          aiPick: matched.name,
        });
        return null;
      }
      console.log(LOG_PREFIX, 'matchSubCategory: AI match', {
        parsed: parsedName,
        parsedLc,
        matchedName: matched.name,
        matchedIdx: idx,
      });
      return matched;
    }
    return null;
  } catch (err) {
    console.warn(LOG_PREFIX, 'matchSubCategory: AI match failed', err.message);
    return null;
  }
};

/**
 * Match extracted subcategory name against database entries.
 *
 * Every comparison uses lowercase on both sides for maximum reliability.
 *
 * Matching order (first hit wins):
 *  1. Lowercase fuzzy match (case, spacing, word order, typos) — variant guard active.
 *  2. Scoped vector search within this category.
 *  3. Global vector search (category-filtered).
 *  4. Variant-relaxed pass — strip trailing (W)/(S)/etc. from both sides, then lowercase fuzzy.
 *     Handles the AI stripping "(W)" when the DB has it, or vice-versa.
 *  5. Abbreviation-normalised pass — N.G.→NG, C.R.→CR, etc. — lowercased on both sides.
 *  6. AI-assisted match — OpenAI picks the best candidate from the full lowercased list.
 *
 * @param {string} subCategoryName - Subcategory name from parsed data
 * @param {Object} category - Matched category object
 * @returns {Promise<Object|null>} Matched subcategory with ObjectId or null
 */
const matchSubCategory = async (subCategoryName, category, preloadedList = null) => {
  if (!subCategoryName || !category) {
    console.log(LOG_PREFIX, 'matchSubCategory: skip — missing subCategoryName or category', {
      subCategoryName,
      categoryId: category?._id,
    });
    return null;
  }

  // Accept a pre-loaded list to avoid repeated DB queries when the caller caches it
  const categorySubCategories = preloadedList ?? await SubCategory.find({ categoryId: category._id });

  const toMatchResult = (subCat, similarity, flags = {}) => ({
    _id: subCat._id,
    name: (subCat.name || '').trim(),
    similarity,
    ...flags,
  });

  const parsedNorm = normalizeVariantSuffix(subCategoryName);

  // 0) Exact match after lowercase + trim + normalised (W) suffix
  for (const subCat of categorySubCategories) {
    const candidateNorm = normalizeVariantSuffix((subCat.name || '').trim());
    if (parsedNorm === candidateNorm) {
      return toMatchResult(subCat, 1, { isExactMatch: true });
    }
  }

  // 1) Lowercase fuzzy match — variant guard active
  for (const subCat of categorySubCategories) {
    if (namesMatchLoosely(lc(subCategoryName), lc(subCat.name))) {
      return toMatchResult(subCat, 0.96, { isFuzzyMatch: true });
    }
  }

  // 2) Scoped vector search within this category
  const scoped = await findBestSubcategoryMatchForCategory(subCategoryName, category._id);
  if (scoped && namesMatchLoosely(subCategoryName, scoped.name)) {
    return toMatchResult({ _id: scoped._id, name: scoped.name }, scoped.similarity);
  }

  // 3) Global vector match — keep only if it belongs to this category
  const match = await findBestSingleMatch(subCategoryName, 'subcategory');
  if (match && match.originalId) {
    const subCategory = await SubCategory.findById(match.originalId._id || match.originalId);
    if (subCategory && subCategory.categoryId.toString() === category._id.toString()) {
      if (namesMatchLoosely(subCategoryName, subCategory.name)) {
        return toMatchResult(subCategory, match.similarity);
      }
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
    // Verify the cached subcategory still satisfies the variant guard
    if (namesMatchLoosely(subCategoryName, category.matchedSubCategory.name)) {
      return category.matchedSubCategory;
    }
    console.log(LOG_PREFIX, 'matchSubCategory: rejected category.matchedSubCategory (variant mismatch)', {
      parsed: subCategoryName,
      cached: category.matchedSubCategory.name,
    });
  }

  // 4) Variant-relaxed pass — ONLY when parsed name has NO trailing variant suffix.
  //    Handles: AI returns "Casting Ng Rod" (no suffix) but DB only has "Casting Ng Rod" too — skipped (handled above).
  //    NEVER strip (W) off parsed name to match a non-(W) DB entry: (W) variants must stay separate.
  //    NEVER strip (W) off DB entry to match a non-(W) parsed name: same reason.
  //    This pass is essentially a no-op now and kept only for future abbreviation/punctuation cases.
  // 5) Abbreviation-normalised pass — lowercase on both sides.
  const parsedNormLc = lc(normalizeAbbreviations(subCategoryName));
  if (parsedNormLc !== lc(subCategoryName)) {
    for (const subCat of categorySubCategories) {
      const candidateNormLc = lc(normalizeAbbreviations(subCat.name));
      if (namesMatchLoosely(parsedNormLc, candidateNormLc)) {
        console.log(LOG_PREFIX, 'matchSubCategory: abbreviation-normalised match', {
          parsed: subCategoryName,
          parsedNormLc,
          matched: subCat.name,
        });
        return toMatchResult(subCat, 0.85, { isAbbrevNorm: true });
      }
    }
  }

  // 6) AI-assisted match — last resort; OpenAI compares lowercased parsed name against
  //    the full lowercased list of this category's subcategories.
  if (categorySubCategories.length > 0) {
    const aiMatch = await aiMatchSubCategory(subCategoryName, categorySubCategories);
    if (aiMatch) {
      return toMatchResult(aiMatch, 0.8, { isAiMatch: true });
    }
  }

  console.log(LOG_PREFIX, 'matchSubCategory: unresolved after all strategies including AI', {
    subCategoryName,
    categoryName: category.name,
    categoryId: category._id?.toString(),
  });
  return null;
};

/**
 * Well-known Indian city aliases that appear in market rate messages.
 * Each entry maps one or more message spellings to alternate city spellings.
 * All values are lowercase so they can be compared with normalizeName().
 */
const CITY_ALIASES = {
  bangalore: ['bengaluru', 'bengalore', 'bangaluru'],
  bengaluru: ['bangalore', 'bengalore', 'bangaluru'],
  cochin: ['kochi', 'ernakulam'],
  kochi: ['cochin', 'ernakulam'],
  mumbai: ['bombay'],
  bombay: ['mumbai'],
  kolkata: ['calcutta'],
  calcutta: ['kolkata'],
  chennai: ['madras'],
  madras: ['chennai'],
  pune: ['poona'],
  poona: ['pune'],
  varanasi: ['banaras', 'benares'],
  banaras: ['varanasi', 'benares'],
};

/**
 * Returns true if two city/mandi name strings should be treated as the same mandi.
 * Checks exact, contains, fuzzy, and known alias matches.
 */
const mandiNamesMatch = (searchName, mandiCity, mandiname) => {
  const s = normalizeName(searchName);
  const c = normalizeName(mandiCity || '');
  const n = normalizeName(mandiname || '');

  if (s === c || s === n) return true;
  if (c && (s.includes(c) || c.includes(s))) return true;
  if (n && (s.includes(n) || n.includes(s))) return true;
  if ((s.includes('naidu') && c.includes('nadu')) || (s.includes('nadu') && c.includes('naidu'))) return true;

  // Alias check
  const aliases = CITY_ALIASES[s] || [];
  if (aliases.includes(c) || aliases.includes(n)) return true;
  // Reverse alias check
  const aliasesForCity = CITY_ALIASES[c] || [];
  if (aliasesForCity.includes(s)) return true;

  return false;
};

/**
 * Is this mandi valid for saving rates? (has a real state and city)
 */
const isValidMandi = (mandi) =>
  mandi &&
  mandi.city &&
  mandi.state &&
  mandi.state.toLowerCase() !== 'unknown';

/**
 * Match extracted mandi name against vector embeddings, then DB string fallback.
 * Mandis that exist in the DB but have no VectorEmbedding are now found via the
 * string/alias fallback and returned directly — previously they were silently dropped.
 *
 * @param {string} mandiName - Mandi name from parsed data
 * @param {boolean} autoCreate - (unused, kept for API compatibility)
 * @returns {Promise<Object|null>} Matched mandi or null
 */
const matchMandi = async (mandiName, autoCreate = false) => {
  if (!mandiName) return null;

  const invalidNames = ['unknown', 'null', 'none', ''];
  const cleanedName = mandiName.replace(/^Mandi\s+/i, '').trim();

  if (invalidNames.includes(cleanedName.toLowerCase())) {
    return null;
  }

  // --- Strategy 1: vector embedding match (original name) ---
  let match = await findBestSingleMatch(cleanedName, 'mandi');

  // --- Strategy 2: vector embedding match with "Mandi" prefix ---
  if (!match || !match.originalId) {
    match = await findBestSingleMatch(`Mandi ${cleanedName}`, 'mandi');
  }

  if (match && match.originalId) {
    const mandi = await Mandi.findById(match.originalId._id || match.originalId);
    if (isValidMandi(mandi)) {
      return {
        _id: mandi._id,
        name: mandi.mandiname || mandi.city,
        similarity: match.similarity || 0.9,
      };
    }
  }

  // --- Strategy 3: direct DB string + alias match (handles mandis with no embedding) ---
  // This is the critical fallback for mandis like Bengaluru/Cochin/Lucknow/Coimbatore
  // that exist in the DB but were added without a VectorEmbedding entry.
  const allMandis = await Mandi.find({});
  for (const mandi of allMandis) {
    if (!isValidMandi(mandi)) continue;
    if (mandiNamesMatch(cleanedName, mandi.city, mandi.mandiname)) {
      console.log(LOG_PREFIX, `matchMandi: string/alias match — no embedding needed`, {
        searched: cleanedName,
        matchedCity: mandi.city,
        matchedName: mandi.mandiname,
        mandiId: mandi._id?.toString(),
      });

      // Opportunistically generate and store an embedding so future lookups use vectors.
      // Errors here are non-fatal — we still return the mandi.
      try {
        const { storeEmbedding } = await import('./vectorEmbedding.service.js');
        const existing = await (await import('../models/VectorEmbedding.model.js')).default.findOne({
          type: 'mandi',
          originalId: mandi._id,
        });
        if (!existing) {
          storeEmbedding({
            type: 'mandi',
            originalId: mandi._id,
            text: mandi.mandiname || mandi.city,
            metadata: { city: mandi.city, state: mandi.state },
          }).catch((err) =>
            console.warn(LOG_PREFIX, `matchMandi: could not auto-generate embedding for ${mandi.city}:`, err.message)
          );
        }
      } catch (_) {
        // ignore embedding errors
      }

      return {
        _id: mandi._id,
        name: mandi.mandiname || mandi.city,
        similarity: 0.9,
      };
    }
  }

  return null;
};

/**
 * Process parsed rates and match against database entities.
 *
 * Performance optimisations:
 *  - In-request category cache   → matchCategory() called once per unique category name
 *  - In-request mandi cache      → matchMandi() called once per unique mandi name
 *  - In-request subcat-list cache→ SubCategory.find() called once per category
 *  - In-request subcat cache     → matchSubCategory() called once per (category, subcat) pair
 *  - Parallel mandi resolution   → Promise.all() on all mandi prices within a rate
 *
 * @param {Object} parsedData - Parsed data from AI agent
 * @returns {Promise<Object>} Matched data with warnings and created entities
 */
const matchEntities = async (parsedData) => {
  const warnings = [];
  const failedRates = [];
  const matchedRates = [];

  // ── In-request caches ─────────────────────────────────────────────────────
  /** lc(categoryName) → categoryObj | null */
  const categoryCache = new Map();
  /** lc(mandiName) → mandiObj | null */
  const mandiCache = new Map();
  /** categoryId.toString() → SubCategory[] */
  const subCatListCache = new Map();
  /** `${categoryId}::${lc(subCatName)}` → subCatObj | null */
  const subCatCache = new Map();

  const getCachedCategory = async (name) => {
    const key = lc(name);
    if (categoryCache.has(key)) return categoryCache.get(key);
    const result = await matchCategory(name);
    categoryCache.set(key, result);
    return result;
  };

  const getCachedSubCatList = async (categoryId) => {
    const key = String(categoryId);
    if (subCatListCache.has(key)) return subCatListCache.get(key);
    const list = await SubCategory.find({ categoryId });
    subCatListCache.set(key, list);
    return list;
  };

  const getCachedSubCategory = async (name, category) => {
    const key = `${category._id}::${lc(name)}`;
    if (subCatCache.has(key)) return subCatCache.get(key);
    const list = await getCachedSubCatList(category._id);
    const result = await matchSubCategory(name, category, list);
    subCatCache.set(key, result);
    return result;
  };

  const getCachedMandi = async (name) => {
    const key = lc(name);
    if (mandiCache.has(key)) return mandiCache.get(key);
    const result = await matchMandi(name, false);
    mandiCache.set(key, result);
    return result;
  };
  // ─────────────────────────────────────────────────────────────────────────

  const pushFailure = ({ rate = {}, mandiPrice = null, reason, missingFields = [] }) => {
    failedRates.push(buildFailureRow({ rate, mandiPrice, reason, missingFields }));
  };

  for (let idx = 0; idx < parsedData.rates.length; idx++) {
    const rate = parsedData.rates[idx];
    console.log(LOG_PREFIX, `rate[${idx}] from AI`, {
      category: rate.category,
      subCategory: rate.subCategory,
      mandiPricesCount: (rate.mandiPrices || []).length,
    });

    // ── Category ─────────────────────────────────────────────────────────
    if (!rate.category || rate.category.toLowerCase() === 'null' || rate.category.toLowerCase() === 'unknown' || rate.category.trim() === '') {
      warnings.push(`Skipping rate with invalid category: '${rate.category}'`);
      for (const mp of rate.mandiPrices || [{}]) {
        pushFailure({ rate, mandiPrice: mp, reason: `Invalid or missing category: '${rate.category ?? ''}'`, missingFields: ['category'] });
      }
      continue;
    }

    const category = await getCachedCategory(rate.category);
    if (!category) {
      warnings.push(`Could not match category: '${rate.category}'`);
      for (const mp of rate.mandiPrices || [{}]) {
        pushFailure({ rate, mandiPrice: mp, reason: `Category '${rate.category}' could not be matched in DB`, missingFields: ['category'] });
      }
      continue;
    }

    console.log(LOG_PREFIX, `rate[${idx}] matched category`, {
      rawCategory: rate.category,
      resolvedName: category.name,
      categoryId: category._id?.toString(),
    });

    if (category.similarity && category.similarity < 0.9) {
      warnings.push(`Category '${rate.category}' matched with low confidence (${category.similarity.toFixed(2)})`);
    }

    // ── SubCategory ───────────────────────────────────────────────────────
    let subCategory = null;

    if (category.matchedSubCategory) {
      subCategory = category.matchedSubCategory;
    } else if (rate.subCategory) {
      if (rate.subCategory.toLowerCase() === 'null' || rate.subCategory.toLowerCase() === 'unknown' || rate.subCategory.trim() === '') {
        warnings.push(`Skipping rate with invalid subcategory: '${rate.subCategory}'`);
        for (const mp of rate.mandiPrices || [{}]) {
          pushFailure({ rate, mandiPrice: mp, reason: `Invalid subcategory: '${rate.subCategory}'`, missingFields: ['subCategory'] });
        }
        continue;
      }
      subCategory = await getCachedSubCategory(rate.subCategory, category);
      if (subCategory) {
        console.log(LOG_PREFIX, `rate[${idx}] subCategory matched`, {
          aiSubCategory: rate.subCategory,
          resolvedName: subCategory.name,
          subCategoryId: subCategory._id?.toString?.() || subCategory._id,
        });
      }
    } else if (category.isFromSubCategory) {
      const subCategoryMatch = await findBestSingleMatch(rate.category, 'subcategory');
      if (subCategoryMatch && subCategoryMatch.originalId) {
        const subCat = await SubCategory.findById(subCategoryMatch.originalId._id || subCategoryMatch.originalId);
        if (subCat && subCat.categoryId.toString() === category._id.toString()) {
          subCategory = { _id: subCat._id, name: subCat.name, similarity: subCategoryMatch.similarity };
        }
      }
    }

    if (!subCategory) {
      warnings.push(
        `Skipping rate (not saved): resolved subcategory is required for category '${category.name}'` +
          (rate.subCategory ? ` (AI subcategory: '${rate.subCategory}' could not be matched)` : ` (no subcategory in parsed data)`)
      );
      console.log(LOG_PREFIX, `rate[${idx}] NOT SAVED: subCategory required — null or unmatched`, { category: category.name, aiSubCategory: rate.subCategory });
      for (const mp of rate.mandiPrices || [{}]) {
        pushFailure({
          rate: { ...rate, category: category.name },
          mandiPrice: mp,
          reason: rate.subCategory
            ? `Sub Category '${rate.subCategory}' could not be matched under '${category.name}'`
            : `Sub Category is required for '${category.name}' but was missing`,
          missingFields: ['subCategory'],
        });
      }
      continue;
    }

    // ── Mandi prices — resolved in parallel ───────────────────────────────
    const mandiResults = await Promise.all(
      (rate.mandiPrices || []).map(async (mandiPrice) => {
        if (!mandiPrice.mandi || mandiPrice.mandi.toLowerCase() === 'null' || mandiPrice.mandi.toLowerCase() === 'unknown' || mandiPrice.mandi.trim() === '') {
          return { skip: true, reason: 'invalid-mandi', mandiPrice };
        }
        const priceMissing =
          mandiPrice.price === null ||
          mandiPrice.price === undefined ||
          mandiPrice.price === '' ||
          Number.isNaN(Number(mandiPrice.price)) ||
          Number(mandiPrice.price) === 0;

        const mandi = await getCachedMandi(mandiPrice.mandi);
        return { mandiPrice, mandi, priceMissing };
      })
    );

    const matchedMandiPrices = [];
    for (const res of mandiResults) {
      const { mandiPrice, mandi, priceMissing } = res;

      if (res.skip && res.reason === 'invalid-mandi') {
        warnings.push(`Skipping price with invalid mandi: '${mandiPrice.mandi}'`);
        pushFailure({ rate: { ...rate, category: category.name, subCategory: subCategory?.name || rate.subCategory }, mandiPrice, reason: `Invalid or missing mandi name`, missingFields: ['mandi'] });
        continue;
      }

      if (!mandi) {
        warnings.push(`Could not match mandi: '${mandiPrice.mandi}'`);
        pushFailure({ rate: { ...rate, category: category.name, subCategory: subCategory?.name || rate.subCategory }, mandiPrice, reason: `Mandi '${mandiPrice.mandi}' could not be matched in DB`, missingFields: priceMissing ? ['mandi', 'price'] : ['mandi'] });
        continue;
      }

      if (priceMissing) {
        warnings.push(`Skipping price for mandi '${mandi.name}': price missing or zero`);
        pushFailure({ rate: { ...rate, category: category.name, subCategory: subCategory?.name || rate.subCategory }, mandiPrice: { ...mandiPrice, mandi: mandi.name }, reason: `Price is missing, zero or invalid`, missingFields: ['price'] });
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

    if (matchedMandiPrices.length > 0) {
      matchedRates.push({
        category: category.name,
        categoryId: category._id,
        subCategory: subCategory ? (subCategory.name || '').trim() : null,
        subCategoryId: subCategory ? subCategory._id : null,
        mandiPrices: matchedMandiPrices,
      });
    } else {
      console.log(LOG_PREFIX, `rate[${idx}] NOT SAVED: no mandi prices matched`, { category: category.name, subCategory: subCategory?.name });
    }
  }

  return { matchedRates, warnings, failedRates, createdEntities: { mandis: [] } };
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
  let mandiCategoryPricesUpdatedCount = 0;

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
      ? rate.subCategory.trim()
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
          (cp.subCategory || '').trim() === subCategoryValue &&
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
        mandiCategoryPricesUpdatedCount++;
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
    updatedCount: mandiCategoryPricesUpdatedCount,
    persistedCount: mandiCategoryPricesCount + mandiCategoryPricesUpdatedCount,
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

  if (isFutureMandiRateDate(parsedData.date)) {
    const failedRates = buildFutureDateFailures(parsedData);
    console.warn(LOG_PREFIX, 'parseAndUpdate blocked — future parsed date', {
      date: parsedData.date,
      failedCount: failedRates.length,
    });
    return {
      parsed: parsedData,
      matched: {
        categories: [],
        subCategories: [],
        mandis: [],
      },
      created: {
        mandis: [],
      },
      updated: {
        mandiCategoryPrices: 0,
      },
      warnings: [
        `Parsed date ${parsedData.date} is in the future; no rates were saved.`,
      ],
      failed: failedRates,
    };
  }

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

  // Step 3b: Notify users — same mechanism/content as the Excel upload flow.
  // Only fires AFTER a successful DB persist, and only when at least one rate was
  // actually inserted or updated. When the same rates are re-parsed with no real
  // change, persistedCount is 0, so no duplicate notification is sent.
  const persistedCount =
    updateResult.persistedCount != null
      ? updateResult.persistedCount
      : (updateResult.count || 0) + (updateResult.updatedCount || 0);

  if (persistedCount > 0) {
    try {
      await notifyMandiRatesUpdated();
      console.log(
        LOG_PREFIX,
        `sent rate-update notification after persisting ${persistedCount} change(s) ` +
          `(inserted=${updateResult.count || 0}, updated=${updateResult.updatedCount || 0})`
      );
    } catch (notifyErr) {
      console.error(LOG_PREFIX, 'push notification error:', notifyErr.message);
    }
  } else {
    console.log(LOG_PREFIX, 'no rates persisted — notification skipped');
  }

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
    // Structured per-row failure list used by the AI modal to render a table
    // and to produce a "failed rates" Excel matching the upload template.
    failed: matchedData.failedRates || [],
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

