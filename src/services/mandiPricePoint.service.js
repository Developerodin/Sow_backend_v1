import mongoose from 'mongoose';
import moment from 'moment';
import MandiPricePoint from '../models/MandiPricePoint.model.js';

const IST_OFFSET_MINUTES = 330;

/** Trim, lowercase, collapse internal whitespace (single spaces). */
export function normalizeSubCategory(value) {
  if (value == null || value === '') return '';
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

export function normalizeCategory(value) {
  if (value == null) return '';
  return String(value).trim();
}

/**
 * Parse "10:30 AM" / "3:45 PM" style time; returns { hour, minute } in 24h or null.
 */
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
 * Stored as UTC Date in MongoDB.
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

/**
 * Fire-and-forget: log errors only.
 */
export async function insertMandiPricePoints(docs) {
  if (!docs || docs.length === 0) return;
  try {
    await MandiPricePoint.insertMany(docs, { ordered: false });
  } catch (err) {
    console.error('MandiPricePoint insertMany error:', err.message);
  }
}

function toObjectId(mandiId) {
  if (!mandiId) return null;
  try {
    return typeof mandiId === 'string' ? mongoose.Types.ObjectId(mandiId) : mandiId;
  } catch (e) {
    return null;
  }
}

/**
 * Build price-point rows from saved category price lines (embedded docs or plain objects).
 */
export function buildPricePointDocs(mandiId, categoryPrices, sourceRateId, parentUpdatedAt) {
  const mid = toObjectId(mandiId);
  if (!mid || !Array.isArray(categoryPrices)) return [];

  const sid = sourceRateId ? toObjectId(sourceRateId) : undefined;
  const parentAt = parentUpdatedAt instanceof Date ? parentUpdatedAt : new Date(parentUpdatedAt);

  return categoryPrices
    .map((cp) => {
      const line = cp && typeof cp.toObject === 'function' ? cp.toObject() : cp;
      if (!line || line.category == null) return null;

      const category = normalizeCategory(line.category);
      const subNorm = normalizeSubCategory(line.subCategory);
      const at = computeAtFromLine(
        {
          date: line.date,
          time: line.time,
          lineUpdatedAt: line.updatedAt,
        },
        parentAt
      );
      const price = typeof line.price === 'number' ? line.price : Number(line.price);
      if (Number.isNaN(price)) return null;

      return {
        mandiId: mid,
        category,
        subCategory: subNorm,
        at,
        price,
        unit: line.unit || undefined,
        sourceRateId: sid,
      };
    })
    .filter(Boolean);
}

/**
 * Single row from bulk/API payload (mandi-prices).
 */
export function buildPricePointDocFromPayload({
  mandiId,
  category,
  subCategory,
  price,
  unit,
  date,
  time,
  sourceRateId,
  fallbackAt,
}) {
  const mid = toObjectId(mandiId);
  if (!mid) return null;

  const categoryNorm = normalizeCategory(category);
  const subNorm = normalizeSubCategory(subCategory);
  const at = computeAtFromLine(
    { date, time, lineUpdatedAt: null },
    fallbackAt || new Date()
  );
  const p = typeof price === 'number' ? price : Number(price);
  if (Number.isNaN(p)) return null;

  return {
    mandiId: mid,
    category: categoryNorm,
    subCategory: subNorm,
    at,
    price: p,
    unit: unit || undefined,
    sourceRateId: sourceRateId ? toObjectId(sourceRateId) : undefined,
  };
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

function bucketFieldForTimeframe(timeframe, tzMode) {
  const tz = tzMode === 'utc' ? 'UTC' : 'Asia/Kolkata';
  if (timeframe === 'year') {
    return {
      $dateToString: { format: '%Y-%m', date: '$at', timezone: tz },
    };
  }
  return {
    $dateToString: { format: '%Y-%m-%d', date: '$at', timezone: tz },
  };
}

function labelFromBucketKey(key, timeframe, tzMode) {
  if (!key) return '';
  const parseUtc = (s, f) => (tzMode === 'utc' ? moment.utc(s, f) : moment(s, f).utcOffset(IST_OFFSET_MINUTES));
  if (timeframe === 'year') {
    const m = parseUtc(key, 'YYYY-MM');
    return m.isValid() ? m.format('MMM YYYY') : key;
  }
  const m = parseUtc(key, 'YYYY-MM-DD');
  return m.isValid() ? m.format('D MMM') : key;
}

/**
 * Read price history: raw points for `today`, bucketed for week/month/year.
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

  const match = {
    mandiId: mid,
    category: cat,
    subCategory: sub,
    at: { $gte: range.from, $lte: range.to },
  };

  const labelTime = (d) =>
    tzMode === 'utc' ? moment.utc(d).format('HH:mm') : moment(d).utcOffset(IST_OFFSET_MINUTES).format('HH:mm');

  if (timeframe === 'today') {
    const rows = await MandiPricePoint.find(match).sort({ at: 1 }).lean();
    const unit = rows.length ? rows[rows.length - 1].unit || null : null;
    const points = rows.map((r) => ({
      at: r.at.toISOString(),
      price: r.price,
      label: labelTime(r.at),
    }));
    return { points, unit, window: windowMeta };
  }

  const bucket = bucketFieldForTimeframe(timeframe, tzMode);

  const pipeline = [
    { $match: match },
    { $sort: { at: 1 } },
    {
      $group: {
        _id: bucket,
        at: { $last: '$at' },
        price: { $last: '$price' },
        unit: { $last: '$unit' },
      },
    },
    { $sort: { _id: 1 } },
  ];

  const agg = await MandiPricePoint.aggregate(pipeline);
  const unit = agg.length ? agg[agg.length - 1].unit || null : null;
  const points = agg.map((row) => ({
    at: row.at instanceof Date ? row.at.toISOString() : new Date(row.at).toISOString(),
    price: row.price,
    label: labelFromBucketKey(row._id, timeframe, tzMode),
  }));

  return { points, unit, window: windowMeta };
}
