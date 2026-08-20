/* eslint-disable no-console */
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });
if (!process.env.NODE_ENV) process.env.NODE_ENV = 'development';

const main = async () => {
  const mongoose = (await import('mongoose')).default;
  const config = (await import('../src/config/config.js')).default;
  const MandiCategoryPrice = (await import('../src/models/MandiRates.model.js')).default;
  const priceCollection = MandiCategoryPrice.collection.name;

  await mongoose.connect(config.mongoose.url, config.mongoose.options);

  const byDate = await MandiCategoryPrice.aggregate([
    { $group: { _id: '$mandi', maxUpdatedAt: { $max: '$updatedAt' } } },
    {
      $lookup: {
        from: priceCollection,
        let: { mandiId: '$_id', maxAt: '$maxUpdatedAt' },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ['$mandi', '$$mandiId'] },
                  { $eq: ['$updatedAt', '$$maxAt'] },
                ],
              },
            },
          },
          { $limit: 1 },
        ],
        as: 'latestDoc',
      },
    },
    { $unwind: '$latestDoc' },
    { $unwind: '$latestDoc.categoryPrices' },
    {
      $lookup: {
        from: 'mandis',
        localField: 'latestDoc.mandi',
        foreignField: '_id',
        as: 'mandiDoc',
      },
    },
    { $unwind: '$mandiDoc' },
    { $match: { 'mandiDoc.mandiname': { $exists: true, $nin: [null, ''] } } },
    {
      $group: {
        _id: {
          date: {
            $dateToString: { format: '%Y-%m-%d', date: '$latestDoc.categoryPrices.date' },
          },
          category: '$latestDoc.categoryPrices.category',
        },
        count: { $sum: 1 },
      },
    },
    { $sort: { '_id.date': -1, count: -1 } },
    { $limit: 20 },
  ]).allowDiskUse(true);

  console.log('Top date+category counts in admin table:');
  console.table(byDate.map((r) => ({ date: r._id.date, category: r._id.category, count: r.count })));

  const plasticAug4 = await MandiCategoryPrice.aggregate([
    { $group: { _id: '$mandi', maxUpdatedAt: { $max: '$updatedAt' } } },
    {
      $lookup: {
        from: priceCollection,
        let: { mandiId: '$_id', maxAt: '$maxUpdatedAt' },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ['$mandi', '$$mandiId'] },
                  { $eq: ['$updatedAt', '$$maxAt'] },
                ],
              },
            },
          },
          { $limit: 1 },
        ],
        as: 'latestDoc',
      },
    },
    { $unwind: '$latestDoc' },
    { $unwind: '$latestDoc.categoryPrices' },
    {
      $match: {
        'latestDoc.categoryPrices.category': 'Plastic',
        'latestDoc.categoryPrices.date': {
          $gte: new Date('2026-08-04T00:00:00.000Z'),
          $lte: new Date('2026-08-04T23:59:59.999Z'),
        },
      },
    },
    { $count: 'n' },
  ]).allowDiskUse(true);

  console.log('\nPlastic rows with date 2026-08-04 in admin table:', plasticAug4[0]?.n ?? 0);

  await mongoose.disconnect();
};

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
