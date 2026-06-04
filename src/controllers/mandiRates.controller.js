import mongoose from 'mongoose';
import MandiCategoryPrice from '../models/MandiRates.model.js';
import Mandi from '../models/Mandi.model.js';
import SubCategory from '../models/subCategory.modal.js';
import Notification from '../models/b2bNotification.js';
import { sendNotificationToAllUsers } from './pushNotifications.controller.js';

/** Two-decimal rounding for prices/deltas in API JSON (avoids float artifacts e.g. -0.699999999999993). */
const roundPrice2 = (n) => {
  if (typeof n !== 'number' || Number.isNaN(n)) return n;
  return parseFloat(n.toFixed(2));
};

/** Latest MandiCategoryPrice row for a mandi (matches Market Rates table: newest updatedAt per mandi). */
const getLatestMandiCategoryPrice = (mandiId) =>
  MandiCategoryPrice.findOne({ mandi: mandiId }).sort({ updatedAt: -1 });

const categoryPriceMatches = (cp, category, subCategory) => {
  const norm = (v) => {
    if (v == null || v === '' || v === 'null' || v === 'undefined') return null;
    return String(v);
  };
  return cp.category === category && norm(cp.subCategory) === norm(subCategory);
};

// Save the entire array of categories with prices
const saveCategoryPrices = async (req, res) => {
  try {
    const { mandi, categoryPrices } = req.body;
    
    // Validate unit format for each category price
    const unitRegex = /^(Kg|Ton)$/;
    const invalidUnitEntry = categoryPrices.find(catPrice => 
      catPrice.unit && !unitRegex.test(catPrice.unit)
    );
    
    if (invalidUnitEntry) {
      return res.status(400).json({ 
        message: 'Invalid unit format. Unit must be either "Kg" or "Ton"',
        invalidUnit: invalidUnitEntry.unit
      });
    }
    
    const newMandiCategoryPrice = new MandiCategoryPrice({ mandi, categoryPrices });
    await newMandiCategoryPrice.save();
    res.status(201).json(newMandiCategoryPrice);

    // Push Notification logic
    try {
      await sendNotificationToAllUsers(
        'New Rates available',
        'Check out the latest mandi rates.',
        {
          type: 'mandiRatesUpdate',
        }
      );
    } catch (notifyErr) {
      console.error('Push notification error:', notifyErr);
    }

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update a price of a single category
const updateCategoryPrice = async (req, res) => {
  try {
    const { mandiId, category, subCategory } = req.params;
    const { newPrice, unit } = req.body;

    // Validate unit format if provided
    if (unit && !['Kg', 'Ton'].includes(unit)) {
      return res.status(400).json({ 
        message: 'Invalid unit format. Unit must be either "Kg" or "Ton"',
        invalidUnit: unit
      });
    }

    const mandiCategoryPrice = await getLatestMandiCategoryPrice(mandiId);
    if (!mandiCategoryPrice) {
      return res.status(404).json({ message: 'Mandi not found' });
    }

    const categoryPrice = mandiCategoryPrice.categoryPrices.find((cp) =>
      categoryPriceMatches(cp, category, subCategory)
    );

    if (categoryPrice) {
      if (newPrice !== undefined) categoryPrice.price = newPrice;
      if (unit !== undefined) categoryPrice.unit = unit;
      await mandiCategoryPrice.save();
      res.status(200).json(mandiCategoryPrice);
    } else {
      res.status(404).json({ message: 'Category not found' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/** Delete one categoryPrices line by Mongo subdocument _id (exact row the UI shows). */
const deleteCategoryPriceByEntryId = async (req, res) => {
  try {
    const { documentId, priceEntryId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(documentId) || !mongoose.Types.ObjectId.isValid(priceEntryId)) {
      return res.status(400).json({ message: 'Invalid document or price entry id' });
    }

    const mandiCategoryPrice = await MandiCategoryPrice.findById(documentId);
    if (!mandiCategoryPrice) {
      return res.status(404).json({ message: 'Mandi rates document not found' });
    }

    const entry = mandiCategoryPrice.categoryPrices.id(priceEntryId);
    if (!entry) {
      return res.status(404).json({ message: 'Price entry not found in this document' });
    }

    entry.remove();
    await mandiCategoryPrice.save();

    res.status(200).json({
      message: 'Category price deleted successfully',
      deletedEntryId: priceEntryId,
      updatedMandiCategoryPrice: mandiCategoryPrice,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/** @deprecated Prefer DELETE /mandiRates/prices/:documentId/:priceEntryId */
const deleteCategoryPrice = async (req, res) => {
  try {
    const { mandiId, category , subCategory } = req.params;

    const mandiCategoryPrice = await getLatestMandiCategoryPrice(mandiId);

    if (!mandiCategoryPrice) {
      return res.status(404).json({ message: 'Mandi not found' });
    }

    const categoryIndex = mandiCategoryPrice.categoryPrices.findIndex((cp) =>
      categoryPriceMatches(cp, category, subCategory)
    );

    if (categoryIndex === -1) {
      return res.status(404).json({ message: 'Category not found' });
    }

    mandiCategoryPrice.categoryPrices.splice(categoryIndex, 1);
    await mandiCategoryPrice.save();

    res.status(200).json({
      message: 'Category price deleted successfully',
      updatedMandiCategoryPrice: mandiCategoryPrice,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


const saveOrUpdateMandiCategoryPrices = async (req, res) => {
  try {
    console.log('Request body:', JSON.stringify(req.body, null, 2));
    const { mandiPrices } = req.body; // Array of objects containing mandiId, category, subCategory, price, and priceDifference

    console.log('mandiPrices:', mandiPrices);
    console.log('Is array?', Array.isArray(mandiPrices));

    if (!mandiPrices || !Array.isArray(mandiPrices)) {
      console.log('Validation failed: mandiPrices is not valid');
      return res.status(400).json({ message: 'Invalid input. Please provide an array of mandi prices.' });
    }

    console.log('Total entries received:', mandiPrices.length);

    // Filter out invalid mandi IDs and track skipped entries
    const validMandiPrices = [];
    const skippedEntries = [];

    mandiPrices.forEach((entry, index) => {
      const { mandiId, category, subCategory } = entry;
      
      console.log(`Processing entry ${index}:`, { mandiId, category, subCategory });
      
      // Check if mandiId is valid
      if (!mandiId || mandiId === "N/A" || !mongoose.Types.ObjectId.isValid(mandiId)) {
        const reason = !mandiId ? 'Missing mandiId' : mandiId === "N/A" ? 'Invalid mandiId: N/A' : 'Invalid ObjectId format';
        console.log(`Skipping entry ${index}: ${reason}`);
        skippedEntries.push({
          index,
          mandiId,
          category,
          subCategory,
          reason
        });
      } else {
        validMandiPrices.push(entry);
      }
    });

    console.log('Valid entries:', validMandiPrices.length);
    console.log('Skipped entries:', skippedEntries.length);

    // If no valid entries, return error
    if (validMandiPrices.length === 0) {
      console.log('No valid entries found, returning 400');
      return res.status(400).json({ 
        message: 'No valid mandi IDs found in the data. All entries have invalid mandiId values.',
        skippedEntries
      });
    }

    // Validate time format for valid mandi prices
    const timeRegex = /^(0?[1-9]|1[0-2]):[0-5][0-9] (AM|PM)$/;
    const invalidTimeEntry = validMandiPrices.find(mandiPrice => 
      mandiPrice.time && !timeRegex.test(mandiPrice.time)
    );
    
    if (invalidTimeEntry) {
      console.log('Invalid time format found:', invalidTimeEntry.time);
      return res.status(400).json({ 
        message: 'Invalid time format. Time must be in Indian 12-hour format (e.g., "10:30 AM", "03:45 PM")',
        invalidTime: invalidTimeEntry.time
      });
    }

    // Validate unit format for valid mandi prices
    const invalidUnitEntry = validMandiPrices.find(mandiPrice => 
      mandiPrice.unit && !['Kg', 'Ton'].includes(mandiPrice.unit)
    );
    
    if (invalidUnitEntry) {
      console.log('Invalid unit format found:', invalidUnitEntry.unit);
      return res.status(400).json({ 
        message: 'Invalid unit format. Unit must be either "Kg" or "Ton"',
        invalidUnit: invalidUnitEntry.unit
      });
    }

    console.log('Starting bulk operations...');

    const bulkOperations = validMandiPrices.map(({ mandiId, category, subCategory, price, priceDifference, unit, date, time }) => {
      const subCategoryFilter =
        subCategory == null || subCategory === '' ? null : subCategory;
      return {
        updateOne: {
          filter: {
            mandi: mandiId,
            categoryPrices: {
              $elemMatch: {
                category,
                subCategory: subCategoryFilter,
              },
            },
          },
          update: {
            $set: {
              'categoryPrices.$.subCategory': subCategoryFilter,
              'categoryPrices.$.price': price || 0,
              'categoryPrices.$.priceDifference': priceDifference || null,
              'categoryPrices.$.unit': unit || null,
              'categoryPrices.$.date': date || null,
              'categoryPrices.$.time': time || null,
            },
          },
          upsert: false,
        },
      };
    });

    const upsertOperations = validMandiPrices.map(({ mandiId, category, subCategory, price, priceDifference, unit, date, time }) => {
      return {
        updateOne: {
          filter: { mandi: mandiId },
          update: {
            $addToSet: {
              categoryPrices: {
                category,
                subCategory: subCategory || null,
                price: price || 0,
                priceDifference: priceDifference || null,
                unit: unit || null,
                date: date || null,
                time: time || null,
              },
            },
          },
          upsert: true,
        },
      };
    });

    // Perform bulk write for both update and upsert operations
    const bulkWriteOperations = [...bulkOperations, ...upsertOperations];

    console.log('Executing bulkWrite with', bulkWriteOperations.length, 'operations');
    await MandiCategoryPrice.bulkWrite(bulkWriteOperations);
    console.log('BulkWrite completed successfully');

    // Push Notification logic
    try {
      await sendNotificationToAllUsers(
        'New Rates available',
        'Check out the latest mandi rates.',
        {
          type: 'mandiRatesUpdate',
        }
      );
    } catch (notifyErr) {
      console.error('Push notification error:', notifyErr);
    }

    // Prepare response message
    let responseMessage = `Mandi prices updated successfully. Processed ${validMandiPrices.length} entries.`;
    
    if (skippedEntries.length > 0) {
      responseMessage += ` Skipped ${skippedEntries.length} entries with invalid mandi IDs.`;
    }

    console.log('Sending success response:', responseMessage);
    res.status(200).json({ 
      message: responseMessage,
      processed: validMandiPrices.length,
      skipped: skippedEntries.length,
      skippedEntries: skippedEntries.length > 0 ? skippedEntries : undefined
    });
  } catch (error) {
    console.error('Error in saveOrUpdateMandiCategoryPrices:', error);
    res.status(500).json({ message: 'An error occurred while saving mandi prices.', error: error.message });
  }
};

/**
 * Same math as GET /mandiRates/difference, but sync from already-loaded docs for one mandi.
 * @param {Array} mandiCategoryPriceDocs - all MandiCategoryPrice documents for one mandi (any mix of lean / doc)
 */
const computePriceDifferenceFromMandiDocs = (mandiCategoryPriceDocs, category, subCategory) => {
  try {
    if (!mandiCategoryPriceDocs || mandiCategoryPriceDocs.length === 0) {
      return {};
    }

    const allCategoryPrices = mandiCategoryPriceDocs.flatMap((doc) =>
      (doc.categoryPrices || []).map((cp) =>
        cp && typeof cp.toObject === 'function' ? cp.toObject() : { ...cp }
      )
    );

    const categoryPrices = allCategoryPrices
      .filter((cp) => cp.category === category && cp.subCategory === subCategory)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    if (categoryPrices.length < 2) {
      return {};
    }

    const currentPrice = roundPrice2(categoryPrices[0].price);
    const previousPrice = roundPrice2(categoryPrices[1].price);
    const difference = roundPrice2(currentPrice - previousPrice);
    const percentChange =
      previousPrice === 0 ? '0.00' : ((difference / previousPrice) * 100).toFixed(2);
    const tag = difference > 0 ? 'Increment' : 'Decrement';

    return {
      category,
      currentPrice,
      previousPrice,
      difference,
      percentChange,
      tag,
    };
  } catch (err) {
    console.error('Error in computePriceDifferenceFromMandiDocs:', err);
    return {};
  }
};

// Get price difference and percentage change
const getPriceDifference = async (req, res) => {
  try {
    const { mandiId, category, subCategory } = req.params;

    const mandiCategoryPrices = await MandiCategoryPrice.find({ mandi: mandiId });

    if (!mandiCategoryPrices || mandiCategoryPrices.length === 0) {
      return res.status(404).json({ message: 'Mandi not found' });
    }

    const payload = computePriceDifferenceFromMandiDocs(mandiCategoryPrices, category, subCategory);
    if (Object.keys(payload).length === 0) {
      return res.status(400).json({ message: 'Not enough data to compare prices' });
    }

    res.status(200).json(payload);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const subCategoryKey = (value) => (value == null || value === '' ? '' : String(value));

const categoryLineKey = (category, subCategory) =>
  `${category}::${subCategoryKey(subCategory)}`;

const parseIndianTimeToMinutes = (time) => {
  if (!time || typeof time !== 'string') return null;
  const match = time.trim().match(/^(0?[1-9]|1[0-2]):([0-5][0-9]) (AM|PM)$/i);
  if (!match) return null;
  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const period = match[3].toUpperCase();
  if (period === 'PM' && hours !== 12) hours += 12;
  if (period === 'AM' && hours === 12) hours = 0;
  return hours * 60 + minutes;
};

/**
 * Calendar-day parsing for mandi price dates (avoids UTC midnight shifting the day).
 * Mirrors mobile `parseMandiPriceCalendarDate`.
 */
const parseMandiCalendarDate = (rawDate) => {
  if (rawDate == null || rawDate === '') return null;
  if (rawDate instanceof Date) {
    if (Number.isNaN(rawDate.getTime())) return null;
    return new Date(
      rawDate.getFullYear(),
      rawDate.getMonth(),
      rawDate.getDate(),
      12,
      0,
      0,
      0
    );
  }
  const s = String(rawDate).trim();
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) {
    return new Date(
      parseInt(iso[1], 10),
      parseInt(iso[2], 10) - 1,
      parseInt(iso[3], 10),
      12,
      0,
      0,
      0
    );
  }
  const dmy = s.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (dmy) {
    return new Date(
      parseInt(dmy[3], 10),
      parseInt(dmy[2], 10) - 1,
      parseInt(dmy[1], 10),
      12,
      0,
      0,
      0
    );
  }
  const parsed = new Date(s);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

/** Sortable timestamp for a categoryPrices line (date + optional Indian 12h time). */
const getCategoryLineTimestamp = (cp) => {
  const rawDate = cp?.date ?? cp?.createdAt;
  const base = parseMandiCalendarDate(rawDate);
  if (!base) return null;
  const minutes = parseIndianTimeToMinutes(cp?.time);
  if (minutes == null) return base;
  const ts = new Date(base);
  ts.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
  return ts;
};

/** Keep only price lines whose date/time falls in the live-summary rolling window. */
const filterCategoryPricesToWindow = (categoryPrices, from, to) =>
  (categoryPrices || []).filter((cp) => {
    const ts = getCategoryLineTimestamp(cp);
    return ts && ts >= from && ts <= to;
  });

const toPlainCategoryPrice = (categoryPrice) =>
  categoryPrice && typeof categoryPrice.toObject === 'function'
    ? categoryPrice.toObject()
    : { ...categoryPrice };

/**
 * Builds per-(category, subCategory) timelines from mandi docs, oldest-first, only lines in [from, to].
 * @returns {Map<string, Array>}
 */
const buildWindowTimelinesByCategoryKey = (mandiDocs, from, to) => {
  /** @type {Map<string, Array>} */
  const timelines = new Map();

  for (const doc of mandiDocs || []) {
    for (const rawCp of doc.categoryPrices || []) {
      const cp = toPlainCategoryPrice(rawCp);
      const ts = getCategoryLineTimestamp(cp);
      if (!ts || ts < from || ts > to) continue;

      const key = categoryLineKey(cp.category, cp.subCategory);
      if (!timelines.has(key)) {
        timelines.set(key, []);
      }
      timelines.get(key).push({ ...cp, _sortTs: ts.getTime() });
    }
  }

  for (const [key, entries] of timelines) {
    entries.sort((a, b) => a._sortTs - b._sortTs);
    timelines.set(key, entries);
  }

  return timelines;
};

/**
 * Live-summary diff: previous row in window for same mandi + category + subCategory (by date/time).
 * @returns {null | { difference: number, tag: 'Increment' | 'Decrement' }}
 */
const computeWindowPriceDifferenceForLine = (timeline, cp) => {
  if (!timeline || timeline.length === 0) {
    return null;
  }

  const cpTs = getCategoryLineTimestamp(cp)?.getTime();
  if (cpTs == null) {
    return null;
  }

  const idx = timeline.findIndex(
    (row) =>
      row._sortTs === cpTs &&
      (cp.price == null ||
        row.price == null ||
        roundPrice2(row.price) === roundPrice2(cp.price))
  );

  let currentPrice;
  let previousPrice;

  if (idx >= 0) {
    if (idx === 0) {
      return null;
    }
    currentPrice = roundPrice2(timeline[idx].price);
    previousPrice = roundPrice2(timeline[idx - 1].price);
  } else {
    // Line not matched in timeline (timestamp drift): compare cp to last row strictly before cpTs
    let prevIdx = -1;
    for (let i = timeline.length - 1; i >= 0; i -= 1) {
      if (timeline[i]._sortTs < cpTs) {
        prevIdx = i;
        break;
      }
    }
    if (prevIdx < 0) {
      return null;
    }
    currentPrice = roundPrice2(cp.price);
    previousPrice = roundPrice2(timeline[prevIdx].price);
  }

  const difference = roundPrice2(currentPrice - previousPrice);
  const tag = difference > 0 ? 'Increment' : 'Decrement';

  return { difference, tag };
};

/**
 * Live-summary only: per categoryPrices[] line, window-scoped { difference, tag } | null.
 */
const enrichLiveSummaryWithWindowPriceDifferences = async (docs, from, to) => {
  if (!docs || docs.length === 0) {
    return [];
  }

  const bases = docs.map((doc) =>
    typeof doc.toObject === 'function' ? doc.toObject() : { ...doc }
  );

  const mandiIdStrings = new Set();
  for (const base of bases) {
    if (!base.mandi) continue;
    const rawId = base.mandi._id != null ? base.mandi._id : base.mandi;
    if (rawId == null) continue;
    mandiIdStrings.add(String(rawId));
  }

  /** @type {Map<string, Array>} */
  const historyByMandiId = new Map();
  if (mandiIdStrings.size > 0) {
    const objectIds = [...mandiIdStrings]
      .filter((id) => mongoose.Types.ObjectId.isValid(id))
      .map((id) => new mongoose.Types.ObjectId(id));

    if (objectIds.length > 0) {
      const windowDocs = await MandiCategoryPrice.find({
        mandi: { $in: objectIds },
        $or: [{ updatedAt: { $gte: from } }, { 'categoryPrices.date': { $gte: from } }],
      }).lean();

      for (const row of windowDocs) {
        const key = String(row.mandi);
        if (!historyByMandiId.has(key)) {
          historyByMandiId.set(key, []);
        }
        historyByMandiId.get(key).push(row);
      }
    }
  }

  return bases.map((base) => {
    const mandiKey = base.mandi
      ? String(base.mandi._id != null ? base.mandi._id : base.mandi)
      : null;
    const historyForMandi = mandiKey ? historyByMandiId.get(mandiKey) || [] : [];
    const timelines = buildWindowTimelinesByCategoryKey(historyForMandi, from, to);

    const updatedCategoryPrices = (base.categoryPrices || []).map((categoryPrice) => {
      const cp = toPlainCategoryPrice(categoryPrice);
      const timeline = timelines.get(categoryLineKey(cp.category, cp.subCategory)) || [];
      const priceDifference = computeWindowPriceDifferenceForLine(timeline, cp);

      return {
        ...cp,
        priceDifference,
      };
    });

    return {
      ...base,
      categoryPrices: updatedCategoryPrices,
    };
  });
};

const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Admin GET /mandiRates — optional ?search= (line-level; same document[] shape).
 * Separate from live-summary so app behaviour stays unchanged when search is omitted.
 */
const filterAdminMandiRatesBySearch = (docs, searchTerm) => {
  const needle = searchTerm.trim().toLowerCase();
  if (!needle) {
    return docs;
  }

  return docs
    .map((row) => {
      const mandiName = (row.mandi?.mandiname || '').toLowerCase();
      const state = (row.mandi?.state || '').toLowerCase();
      const city = (row.mandi?.city || '').toLowerCase();
      const mandiMatches =
        mandiName.includes(needle) || state.includes(needle) || city.includes(needle);

      const categoryPrices = (row.categoryPrices || []).filter((cp) => {
        if (mandiMatches) return true;
        const category = (cp.category || '').toLowerCase();
        const subCategory = (cp.subCategory || '').toLowerCase();
        return category.includes(needle) || subCategory.includes(needle);
      });

      return { ...row, categoryPrices };
    })
    .filter((row) => (row.categoryPrices || []).length > 0);
};

/** Mongo pre-filter for admin search (mandi fields + category line fields). */
const buildAdminMandiRatesSearchQuery = async (searchTerm) => {
  const trimmed = searchTerm.trim();
  if (!trimmed) {
    return null;
  }

  const regex = new RegExp(escapeRegex(trimmed), 'i');
  const matchingMandis = await Mandi.find({
    $or: [{ mandiname: regex }, { state: regex }, { city: regex }],
  })
    .select('_id')
    .lean();
  const mandiIds = matchingMandis.map((m) => m._id);

  const orClauses = [
    ...(mandiIds.length > 0 ? [{ mandi: { $in: mandiIds } }] : []),
    { 'categoryPrices.category': regex },
    { 'categoryPrices.subCategory': regex },
  ];

  return orClauses.length > 0 ? { $or: orClauses } : null;
};

/**
 * Optional server-side search for live-summary (line-level; same rates[] shape).
 */
const filterLiveSummaryBySearch = (rates, searchTerm) => {
  const needle = searchTerm.trim().toLowerCase();
  if (!needle) {
    return rates;
  }

  return rates
    .map((row) => {
      const mandiName = (row.mandi?.mandiname || '').toLowerCase();
      const state = (row.mandi?.state || '').toLowerCase();
      const mandiMatches = mandiName.includes(needle) || state.includes(needle);

      const categoryPrices = (row.categoryPrices || []).filter((cp) => {
        if (mandiMatches) return true;
        const category = (cp.category || '').toLowerCase();
        const subCategory = (cp.subCategory || '').toLowerCase();
        return category.includes(needle) || subCategory.includes(needle);
      });

      return { ...row, categoryPrices };
    })
    .filter((row) => (row.categoryPrices || []).length > 0);
};

/** Distinct non-empty strings; first DB casing wins; sorted for stable chip lists. */
const collectDistinctDisplayStrings = (values) => {
  const seen = new Map();
  for (const raw of values) {
    if (typeof raw !== 'string') continue;
    const trimmed = raw.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (!seen.has(key)) {
      seen.set(key, trimmed);
    }
  }
  return Array.from(seen.values()).sort((a, b) => a.localeCompare(b));
};

const normalizeLiveSummarySubName = (str) => {
  if (str == null || str === '') return '';
  return String(str)
    .toLowerCase()
    .normalize('NFKC')
    .replace(/\./g, '')
    .replace(/["'`´''""]/g, '')
    .replace(/\binch\b/gi, '')
    .replace(/\bcutting\b/gi, 'cut')
    .replace(/\s+/g, ' ')
    .trim();
};

/**
 * Match mandi price-line subcategory label to SubCategory catalog (handles End Cut / End Cutting).
 */
const findSubCategoryDocForDisplayName = (displayName, allSubs) => {
  const needle = normalizeLiveSummarySubName(displayName);
  if (!needle || !Array.isArray(allSubs)) return null;

  const exact = allSubs.find(
    (s) => normalizeLiveSummarySubName(s?.name) === needle
  );
  if (exact) return exact;

  let best = null;
  let bestOverlap = 0;
  for (const sub of allSubs) {
    const key = normalizeLiveSummarySubName(sub?.name);
    if (!key) continue;
    if (key === needle) return sub;
    if (key.includes(needle) || needle.includes(key)) {
      const overlap = Math.min(key.length, needle.length);
      if (overlap > bestOverlap) {
        bestOverlap = overlap;
        best = sub;
      }
    }
  }
  return best;
};

/**
 * Attach catalog image fields for chip names shown during search.
 */
const buildLiveSummarySubcategoryMeta = async (displayNames) => {
  const names = Array.isArray(displayNames) ? displayNames : [];
  if (names.length === 0) return [];

  const allSubs = await SubCategory.find()
    .select('name image imageKey')
    .lean();

  return names.map((name) => {
    const match = findSubCategoryDocForDisplayName(name, allSubs);
    if (!match) {
      return { name, _id: null, image: null, imageKey: null };
    }
    return {
      name,
      _id: match._id,
      image: match.image ?? null,
      imageKey: match.imageKey ?? null,
    };
  });
};

/**
 * Chip metadata from final live-summary rates (after optional search).
 * @returns {{ statesWithRates: string[], categoriesWithRates: string[], subCategoriesWithRates: string[] }}
 */
const buildLiveSummaryChipMetadata = (rates) => {
  const states = [];
  const categories = [];
  const subCategories = [];

  for (const row of rates || []) {
    if (row.mandi?.state) {
      states.push(row.mandi.state);
    }
    for (const cp of row.categoryPrices || []) {
      if (cp.category) {
        categories.push(cp.category);
      }
      if (cp.subCategory != null && String(cp.subCategory).trim() !== '') {
        subCategories.push(String(cp.subCategory));
      }
    }
  }

  return {
    statesWithRates: collectDistinctDisplayStrings(states),
    categoriesWithRates: collectDistinctDisplayStrings(categories),
    subCategoriesWithRates: collectDistinctDisplayStrings(subCategories),
  };
};

/**
 * Enriches mandi rate documents with per-line priceDifference (same logic as legacy GET /mandiRates).
 * Uses one batched history load per unique mandi instead of one query per category line (fixes live-summary N+1).
 * @param {Array} docs - Mongoose docs or plain objects with populated `mandi` and `categoryPrices`.
 */
const enrichMandiRatesWithPriceDifferences = async (docs) => {
  if (!docs || docs.length === 0) {
    return [];
  }

  const bases = docs.map((mandiCategoryPrice) =>
    typeof mandiCategoryPrice.toObject === 'function'
      ? mandiCategoryPrice.toObject()
      : { ...mandiCategoryPrice }
  );

  const mandiIdStrings = new Set();
  for (const base of bases) {
    if (!base.mandi) continue;
    const rawId = base.mandi._id != null ? base.mandi._id : base.mandi;
    if (rawId == null) continue;
    mandiIdStrings.add(String(rawId));
  }

  /** @type {Map<string, Array>} */
  const historyByMandiId = new Map();
  if (mandiIdStrings.size > 0) {
    const objectIds = [...mandiIdStrings]
      .filter((id) => mongoose.Types.ObjectId.isValid(id))
      .map((id) => new mongoose.Types.ObjectId(id));

    if (objectIds.length > 0) {
      const allHistory = await MandiCategoryPrice.find({ mandi: { $in: objectIds } }).lean();
      for (const row of allHistory) {
        const key = String(row.mandi);
        if (!historyByMandiId.has(key)) {
          historyByMandiId.set(key, []);
        }
        historyByMandiId.get(key).push(row);
      }
    }
  }

  return bases.map((base) => {
    const mandiKey = base.mandi
      ? String(base.mandi._id != null ? base.mandi._id : base.mandi)
      : null;
    const historyForMandi = mandiKey ? historyByMandiId.get(mandiKey) || [] : [];

    const updatedCategoryPrices = (base.categoryPrices || []).map((categoryPrice) => {
      const cp =
        categoryPrice && typeof categoryPrice.toObject === 'function'
          ? categoryPrice.toObject()
          : { ...categoryPrice };
      const { category, subCategory } = cp;

      if (!base.mandi) {
        return { ...cp, priceDifference: {} };
      }

      const priceDifferenceData =
        computePriceDifferenceFromMandiDocs(historyForMandi, category, subCategory) || {};

      return {
        ...cp,
        priceDifference: priceDifferenceData,
      };
    });

    return {
      ...base,
      categoryPrices: updatedCategoryPrices,
    };
  });
};

/**
 * Live Rates home screen: documents whose relevance timestamp falls in [from, to] (UTC rolling window),
 * then latest document per mandi. Relevance = max(document.updatedAt, max in-window categoryPrices[].date).
 * Response categoryPrices[] are filtered to the same window (future/out-of-range lines excluded).
 * @see GET /mandiRates/live-summary
 */
const getLiveSummary = async (req, res) => {
  try {
    const rawDays = req.query.days;
    let days = rawDays === undefined || rawDays === '' ? 3 : parseInt(String(rawDays), 10);
    if (!Number.isFinite(days) || days < 1) days = 3;
    const maxDays = 90;
    if (days > maxDays) days = maxDays;

    const to = new Date();
    const from = new Date(to.getTime() - days * 24 * 60 * 60 * 1000);

    const mandiCollection = Mandi.collection.name;

    const pipeline = [
      // Superset filter so Mongo can use indexes on updatedAt / categoryPrices.date before computing relevanceAt
      {
        $match: {
          $or: [{ updatedAt: { $gte: from } }, { 'categoryPrices.date': { $gte: from } }],
        },
      },
      {
        $addFields: {
          maxPriceDateInWindow: {
            $reduce: {
              input: { $ifNull: ['$categoryPrices', []] },
              initialValue: null,
              in: {
                $let: {
                  vars: { d: '$$this.date' },
                  in: {
                    $cond: [
                      {
                        $or: [
                          { $eq: ['$$d', null] },
                          { $lt: ['$$d', from] },
                          { $gt: ['$$d', to] },
                        ],
                      },
                      '$$value',
                      {
                        $cond: [
                          { $eq: ['$$value', null] },
                          '$$d',
                          { $max: ['$$value', '$$d'] },
                        ],
                      },
                    ],
                  },
                },
              },
            },
          },
        },
      },
      {
        $addFields: {
          relevanceAt: {
            $cond: [
              { $eq: ['$maxPriceDateInWindow', null] },
              '$updatedAt',
              { $max: ['$updatedAt', '$maxPriceDateInWindow'] },
            ],
          },
        },
      },
      { $match: { relevanceAt: { $gte: from } } },
      { $sort: { mandi: 1, relevanceAt: -1 } },
      {
        $group: {
          _id: '$mandi',
          doc: { $first: '$$ROOT' },
        },
      },
      { $replaceRoot: { newRoot: '$doc' } },
      {
        $lookup: {
          from: mandiCollection,
          localField: 'mandi',
          foreignField: '_id',
          as: '_mandiPop',
        },
      },
      {
        $addFields: {
          mandi: { $arrayElemAt: ['$_mandiPop', 0] },
        },
      },
      { $project: { _mandiPop: 0, maxPriceDateInWindow: 0, relevanceAt: 0 } },
    ];

    const rows = await MandiCategoryPrice.aggregate(pipeline);

    let rates = await enrichLiveSummaryWithWindowPriceDifferences(rows, from, to);

    rates = rates
      .map((row) => ({
        ...row,
        categoryPrices: filterCategoryPricesToWindow(row.categoryPrices, from, to),
      }))
      .filter((row) => (row.categoryPrices || []).length > 0);

    const rawSearch = req.query.search;
    const searchTerm = typeof rawSearch === 'string' ? rawSearch.trim() : '';
    if (searchTerm) {
      rates = filterLiveSummaryBySearch(rates, searchTerm);
    }

    const { statesWithRates, categoriesWithRates, subCategoriesWithRates } =
      buildLiveSummaryChipMetadata(rates);

    const subCategoriesMeta = await buildLiveSummarySubcategoryMeta(
      subCategoriesWithRates
    );

    res.status(200).json({
      rates,
      statesWithRates,
      categoriesWithRates,
      subCategoriesWithRates,
      subCategoriesMeta,
      window: {
        days,
        from: from.toISOString(),
        to: to.toISOString(),
        timezone: 'UTC',
        relevance:
          'max(document.updatedAt, max in-window categoryPrices[].date); lines outside [from,to] are omitted',
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get all data (admin table). Optional ?search= — omitted or empty returns full dataset.
const getAllData = async (req, res) => {
  try {
    const rawSearch = req.query.search;
    const searchTerm = typeof rawSearch === 'string' ? rawSearch.trim() : '';

    let query = {};
    if (searchTerm) {
      const searchQuery = await buildAdminMandiRatesSearchQuery(searchTerm);
      if (!searchQuery) {
        return res.status(200).json([]);
      }
      query = searchQuery;
    }

    const data = await MandiCategoryPrice.find(query).populate('mandi');
    let updatedData = await enrichMandiRatesWithPriceDifferences(data);

    if (searchTerm) {
      updatedData = filterAdminMandiRatesBySearch(updatedData, searchTerm);
    }

    res.status(200).json(updatedData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get entire history of a Mandi
const getMandiHistory = async (req, res) => {
  try {
    const { mandiId } = req.params;
    const mandiHistory = await MandiCategoryPrice.find({ mandi: mandiId }).sort({ createdAt: -1 });
    res.status(200).json(mandiHistory);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get history of a specific category
const getCategoryHistory = async (req, res) => {
  try {
    const { mandiId, category } = req.params;
    const categoryHistory = await MandiCategoryPrice.find({
      mandi: mandiId,
      'categoryPrices.category': category,
    }).sort({ createdAt: -1 });

    res.status(200).json(categoryHistory);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get history based on time frames (week, month, year)
const getHistoryByTimeframe = async (req, res) => {
  try {
    const { mandiId, category, timeframe } = req.params;
    let startDate, endDate;

    switch (timeframe) {
      case 'today':
        startDate = new Date();
        startDate.setHours(0, 0, 0, 0); // Start of today
        endDate = new Date();
        endDate.setHours(23, 59, 59, 999); // End of today
        break;
      case 'week':
        startDate = new Date();
        startDate.setDate(startDate.getDate() - 6); // Last 7 days including today
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'month':
        startDate = new Date();
        startDate.setMonth(startDate.getMonth() - 1); // Last month including today
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'year':
        startDate = new Date();
        startDate.setFullYear(startDate.getFullYear() - 1); // Last year including today
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'all':
        startDate = null; // No date restriction for "all"
        break;
      default:
        return res.status(400).json({ message: 'Invalid timeframe' });
    }

    const query = {
      mandi: mandiId,
      'categoryPrices.category': category,
    };

    if (startDate) {
      query.createdAt = endDate ? { $gte: startDate, $lte: endDate } : { $gte: startDate };
    }

    const history = await MandiCategoryPrice.find(query).sort({ createdAt: -1 });

    res.status(200).json(history);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


const getMandiByCategory = async (req, res) => {
  try {
    const { category } = req.params;

    // Find all MandiCategoryPrice documents where the category is present
    const mandis = await MandiCategoryPrice.find({
      'categoryPrices.category': category,
    }).populate('mandi'); // Populate the Mandi reference

    // If no mandis are found, return a 404
    if (mandis.length === 0) {
      return res.status(404).json({ message: 'No Mandis found for the specified category' });
    }

    // Filter the categoryPrices array to include only the specified category
    const filteredMandis = mandis.map(mandi => {
      const filteredCategoryPrices = mandi.categoryPrices.filter(catPrice => catPrice.category === category);
      return {
        mandi: mandi.mandi || null, // Handle case where mandi is null
        categoryPrices: filteredCategoryPrices
      };
    });

    // Return the filtered Mandi data
    res.status(200).json(filteredMandis);
  } catch (error) {
    console.error('Error fetching Mandi data by category:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export {
  saveOrUpdateMandiCategoryPrices,
  saveCategoryPrices,
  updateCategoryPrice,
  deleteCategoryPrice,
  deleteCategoryPriceByEntryId,
  getAllData,
  getLiveSummary,
  getPriceDifference,
  getMandiHistory,
  getCategoryHistory,
  getHistoryByTimeframe,
  getMandiByCategory,
};
