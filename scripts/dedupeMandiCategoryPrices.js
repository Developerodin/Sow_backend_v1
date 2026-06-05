/* eslint-disable no-console */
/**
 * One-off / repeatable cleanup for duplicate categoryPrices lines that were
 * created by the previous Excel-upload bug (POST /mandiRates/mandi-prices), where
 * a positional `$set` update AND a `$addToSet` append ran for every row, so every
 * re-upload appended a brand-new copy of an already-existing line.
 *
 * A "duplicate" here is two or more categoryPrices entries in the SAME document
 * with the same normalized category + subCategory + day (YYYY-MM-DD) + time.
 * Genuine history (different day or time) is preserved. When duplicates are found,
 * the entry with the newest createdAt / _id is kept.
 *
 * Usage:
 *   node scripts/dedupeMandiCategoryPrices.js            # DRY RUN (no writes) — reports what would change
 *   node scripts/dedupeMandiCategoryPrices.js --apply    # actually removes duplicates
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import config from '../src/config/config.js';
import MandiCategoryPrice from '../src/models/MandiRates.model.js';
import {
  normalizeCategory,
  normalizeSubCategory,
} from '../src/services/mandiPricePoint.service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const APPLY = process.argv.includes('--apply');

const dayKeyFromDate = (date) => {
  if (!date) return '';
  const d = date instanceof Date ? date : new Date(date);
  return Number.isNaN(d.getTime()) ? '' : d.toISOString().split('T')[0];
};

const lineKey = (cp) =>
  [
    normalizeCategory(cp.category),
    normalizeSubCategory(cp.subCategory),
    dayKeyFromDate(cp.date),
    (cp.time || '').trim(),
  ].join('::');

/** Later createdAt wins; fall back to _id ordering for determinism. */
const keepLatest = (a, b) => {
  const ca = a.createdAt ? new Date(a.createdAt).getTime() : 0;
  const cb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
  if (ca !== cb) return ca > cb ? a : b;
  return String(a._id || '') >= String(b._id || '') ? a : b;
};

const main = async () => {
  console.log(`Connecting to MongoDB... (mode: ${APPLY ? 'APPLY' : 'DRY RUN'})`);
  await mongoose.connect(config.mongoose.url, config.mongoose.options);
  console.log('Connected to MongoDB\n');

  let docsScanned = 0;
  let docsWithDuplicates = 0;
  let duplicateLinesRemoved = 0;

  try {
    const cursor = MandiCategoryPrice.find({}).cursor();

    for (let doc = await cursor.next(); doc != null; doc = await cursor.next()) {
      docsScanned += 1;
      const lines = doc.categoryPrices || [];
      if (lines.length < 2) continue;

      const winnerByKey = new Map();
      for (const cp of lines) {
        const key = lineKey(cp);
        const current = winnerByKey.get(key);
        winnerByKey.set(key, current ? keepLatest(current, cp) : cp);
      }

      const keptIds = new Set(
        Array.from(winnerByKey.values()).map((cp) => String(cp._id))
      );
      const removed = lines.length - keptIds.size;
      if (removed <= 0) continue;

      docsWithDuplicates += 1;
      duplicateLinesRemoved += removed;

      console.log(
        `Mandi doc ${doc._id} (mandi ${doc.mandi}): ${lines.length} lines -> ` +
          `${keptIds.size} unique (${removed} duplicate line(s) ${APPLY ? 'removed' : 'would be removed'})`
      );

      if (APPLY) {
        doc.categoryPrices = lines.filter((cp) => keptIds.has(String(cp._id)));
        await doc.save();
      }
    }

    console.log('\n--- Summary ---');
    console.log(`Documents scanned:        ${docsScanned}`);
    console.log(`Documents with duplicates: ${docsWithDuplicates}`);
    console.log(`Duplicate lines ${APPLY ? 'removed' : 'to remove'}:    ${duplicateLinesRemoved}`);
    if (!APPLY && duplicateLinesRemoved > 0) {
      console.log('\nThis was a DRY RUN. Re-run with --apply to remove the duplicates.');
    }
  } catch (error) {
    console.error('Error during dedupe:', error);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
};

main();
