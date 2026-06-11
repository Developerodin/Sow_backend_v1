import mongoose from 'mongoose';
import moment from 'moment';
import MandiCategoryPrice from '../models/MandiRates.model.js';

const IST_OFFSET_MINUTES = 330;

/** Trim, lowercase, collapse internal whitespace (single spaces). */
export function normalizeSubCategory(value) {
  if (value == null || value === '') return '';
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

/** Trim, lowercase, collapse spaces — consistent matching for category + query. */
export function normalizeCategory(value) {
  if (value == null || value === '') return '';
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

/** UTC calendar day (YYYY-MM-DD) for upload/dedupe keys — matches Excel upload matching. */
export function dayKeyFromDate(date) {
  if (!date) return null;
  const d = date instanceof Date ? date : new Date(date);
  return Number.isNaN(d.getTime()) ? null : d.toISOString().split('T')[0];
}

/** Exact price-line identity: category + subCategory + day + time (preserves multi-day history). */
export function categoryPriceLineDedupeKey(cp) {
  return [
    normalizeCategory(cp?.category),
    normalizeSubCategory(cp?.subCategory),
    dayKeyFromDate(cp?.date) || '',
    String(cp?.time ?? '').trim(),
  ].join('::');
}

function parseIndian12hTime(timeStr) {
  if (!timeStr || typeof timeStr !== 'string') return null;
  const m = timeStr.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!m) return null;
  let h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  const ap = m[3].toUpperCase();
  if (ap === 'PM' && h !== 12) h += 12;
  if (ap === 'AM' && h === 12) h = 0;
  if (h < 0 || h > 23 || min < 0 || min > 59) return null;
  return { hour: h, minute: min };
}

/**
 * IST calendar instant from a Date (or ISO) + optional 12h time string.
 */
export function computeAtFromLine({ date, time, lineUpdatedAt }, parentUpdatedAt) {
  const fallback = lineUpdatedAt || parentUpdatedAt || new Date();
  if (!date) {
    return fallback instanceof Date ? fallback : new Date(fallback);
  }
  const base = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(base.getTime())) {
    return fallback instanceof Date ? fallback : new Date(fallback);
  }
  const ymd = moment(base).utcOffset(IST_OFFSET_MINUTES).format('YYYY-MM-DD');
  const t = parseIndian12hTime(time);
  if (t) {
    const iso = `${ymd}T${String(t.hour).padStart(2, '0')}:${String(t.minute).padStart(2, '0')}:00+05:30`;
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? new Date(base) : d;
  }
  const startIst = new Date(`${ymd}T00:00:00+05:30`);
  return Number.isNaN(startIst.getTime()) ? new Date(base) : startIst;
}

function toObjectId(mandiId) {
  if (!mandiId) return null;
  try {
    if (mandiId instanceof mongoose.Types.ObjectId) return mandiId;
    const s = String(mandiId);
    if (!mongoose.Types.ObjectId.isValid(s)) return null;
    return new mongoose.Types.ObjectId(s);
  } catch (e) {
    return null;
  }
}

function coercePrice(value) {
  if (value === undefined || value === null || value === '') return 0;
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Each MandiCategoryPrice document is one snapshot; history = many documents for the same mandi over time.
 * Extracts one observation per matching line per document, with `at` aligned to line date/time or doc timestamps.
 */
function extractRawPointsForSeries(docs, catNorm, subNorm, range) {
  const raw = [];
  for (const doc of docs) {
    const parentUpdatedAt = doc.updatedAt || doc.createdAt;
    const lines = doc.categoryPrices || [];
    for (const line of lines) {
      if (normalizeCategory(line.category) !== catNorm) continue;
      if (normalizeSubCategory(line.subCategory) !== subNorm) continue;
      const at = computeAtFromLine(
        {
          date: line.date,
          time: line.time,
          lineUpdatedAt: line.updatedAt,
        },
        parentUpdatedAt
      );
      if (at < range.from || at > range.to) continue;
      raw.push({
        at,
        price: coercePrice(line.price),
        unit: line.unit || null,
      });
    }
  }
  raw.sort((a, b) => a.at - b.at);
  return raw;
}

function labelFromBucketKey(key, timeframe, tzMode) {
  if (!key) return '';
  if (timeframe === 'year') {
    const m =
      tzMode === 'utc' ? moment.utc(key, 'YYYY-MM') : moment(key, 'YYYY-MM').utcOffset(IST_OFFSET_MINUTES);
    return m.isValid() ? m.format('MMM YYYY') : key;
  }
  const m =
    tzMode === 'utc' ? moment.utc(key, 'YYYY-MM-DD') : moment(key, 'YYYY-MM-DD').utcOffset(IST_OFFSET_MINUTES);
  return m.isValid() ? m.format('D MMM') : key;
}

function bucketKeyForDate(d, timeframe, tzMode) {
  const m =
    tzMode === 'utc' ? moment.utc(d) : moment(d).utcOffset(IST_OFFSET_MINUTES);
  if (timeframe === 'year') return m.format('YYYY-MM');
  return m.format('YYYY-MM-DD');
}

/**
 * Last observation per calendar bucket (day or month) in the chosen timezone.
 */
function bucketRawPoints(rawPoints, timeframe, tzMode) {
  if (rawPoints.length === 0) return [];
  const map = new Map();
  for (const p of rawPoints) {
    const key = bucketKeyForDate(p.at, timeframe, tzMode);
    const prev = map.get(key);
    if (!prev || p.at > prev.at) map.set(key, p);
  }
  const keys = [...map.keys()].sort();
  return keys.map((key) => {
    const p = map.get(key);
    return {
      at: p.at.toISOString(),
      price: p.price,
      label: labelFromBucketKey(key, timeframe, tzMode),
    };
  });
}

/** Range rules for `at` filter: IST (default) or UTC via tzMode. */
export function getAtRangeForTimeframe(timeframe, tzMode = 'ist') {
  const useUtc = tzMode === 'utc';
  const now = useUtc ? moment.utc() : moment().utcOffset(IST_OFFSET_MINUTES);
  let from;
  const to = new Date();

  switch (timeframe) {
    case 'today':
      from = now.clone().startOf('day').toDate();
      break;
    case 'week':
      from = now.clone().subtract(6, 'days').startOf('day').toDate();
      break;
    case 'month':
      from = now.clone().subtract(29, 'days').startOf('day').toDate();
      break;
    case 'year':
      from = now.clone().startOf('year').toDate();
      break;
    default:
      return null;
  }
  return { from, to };
}

/** Live Rates + in-window price diff always use this many IST calendar days (today + prior 2). */
export const LIVE_SUMMARY_WINDOW_DAYS = 3;

/**
 * Latest N IST calendar days including today (N=3 → start of today-2 through end of today IST).
 * End bound is end of today IST so same-day rates are not dropped on UTC-hosted servers.
 */
export function getLiveSummaryAtRange(days = LIVE_SUMMARY_WINDOW_DAYS) {
  let d = days;
  if (!Number.isFinite(d) || d < 1) d = LIVE_SUMMARY_WINDOW_DAYS;
  if (d > 90) d = 90;
  const now = moment().utcOffset(IST_OFFSET_MINUTES);
  const from = now.clone().subtract(d - 1, 'days').startOf('day').toDate();
  const to = now.clone().endOf('day').toDate();
  return { from, to, days: d };
}

/** Window used for live-summary cards and price-difference chaining (always 3 days). */
export function getLiveSummaryDiffWindow() {
  return getLiveSummaryAtRange(LIVE_SUMMARY_WINDOW_DAYS);
}

/**
 * Price history from MandiCategoryPrice snapshots only (no separate collection).
 * Requires multiple documents over time for the same mandi for a real series; a single upserted doc yields at most one point per line in-range.
 */
export async function fetchPriceHistory({
  mandiId,
  category,
  subCategory,
  timeframe,
  tzMode = 'ist',
}) {
  const mid = toObjectId(mandiId);
  if (!mid) return { points: [], unit: null, window: null };

  const cat = normalizeCategory(category);
  const sub = normalizeSubCategory(subCategory);

  const range = getAtRangeForTimeframe(timeframe, tzMode);
  if (!range) return { points: [], unit: null, window: null };

  const windowMeta = {
    from: range.from.toISOString(),
    to: range.to.toISOString(),
  };

  const docs = await MandiCategoryPrice.find({ mandi: mid }).lean();
  const rawPoints = extractRawPointsForSeries(docs, cat, sub, range);
  const unit = rawPoints.length ? rawPoints[rawPoints.length - 1].unit : null;

  const labelTime = (d) =>
    tzMode === 'utc' ? moment.utc(d).format('HH:mm') : moment(d).utcOffset(IST_OFFSET_MINUTES).format('HH:mm');

  if (timeframe === 'today') {
    const points = rawPoints.map((p) => ({
      at: p.at.toISOString(),
      price: p.price,
      label: labelTime(p.at),
    }));
    return { points, unit, window: windowMeta };
  }

  const points = bucketRawPoints(rawPoints, timeframe, tzMode);
  return { points, unit, window: windowMeta };
}
