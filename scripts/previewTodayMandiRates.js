/* eslint-disable no-console */
/**
 * Read-only preview: how many mandi rate lines exist for today (IST).
 *
 * Both upload paths write to MandiCategoryPrice (MandiRates.model.js):
 *   • Excel  → POST /v1/mandiRates/mandi-prices
 *   • AI     → POST /v1/market-rates/parse → marketRateParser.service.js
 *
 * Usage:
 *   node scripts/previewTodayMandiRates.js
 *   node scripts/previewTodayMandiRates.js --verbose   # sample rows (max 20)
 *   node scripts/previewTodayMandiRates.js --date=2026-07-27
 */
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = 'development';
}

const IST_OFFSET_MINUTES = 330;
const VERBOSE = process.argv.includes('--verbose');
const dateArg = process.argv.find((a) => a.startsWith('--date='));

const main = async () => {
  const mongoose = (await import('mongoose')).default;
  const moment = (await import('moment')).default;
  const config = (await import('../src/config/config.js')).default;
  const { default: MandiCategoryPrice } = await import('../src/models/MandiRates.model.js');
  const { default: Mandi } = await import('../src/models/Mandi.model.js');
  const { default: MarketRateParseJob } = await import('../src/models/MarketRateParseJob.model.js');
  const { dayKeyFromDate } = await import('../src/services/mandiPricePoint.service.js');

  const targetDayKey = dateArg
    ? dateArg.split('=')[1]
    : moment().utcOffset(IST_OFFSET_MINUTES).format('YYYY-MM-DD');

  const istDayBounds = (dayKey) => {
    const from = moment(`${dayKey}T00:00:00+05:30`).toDate();
    const to = moment(`${dayKey}T23:59:59.999+05:30`).toDate();
    return { from, to };
  };

  const inIstDay = (value, from, to) => {
    if (!value) return false;
    const d = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(d.getTime())) return false;
    return d >= from && d <= to;
  };

  const { from, to } = istDayBounds(targetDayKey);

  console.log('=== Today Mandi Rates Preview (read-only) ===');
  console.log(`Target IST day: ${targetDayKey}`);
  console.log(`Window: ${from.toISOString()} → ${to.toISOString()}\n`);

  console.log('Connecting to MongoDB...');
  await mongoose.connect(config.mongoose.url, config.mongoose.options);
  console.log('Connected.\n');

  let docsScanned = 0;
  let linesWithRateDateToday = 0;
  let linesInsertedToday = 0;
  let linesUpdatedToday = 0;
  const mandiIdsWithRateDateToday = new Set();
  const sampleRows = [];

  try {
    const mandiNameCache = new Map();
    const getMandiName = async (mandiId) => {
      const key = String(mandiId);
      if (mandiNameCache.has(key)) return mandiNameCache.get(key);
      const doc = await Mandi.findById(mandiId).select('mandiname city state').lean();
      const label = doc
        ? [doc.mandiname, doc.city, doc.state].filter(Boolean).join(', ')
        : key;
      mandiNameCache.set(key, label);
      return label;
    };

    const cursor = MandiCategoryPrice.find({}).populate('mandi', 'mandiname city state').cursor();

    for (let doc = await cursor.next(); doc != null; doc = await cursor.next()) {
      docsScanned += 1;
      const mandiId = doc.mandi?._id ?? doc.mandi;

      for (const cp of doc.categoryPrices || []) {
        const rateDayKey = dayKeyFromDate(cp.date);
        const rateDateIsTarget = rateDayKey === targetDayKey;
        const createdToday = inIstDay(cp.createdAt, from, to);
        const updatedToday = inIstDay(cp.updatedAt, from, to);

        if (rateDateIsTarget) {
          linesWithRateDateToday += 1;
          if (mandiId) mandiIdsWithRateDateToday.add(String(mandiId));
        }

        if (createdToday) {
          linesInsertedToday += 1;
        } else if (updatedToday) {
          linesUpdatedToday += 1;
        }

        if (VERBOSE && rateDateIsTarget && sampleRows.length < 20) {
          const mandiLabel =
            doc.mandi?.mandiname ||
            (mandiId ? await getMandiName(mandiId) : 'Unknown mandi');
          sampleRows.push({
            mandi: mandiLabel,
            category: cp.category,
            subCategory: cp.subCategory ?? '',
            price: cp.price,
            unit: cp.unit ?? '',
            time: cp.time ?? '',
            rateDate: rateDayKey,
            createdAt: cp.createdAt?.toISOString?.() ?? cp.createdAt,
            sourceHint: createdToday ? 'inserted-today' : updatedToday ? 'updated-today' : 'existing',
          });
        }
      }
    }

    const parseJobsToday = await MarketRateParseJob.countDocuments({
      createdAt: { $gte: from, $lte: to },
    });
    const parseJobsCompleted = await MarketRateParseJob.countDocuments({
      createdAt: { $gte: from, $lte: to },
      status: 'completed',
    });

    console.log('--- Rate lines (MandiCategoryPrice.categoryPrices[]) ---');
    console.log(`Documents scanned:              ${docsScanned}`);
    console.log(`Lines with rate date = ${targetDayKey}: ${linesWithRateDateToday}`);
    console.log(`Distinct mandis with today rate:  ${mandiIdsWithRateDateToday.size}`);
    console.log(`Lines created today (insert):   ${linesInsertedToday}`);
    console.log(`Lines updated today (re-upload): ${linesUpdatedToday}`);

    console.log('\n--- AI parse jobs today (MarketRateParseJob, TTL 24h) ---');
    console.log(`Parse jobs started today:       ${parseJobsToday}`);
    console.log(`Parse jobs completed today:     ${parseJobsCompleted}`);

    console.log('\nNotes:');
    console.log('• "Rate date" = categoryPrices.date (what Excel/AI sets for the trading day).');
    console.log('• Excel + AI both persist to MandiCategoryPrice; there is no separate insert log.');
    console.log('• MarketRates.model.js is legacy/unused for this flow.');
    console.log('• MarketRateParseJob records are auto-deleted after 24 hours.');

    if (VERBOSE && sampleRows.length > 0) {
      console.log(`\n--- Sample rows (rate date = ${targetDayKey}, max 20) ---`);
      console.table(sampleRows);
    } else if (VERBOSE) {
      console.log(`\nNo rows with rate date ${targetDayKey} to sample.`);
    }
  } catch (error) {
    console.error('Preview failed:', error);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
};

main();
