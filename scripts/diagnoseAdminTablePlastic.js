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

  await mongoose.connect(config.mongoose.url, config.mongoose.options);
  const priceCollection = MandiCategoryPrice.collection.name;

  const allPlastic = await MandiCategoryPrice.aggregate([
    { $unwind: '$categoryPrices' },
    { $match: { 'categoryPrices.category': 'Plastic' } },
    { $count: 'n' },
  ]);
  console.log('Plastic lines in ALL documents:', allPlastic[0]?.n ?? 0);

  const adminPlastic = await MandiCategoryPrice.aggregate([
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
    { $match: { 'latestDoc.categoryPrices.category': 'Plastic' } },
    { $count: 'n' },
  ]);
  console.log('Plastic lines visible via admin-table logic:', adminPlastic[0]?.n ?? 0);

  const multiDocMandis = await MandiCategoryPrice.aggregate([
    { $group: { _id: '$mandi', docs: { $sum: 1 }, maxUpdatedAt: { $max: '$updatedAt' } } },
    { $match: { docs: { $gt: 1 } } },
    { $count: 'n' },
  ]);
  console.log('Mandis with multiple price documents:', multiDocMandis[0]?.n ?? 0);

  // Plastic in non-latest docs only (hidden from admin table)
  const hidden = await MandiCategoryPrice.aggregate([
    { $group: { _id: '$mandi', maxUpdatedAt: { $max: '$updatedAt' } } },
    { $lookup: { from: priceCollection, localField: '_id', foreignField: 'mandi', as: 'allDocs' } },
    { $unwind: '$allDocs' },
    {
      $addFields: {
        isLatest: { $eq: ['$allDocs.updatedAt', '$maxUpdatedAt'] },
        plasticCount: {
          $size: {
            $filter: {
              input: { $ifNull: ['$allDocs.categoryPrices', []] },
              as: 'cp',
              cond: { $eq: ['$$cp.category', 'Plastic'] },
            },
          },
        },
      },
    },
    { $match: { plasticCount: { $gt: 0 } } },
    {
      $group: {
        _id: '$_id',
        plasticInLatest: {
          $sum: { $cond: ['$isLatest', '$plasticCount', 0] },
        },
        plasticInOlder: {
          $sum: { $cond: ['$isLatest', 0, '$plasticCount'] },
        },
      },
    },
    { $match: { plasticInOlder: { $gt: 0 }, plasticInLatest: 0 } },
    { $count: 'n' },
  ]);
  console.log('Mandis with plastic ONLY in older (hidden) docs:', hidden[0]?.n ?? 0);

  // Recent plastic sample with dates
  const sample = await MandiCategoryPrice.aggregate([
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
    { $match: { 'latestDoc.categoryPrices.category': 'Plastic' } },
    { $limit: 5 },
    {
      $project: {
        subCategory: '$latestDoc.categoryPrices.subCategory',
        price: '$latestDoc.categoryPrices.price',
        date: '$latestDoc.categoryPrices.date',
        updatedAt: '$latestDoc.updatedAt',
      },
    },
  ]);
  console.log('\nSample plastic rows (admin-table view):');
  console.table(sample);

  await mongoose.disconnect();
};

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
