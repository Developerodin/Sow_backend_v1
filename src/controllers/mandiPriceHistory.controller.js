import mongoose from 'mongoose';
import { fetchPriceHistory, normalizeCategory, normalizeSubCategory } from '../services/mandiPricePoint.service.js';

/**
 * GET /mandi/:mandiId/price-history
 * Query: category, subCategory (required), timeframe=today|week|month|year, optional tz (utc|ist — default ist)
 */
const getMandiPriceHistory = async (req, res) => {
  try {
    const { mandiId } = req.params;
    const { category, subCategory, timeframe, tz } = req.query;

    if (!mongoose.Types.ObjectId.isValid(mandiId)) {
      return res.status(400).json({ message: 'Invalid mandiId' });
    }

    if (!category || String(category).trim() === '') {
      return res.status(400).json({ message: 'Query parameter category is required' });
    }
    if (subCategory === undefined || subCategory === null || String(subCategory).trim() === '') {
      return res.status(400).json({ message: 'Query parameter subCategory is required' });
    }

    const tf = String(timeframe || '').toLowerCase();
    if (!['today', 'week', 'month', 'year'].includes(tf)) {
      return res.status(400).json({
        message: 'Query parameter timeframe is required and must be one of: today, week, month, year',
      });
    }

    const tzMode = String(tz || 'ist').toLowerCase() === 'utc' ? 'utc' : 'ist';

    const { points, unit, window } = await fetchPriceHistory({
      mandiId,
      category: normalizeCategory(category),
      subCategory: normalizeSubCategory(subCategory),
      timeframe: tf,
      tzMode,
    });

    return res.status(200).json({
      points,
      unit,
      window,
      timeframe: tf,
      timezone: tzMode === 'utc' ? 'UTC' : 'Asia/Kolkata',
    });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to load price history', error: error.message });
  }
};

export { getMandiPriceHistory };
