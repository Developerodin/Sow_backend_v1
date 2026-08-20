/* eslint-disable no-console */
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });
if (!process.env.NODE_ENV) process.env.NODE_ENV = 'development';

const main = async () => {
  const mongoose = (await import('mongoose')).default;
  const moment = (await import('moment')).default;
  const config = (await import('../src/config/config.js')).default;
  const MandiCategoryPrice = (await import('../src/models/MandiRates.model.js')).default;
  const { dayKeyFromDate } = await import('../src/services/mandiPricePoint.service.js');

  await mongoose.connect(config.mongoose.url, config.mongoose.options);

  const todayKey = moment().utcOffset(330).format('YYYY-MM-DD');
  const uploadWindowStart = new Date('2026-08-05T05:30:00.000Z'); // ~11am IST today

  let updatedTodayPlastic = 0;
  let updatedTodayWithTodayDate = 0;
  let updatedTodayWithOldDate = 0;
  const dateBreakdown = new Map();

  const cursor = MandiCategoryPrice.find({}).cursor();
  for (let doc = await cursor.next(); doc != null; doc = await cursor.next()) {
    if (!doc.updatedAt || doc.updatedAt < uploadWindowStart) continue;
    for (const cp of doc.categoryPrices || []) {
      if (cp.category !== 'Plastic') continue;
      if (!cp.updatedAt || cp.updatedAt < uploadWindowStart) continue;
      updatedTodayPlastic += 1;
      const dk = dayKeyFromDate(cp.date) || 'null';
      dateBreakdown.set(dk, (dateBreakdown.get(dk) || 0) + 1);
      if (dk === todayKey) updatedTodayWithTodayDate += 1;
      else updatedTodayWithOldDate += 1;
    }
  }

  console.log('Today IST:', todayKey);
  console.log('Plastic lines updated in today upload window:', updatedTodayPlastic);
  console.log('  with rate date = today:', updatedTodayWithTodayDate);
  console.log('  with rate date = older day:', updatedTodayWithOldDate);
  console.log('\nDate breakdown for today-updated plastic lines:');
  console.table(
    [...dateBreakdown.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([date, count]) => ({ date, count }))
  );

  // Admin table page 1 simulation
  const priceCollection = MandiCategoryPrice.collection.name;
  const page1 = await MandiCategoryPrice.aggregate([
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
    { $sort: { 'latestDoc.categoryPrices.date': -1, 'latestDoc.categoryPrices.time': -1 } },
    { $limit: 200 },
    {
      $project: {
        mandi: '$mandiDoc.mandiname',
        category: '$latestDoc.categoryPrices.category',
        subCategory: '$latestDoc.categoryPrices.subCategory',
        date: '$latestDoc.categoryPrices.date',
        price: '$latestDoc.categoryPrices.price',
      },
    },
  ]);

  const plasticOnPage1 = page1.filter((r) => r.category === 'Plastic').length;
  console.log('\nAdmin table page 1 (200 rows, sort date desc):');
  console.log('  Plastic rows on page 1:', plasticOnPage1);
  console.log('  First row date:', page1[0]?.date);
  console.log('  Categories on page 1:', [...new Set(page1.map((r) => r.category))].join(', '));

  const totalAdmin = await MandiCategoryPrice.aggregate([
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
    { $lookup: { from: 'mandis', localField: 'latestDoc.mandi', foreignField: '_id', as: 'mandiDoc' } },
    { $unwind: '$mandiDoc' },
    { $match: { 'mandiDoc.mandiname': { $exists: true, $nin: [null, ''] } } },
    { $count: 'n' },
  ]);
  console.log('  Total rows in admin table:', totalAdmin[0]?.n ?? 0);

  await mongoose.disconnect();
};

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
