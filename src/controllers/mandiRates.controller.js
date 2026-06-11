import mongoose from 'mongoose';
import MandiCategoryPrice from '../models/MandiRates.model.js';
import Mandi from '../models/Mandi.model.js';
import SubCategory from '../models/subCategory.modal.js';
import Notification from '../models/b2bNotification.js';
import { notifyMandiRatesUpdated } from './pushNotifications.controller.js';
import logger from '../config/logger.js';
import {
  computeAtFromLine,
  categoryPriceLineDedupeKey,
  dayKeyFromDate,
  getLiveSummaryAtRange,
  getLiveSummaryDiffWindow,
  LIVE_SUMMARY_WINDOW_DAYS,
  normalizeCategory,
  normalizeSubCategory,
} from '../services/mandiPricePoint.service.js';

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

    logger.info(
      `[mandiRates.save] saved ${Array.isArray(categoryPrices) ? categoryPrices.length : 0} ` +
        `category price line(s) for mandi ${mandi}`
    );

    // Only notify when rates were actually saved (prevents notifications without rates).
    if (Array.isArray(categoryPrices) && categoryPrices.length > 0) {
      try {
        await notifyMandiRatesUpdated();
      } catch (notifyErr) {
        logger.error(`[mandiRates.save] push notification error: ${notifyErr.message}`);
      }
    }
  } catch (error) {
    logger.error(`[mandiRates.save] error in saveCategoryPrices: ${error.message}`);
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

    // De-duplicate rows inside a single payload. Two rows that target the same
    // mandi + category + subCategory + day + time describe the same price line,
    // so only the last occurrence is kept. This guarantees one Excel file can
    // never insert duplicate lines on its own.
    const rowKey = (e) =>
      [
        String(e.mandiId),
        normalizeCategory(e.category),
        normalizeSubCategory(e.subCategory),
        dayKeyFromDate(e.date) || '',
        (e.time || '').trim(),
      ].join('::');

    const dedupedByKey = new Map();
    for (const entry of validMandiPrices) {
      dedupedByKey.set(rowKey(entry), entry);
    }
    const rowsToPersist = Array.from(dedupedByKey.values());

    // Group by mandi so each mandi document is loaded and saved exactly once.
    const rowsByMandi = new Map();
    for (const entry of rowsToPersist) {
      const id = String(entry.mandiId);
      if (!rowsByMandi.has(id)) rowsByMandi.set(id, []);
      rowsByMandi.get(id).push(entry);
    }

    let insertedCount = 0;
    let updatedCount = 0;
    let mandiDocsTouched = 0;
    const persistenceErrors = [];

    for (const [mandiId, entries] of rowsByMandi) {
      try {
        // Write into the latest existing document for this mandi (matches what the
        // admin table and live-summary read), or create the first one if none exist.
        let doc = await MandiCategoryPrice.findOne({ mandi: mandiId }).sort({ updatedAt: -1 });
        if (!doc) {
          doc = new MandiCategoryPrice({ mandi: mandiId, categoryPrices: [] });
        }

        for (const { category, subCategory, price, priceDifference, unit, date, time } of entries) {
          const subCategoryValue =
            subCategory == null || subCategory === '' ? null : subCategory;
          const dateValue = date ? new Date(date) : null;
          const safeDateValue =
            dateValue && !Number.isNaN(dateValue.getTime()) ? dateValue : null;
          const dayKey = dayKeyFromDate(safeDateValue);
          const timeValue = time || null;

          // Update the existing line in place when the same category + subCategory
          // already exists for this day + time; otherwise append a new historical
          // row. This is what stops duplicates from accumulating on re-upload while
          // still preserving genuine multi-day / multi-time history.
          const existingIndex = doc.categoryPrices.findIndex(
            (cp) =>
              normalizeCategory(cp.category) === normalizeCategory(category) &&
              normalizeSubCategory(cp.subCategory) === normalizeSubCategory(subCategoryValue) &&
              dayKeyFromDate(cp.date) === dayKey &&
              (cp.time || null) === timeValue
          );

          if (existingIndex >= 0) {
            const existing = doc.categoryPrices[existingIndex];
            existing.subCategory = subCategoryValue;
            existing.price = price || 0;
            existing.priceDifference = priceDifference || null;
            existing.unit = unit || null;
            existing.date = safeDateValue;
            existing.time = timeValue;
            updatedCount += 1;
          } else {
            doc.categoryPrices.push({
              category,
              subCategory: subCategoryValue,
              price: price || 0,
              priceDifference: priceDifference || null,
              unit: unit || null,
              date: safeDateValue,
              time: timeValue,
            });
            insertedCount += 1;
          }
        }

        await doc.save();
        mandiDocsTouched += 1;
      } catch (err) {
        persistenceErrors.push({ mandiId, error: err.message });
        logger.error(`[mandiRates.upload] failed to save mandi ${mandiId}: ${err.message}`);
      }
    }

    const totalPersisted = insertedCount + updatedCount;

    logger.info(
      `[mandiRates.upload] received=${mandiPrices.length} valid=${validMandiPrices.length} ` +
        `skipped=${skippedEntries.length} dedupedPayload=${rowsToPersist.length} ` +
        `mandisTouched=${mandiDocsTouched} inserted=${insertedCount} updated=${updatedCount} ` +
        `persistErrors=${persistenceErrors.length}`
    );

    // Data consistency: do NOT notify users when nothing was actually saved. This
    // prevents the "upload notification received but no rates appear" situation.
    if (totalPersisted === 0) {
      const failedAll = persistenceErrors.length > 0;
      return res.status(failedAll ? 500 : 400).json({
        message: failedAll
          ? 'No rates were saved due to server errors. Users were NOT notified.'
          : 'No valid rates to save. Nothing was persisted and users were NOT notified.',
        processed: 0,
        inserted: 0,
        updated: 0,
        skipped: skippedEntries.length,
        skippedEntries: skippedEntries.length > 0 ? skippedEntries : undefined,
        persistenceErrors: failedAll ? persistenceErrors : undefined,
      });
    }

    // Only notify AFTER at least one rate was successfully persisted.
    try {
      await notifyMandiRatesUpdated();
    } catch (notifyErr) {
      logger.error(`[mandiRates.upload] push notification error: ${notifyErr.message}`);
    }

    let responseMessage = `Mandi prices saved successfully. Inserted ${insertedCount}, updated ${updatedCount} across ${mandiDocsTouched} mandi(s).`;
    if (skippedEntries.length > 0) {
      responseMessage += ` Skipped ${skippedEntries.length} entries with invalid mandi IDs.`;
    }
    if (persistenceErrors.length > 0) {
      responseMessage += ` ${persistenceErrors.length} mandi group(s) failed to save.`;
    }

    res.status(200).json({
      message: responseMessage,
      processed: totalPersisted,
      inserted: insertedCount,
      updated: updatedCount,
      mandisTouched: mandiDocsTouched,
      skipped: skippedEntries.length,
      skippedEntries: skippedEntries.length > 0 ? skippedEntries : undefined,
      persistenceErrors: persistenceErrors.length > 0 ? persistenceErrors : undefined,
    });
  } catch (error) {
    logger.error(`[mandiRates.upload] error in saveOrUpdateMandiCategoryPrices: ${error.message}`);
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

const categoryLineKey = (category, subCategory) =>
  `${normalizeCategory(category)}::${normalizeSubCategory(subCategory)}`;

/** Sortable instant for a price line (IST calendar date + optional Indian 12h time). */
const getCategoryLineTimestamp = (cp, parentUpdatedAt) =>
  computeAtFromLine(
    {
      date: cp?.date ?? cp?.createdAt,
      time: cp?.time,
      lineUpdatedAt: cp?.updatedAt,
    },
    parentUpdatedAt
  );

const lineParentUpdatedAt = (cp, parentUpdatedAt) => cp?._parentUpdatedAt ?? parentUpdatedAt;

/** Keep only price lines whose date/time falls in the live-summary IST window. */
const filterCategoryPricesToWindow = (categoryPrices, from, to, parentUpdatedAt) =>
  (categoryPrices || []).filter((cp) => {
    const ts = getCategoryLineTimestamp(cp, lineParentUpdatedAt(cp, parentUpdatedAt));
    return ts && ts >= from && ts <= to;
  });

/**
 * Collapse exact duplicate lines (same category, subCategory, calendar day, time).
 * Preserves multi-day history; only removes true duplicates from legacy writes or
 * overlapping mandi documents. Ties break on createdAt then _id (later wins).
 */
const dedupeCategoryPriceLinesExact = (categoryPrices, parentUpdatedAt) => {
  const byKey = new Map();

  for (const cp of categoryPrices || []) {
    const key = categoryPriceLineDedupeKey(cp);
    const existing = byKey.get(key);

    if (!existing) {
      byKey.set(key, cp);
      continue;
    }

    const exCreated = existing.createdAt ? new Date(existing.createdAt).getTime() : 0;
    const curCreated = cp.createdAt ? new Date(cp.createdAt).getTime() : 0;
    if (
      curCreated > exCreated ||
      (curCreated === exCreated && String(cp._id || '') > String(existing._id || ''))
    ) {
      byKey.set(key, cp);
    }
  }

  return Array.from(byKey.values());
};

const stripInternalCategoryPriceFields = (cp) => {
  const { _parentUpdatedAt: _p, ...rest } = cp;
  return rest;
};

const toPlainCategoryPrice = (categoryPrice) =>
  categoryPrice && typeof categoryPrice.toObject === 'function'
    ? categoryPrice.toObject()
    : { ...categoryPrice };

const MANDI_RATE_DIFF_DEBUG = process.env.MANDI_LIVE_SUMMARY_DIFF_DEBUG === '1';

const logMandiRateDiff = (payload) => {
  if (MANDI_RATE_DIFF_DEBUG) {
    console.log('[mandiRateDiff]', JSON.stringify(payload));
  }
};

/**
 * Stage-by-stage live-summary tracing. Off by default; enable with
 * MANDI_LIVE_SUMMARY_DEBUG=1 to log records fetched / grouped / mapped / final
 * payload counts (used while diagnosing duplicates / missing rates).
 */
const MANDI_LIVE_SUMMARY_DEBUG = process.env.MANDI_LIVE_SUMMARY_DEBUG === '1';

const countLines = (rows) =>
  (rows || []).reduce((sum, r) => sum + (r.categoryPrices || []).length, 0);

const logLiveSummaryStage = (stage, payload) => {
  if (MANDI_LIVE_SUMMARY_DEBUG) {
    logger.info(`[liveSummary][${stage}] ${JSON.stringify(payload)}`);
  }
};

const formatLineForDiffLog = (row, parentUpdatedAt) => {
  const at = getCategoryLineTimestamp(row, parentUpdatedAt);
  return {
    id: row._id != null ? String(row._id) : null,
    date: row.date ?? null,
    time: row.time ?? null,
    at: at && !Number.isNaN(at.getTime()) ? at.toISOString() : null,
    price: row.price,
  };
};

const compareTimelineEntries = (a, b) => {
  if (a._sortTs !== b._sortTs) return a._sortTs - b._sortTs;
  const ca = a.createdAt ? new Date(a.createdAt).getTime() : 0;
  const cb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
  if (ca !== cb) return ca - cb;
  return String(a._id || '').localeCompare(String(b._id || ''));
};

/**
 * Builds per-(category, subCategory) timelines from mandi docs, oldest-first (IST date+time).
 * When from/to are passed, only in-window lines are included (matches live-summary cards).
 * @returns {Map<string, Array>}
 */
const buildCategoryTimelinesByKey = (mandiDocs, from = null, to = null) => {
  /** @type {Map<string, Array>} */
  const timelines = new Map();

  for (const doc of mandiDocs || []) {
    const parentUpdatedAt = doc.updatedAt || doc.createdAt;
    for (const rawCp of doc.categoryPrices || []) {
      const cp = toPlainCategoryPrice(rawCp);
      const ts = getCategoryLineTimestamp(cp, parentUpdatedAt);
      if (!ts || Number.isNaN(ts.getTime())) continue;
      if (from != null && to != null && (ts < from || ts > to)) continue;

      const key = categoryLineKey(cp.category, cp.subCategory);
      if (!timelines.has(key)) {
        timelines.set(key, []);
      }
      timelines.get(key).push({
        ...cp,
        _sortTs: ts.getTime(),
        _parentUpdatedAt: parentUpdatedAt,
      });
    }
  }

  for (const [key, entries] of timelines) {
    entries.sort(compareTimelineEntries);
    // Exact dedupe on timelines so duplicate DB rows do not skew price-difference chaining.
    timelines.set(key, dedupeCategoryPriceLinesExact(entries, null));
  }

  return timelines;
};

/**
 * Locate a price line on the chronological timeline (Mongo subdocument _id when available).
 */
const findTimelineIndexForLine = (timeline, cp, parentUpdatedAt) => {
  if (!timeline?.length || !cp) return -1;

  if (cp._id != null) {
    const idStr = String(cp._id);
    const byId = timeline.findIndex((row) => row._id != null && String(row._id) === idStr);
    if (byId >= 0) return byId;
  }

  const cpTs = getCategoryLineTimestamp(cp, parentUpdatedAt)?.getTime();
  if (cpTs == null) return -1;

  const cpTime = (cp.time || '').trim();
  const cpPrice = roundPrice2(cp.price);

  const sameInstant = timeline
    .map((row, index) => ({ row, index }))
    .filter(({ row }) => row._sortTs === cpTs);

  if (sameInstant.length === 1) {
    return sameInstant[0].index;
  }
  if (sameInstant.length > 1) {
    const exact = sameInstant.find(
      ({ row }) =>
        roundPrice2(row.price) === cpPrice && (row.time || '').trim() === cpTime
    );
    if (exact) return exact.index;
    const byCreated = [...sameInstant].sort(
      (a, b) => compareTimelineEntries(a.row, b.row)
    );
    return byCreated[byCreated.length - 1].index;
  }

  return -1;
};

const unchangedPriceDifference = () => ({ difference: 0, tag: 'Unchanged' });

/**
 * Live-summary diff: current line vs immediately previous in-window chronological entry.
 * Older DB history outside the live-summary window is ignored so cards match visible rows.
 * @returns {{ difference: number, tag: 'Increment' | 'Decrement' | 'Unchanged' }}
 */
const computeChronologicalPriceDifferenceForLine = (
  windowTimeline,
  cp,
  parentUpdatedAt,
  logContext = {}
) => {
  if (!windowTimeline || windowTimeline.length === 0) {
    return unchangedPriceDifference();
  }

  const cpTs = getCategoryLineTimestamp(cp, parentUpdatedAt)?.getTime();
  if (cpTs == null) {
    return unchangedPriceDifference();
  }

  let idx = findTimelineIndexForLine(windowTimeline, cp, parentUpdatedAt);
  let currentRow = cp;
  let previousRow;

  if (idx < 0) {
    const insertAt = windowTimeline.findIndex((row) => row._sortTs > cpTs);
    const slot = insertAt === -1 ? windowTimeline.length : insertAt;
    if (slot === 0) {
      logMandiRateDiff({
        ...logContext,
        note: 'first_in_window_timeline_unmatched_line',
        current: formatLineForDiffLog(cp, parentUpdatedAt),
        previous: null,
        difference: 0,
        tag: 'Unchanged',
      });
      return unchangedPriceDifference();
    }
    previousRow = windowTimeline[slot - 1];
  } else if (idx === 0) {
    logMandiRateDiff({
      ...logContext,
      note: 'first_in_window_timeline',
      current: formatLineForDiffLog(windowTimeline[0], parentUpdatedAt),
      previous: null,
      difference: 0,
      tag: 'Unchanged',
    });
    return unchangedPriceDifference();
  } else {
    currentRow = windowTimeline[idx];
    previousRow = windowTimeline[idx - 1];
  }

  const currentPrice = roundPrice2(currentRow.price ?? cp.price);
  const previousPrice = roundPrice2(previousRow.price);
  const difference = roundPrice2(currentPrice - previousPrice);
  const tag =
    difference > 0 ? 'Increment' : difference < 0 ? 'Decrement' : 'Unchanged';

  logMandiRateDiff({
    ...logContext,
    current: formatLineForDiffLog(currentRow, parentUpdatedAt),
    previous: formatLineForDiffLog(
      previousRow,
      previousRow._parentUpdatedAt ?? parentUpdatedAt
    ),
    difference,
    tag,
  });

  return { difference, tag };
};

/**
 * Load all MandiCategoryPrice documents grouped by mandi id string.
 * @returns {Promise<Map<string, Array>>}
 */
const loadMandiDocsByMandiId = async (mandiIdStrings) => {
  /** @type {Map<string, Array>} */
  const historyByMandiId = new Map();
  const ids = [...mandiIdStrings].filter(Boolean);
  if (ids.length === 0) return historyByMandiId;

  const objectIds = ids
    .filter((id) => mongoose.Types.ObjectId.isValid(id))
    .map((id) => new mongoose.Types.ObjectId(id));

  if (objectIds.length === 0) return historyByMandiId;

  const allMandiDocs = await MandiCategoryPrice.find({
    mandi: { $in: objectIds },
  }).lean();

  for (const row of allMandiDocs) {
    const key = String(row.mandi);
    if (!historyByMandiId.has(key)) {
      historyByMandiId.set(key, []);
    }
    historyByMandiId.get(key).push(row);
  }

  return historyByMandiId;
};

/**
 * Merge categoryPrices from every document for each mandi (legacy multi-doc support).
 */
const mergeCategoryPricesFromAllMandiDocs = (baseRows, historyByMandiId) =>
  baseRows.map((row) => {
    const mandiKey = row.mandi
      ? String(row.mandi._id != null ? row.mandi._id : row.mandi)
      : null;
    const allDocs = mandiKey ? historyByMandiId.get(mandiKey) || [row] : [row];
    const mergedPrices = [];

    for (const doc of allDocs) {
      const parentUpdatedAt = doc.updatedAt || doc.createdAt;
      for (const rawCp of doc.categoryPrices || []) {
        mergedPrices.push({
          ...toPlainCategoryPrice(rawCp),
          _parentUpdatedAt: parentUpdatedAt,
        });
      }
    }

    return { ...row, categoryPrices: mergedPrices };
  });

/**
 * Live-summary only: per categoryPrices[] line, diff vs previous entry in the latest 3 IST calendar days.
 * @param {Array} docs
 * @param {Map<string, Array>|null} [preloadedHistoryByMandiId]
 */
const enrichLiveSummaryWithWindowPriceDifferences = async (
  docs,
  preloadedHistoryByMandiId = null
) => {
  const { from, to } = getLiveSummaryDiffWindow();
  if (!docs || docs.length === 0) {
    return [];
  }

  const bases = docs.map((doc) =>
    typeof doc.toObject === 'function' ? doc.toObject() : { ...doc }
  );

  /** @type {Map<string, Array>} */
  let historyByMandiId = preloadedHistoryByMandiId;
  if (!historyByMandiId) {
    const mandiIdStrings = new Set();
    for (const base of bases) {
      if (!base.mandi) continue;
      const rawId = base.mandi._id != null ? base.mandi._id : base.mandi;
      if (rawId == null) continue;
      mandiIdStrings.add(String(rawId));
    }
    historyByMandiId = await loadMandiDocsByMandiId(mandiIdStrings);
  }

  return bases.map((base) => {
    const mandiKey = base.mandi
      ? String(base.mandi._id != null ? base.mandi._id : base.mandi)
      : null;
    const historyForMandi = mandiKey ? historyByMandiId.get(mandiKey) || [] : [];
    const windowTimelines = buildCategoryTimelinesByKey(historyForMandi, from, to);

    const parentUpdatedAt = base.updatedAt || base.createdAt;
    const mandiName = base.mandi?.mandiname ?? mandiKey;
    const updatedCategoryPrices = (base.categoryPrices || []).map((categoryPrice) => {
      const cp = toPlainCategoryPrice(categoryPrice);
      const lineParent = lineParentUpdatedAt(cp, parentUpdatedAt);
      const { priceDifference: _storedDbDiff, _parentUpdatedAt: _p, ...cpWithoutStoredDiff } = cp;
      const lineKey = categoryLineKey(cp.category, cp.subCategory);
      const windowTimeline = windowTimelines.get(lineKey) || [];
      const priceDifference = computeChronologicalPriceDifferenceForLine(
        windowTimeline,
        cp,
        lineParent,
        {
          mandi: mandiName,
          category: cp.category,
          subCategory: cp.subCategory,
          lineKey,
          hadStoredDbDiff: _storedDbDiff != null,
        }
      );

      return {
        ...cpWithoutStoredDiff,
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
 * Live Rates home screen: documents whose relevance timestamp falls in [from, to] (IST calendar window),
 * then latest document per mandi. Relevance = max(document.updatedAt, max in-window categoryPrices[].date).
 * Response categoryPrices[] are filtered to the same window (future/out-of-range lines excluded).
 * @see GET /mandiRates/live-summary
 */
const getLiveSummary = async (req, res) => {
  try {
    // Always latest 3 IST calendar days (matches app ?days=3); query param is ignored for consistency.
    const days = LIVE_SUMMARY_WINDOW_DAYS;
    const { from, to } = getLiveSummaryAtRange(days);

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

    // STAGE 1 — records fetched from DB (one grouped row per mandi from the aggregation).
    const rows = await MandiCategoryPrice.aggregate(pipeline);
    logLiveSummaryStage('fetched', {
      window: { from: from.toISOString(), to: to.toISOString() },
      mandiDocs: rows.length,
      totalCategoryLines: countLines(rows),
    });

    const mandiIdStrings = new Set(
      rows
        .map((row) => {
          if (!row.mandi) return null;
          const rawId = row.mandi._id != null ? row.mandi._id : row.mandi;
          return rawId != null ? String(rawId) : null;
        })
        .filter(Boolean)
    );
    const historyByMandiId = await loadMandiDocsByMandiId(mandiIdStrings);
    const mergedRows = mergeCategoryPricesFromAllMandiDocs(rows, historyByMandiId);

    logLiveSummaryStage('merged', {
      mandiDocs: mergedRows.length,
      totalCategoryLines: countLines(mergedRows),
      mandisWithMultiDoc: [...historyByMandiId.values()].filter((docs) => docs.length > 1).length,
    });

    // Window filter + exact dedupe BEFORE enrich so response lines match priceDifference
    // (same shape as before: computed diff vs previous in-window day, no duplicate cards).
    let collapsedDuplicates = 0;
    let windowedLines = 0;
    const windowedDedupedRows = mergedRows
      .map((row) => {
        const parentUpdatedAt = row.updatedAt || row.createdAt;
        const windowed = filterCategoryPricesToWindow(
          row.categoryPrices,
          from,
          to,
          parentUpdatedAt
        );
        windowedLines += windowed.length;
        const deduped = dedupeCategoryPriceLinesExact(windowed, parentUpdatedAt);
        if (deduped.length !== windowed.length) {
          collapsedDuplicates += windowed.length - deduped.length;
          logger.warn(
            `[liveSummary] collapsed ${windowed.length - deduped.length} exact duplicate line(s) ` +
              `for mandi ${row.mandi?.mandiname || row.mandi?._id || row._id}`
          );
        }
        return { ...row, categoryPrices: deduped };
      })
      .filter((row) => (row.categoryPrices || []).length > 0);

    if (collapsedDuplicates > 0) {
      logger.warn(
        `[liveSummary] total ${collapsedDuplicates} exact duplicate line(s) collapsed across all mandis`
      );
    }

    logLiveSummaryStage('windowed', {
      mandiDocs: windowedDedupedRows.length,
      linesInWindow: windowedLines,
      duplicatesCollapsed: collapsedDuplicates,
      uniqueCategoryLines: countLines(windowedDedupedRows),
    });

    let rates = await enrichLiveSummaryWithWindowPriceDifferences(
      windowedDedupedRows,
      historyByMandiId
    );

    // STAGE 2 — after price-difference enrichment (response lines unchanged from windowed step).
    logLiveSummaryStage('grouped', {
      mandiDocs: rates.length,
      totalCategoryLines: countLines(rates),
    });

    rates = rates.map((row) => ({
      ...row,
      categoryPrices: (row.categoryPrices || []).map(stripInternalCategoryPriceFields),
    }));

    // STAGE 3 — final line count after stripping internal fields (same cards as windowed step).
    logLiveSummaryStage('mapped', {
      mandiDocs: rates.length,
      linesInWindow: windowedLines,
      duplicatesCollapsed: collapsedDuplicates,
      uniqueCategoryLines: countLines(rates),
    });

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

    // STAGE 4 — final response payload shape.
    logLiveSummaryStage('final', {
      mandis: rates.length,
      totalCategoryLines: countLines(rates),
      states: statesWithRates.length,
      categories: categoriesWithRates.length,
      subCategories: subCategoriesWithRates.length,
      searchApplied: Boolean(searchTerm),
    });

    res.status(200).json({
      rates,
      statesWithRates,
      categoriesWithRates,
      subCategoriesWithRates,
      subCategoriesMeta,
      window: {
        days,
        calendarDays: days,
        from: from.toISOString(),
        to: to.toISOString(),
        timezone: 'Asia/Kolkata',
        description: `Latest ${days} IST calendar days including today (today + previous ${days - 1})`,
        priceDifferenceUsesSameWindow: true,
        relevance:
          'max(document.updatedAt, max in-window categoryPrices[].date); lines outside IST [from,to] are omitted',
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
