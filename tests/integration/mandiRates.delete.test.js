import request from 'supertest';
import httpStatus from 'http-status';
import app from '../../src/app.js';
import setupTestDB from '../utils/setupTestDB.js';
import Mandi from '../../src/models/Mandi.model.js';
import MandiCategoryPrice from '../../src/models/MandiRates.model.js';

setupTestDB();

describe('DELETE /v1/mandiRates/prices/:documentId/:priceEntryId', () => {
  test('deletes only the targeted price entry and it stays gone after refetch', async () => {
    const mandi = await Mandi.create({
      mandiname: 'Test Mandi',
      city: 'Test City',
      state: 'Test State',
      categories: ['Iron'],
    });

    const olderDoc = await MandiCategoryPrice.create({
      mandi: mandi._id,
      categoryPrices: [
        {
          category: 'Iron',
          subCategory: 'Pig Iron Foundry Grade',
          price: 41000,
          unit: 'Ton',
        },
        {
          category: 'Iron',
          subCategory: 'Old Scrap',
          price: 39000,
          unit: 'Ton',
        },
      ],
    });

    const newerDoc = await MandiCategoryPrice.create({
      mandi: mandi._id,
      categoryPrices: [
        {
          category: 'Iron',
          subCategory: 'Pig Iron Foundry Grade',
          price: 42500,
          unit: 'Ton',
        },
        {
          category: 'Iron',
          subCategory: 'Pig Iron (Steel Grade)',
          price: 42000,
          unit: 'Ton',
        },
      ],
    });

    await MandiCategoryPrice.findByIdAndUpdate(olderDoc._id, {
      updatedAt: new Date('2026-05-10T00:00:00.000Z'),
    });
    await MandiCategoryPrice.findByIdAndUpdate(newerDoc._id, {
      updatedAt: new Date('2026-05-18T00:00:00.000Z'),
    });

    const latestBefore = await MandiCategoryPrice.findOne({ mandi: mandi._id }).sort({
      updatedAt: -1,
    });
    const targetEntry = latestBefore.categoryPrices.find(
      (cp) => cp.subCategory === 'Pig Iron Foundry Grade'
    );
    expect(targetEntry).toBeDefined();

    await request(app)
      .delete(`/v1/mandiRates/prices/${latestBefore._id}/${targetEntry._id}`)
      .expect(httpStatus.OK);

    const latestAfter = await MandiCategoryPrice.findOne({ mandi: mandi._id }).sort({
      updatedAt: -1,
    });
    const foundryAfter = latestAfter.categoryPrices.filter(
      (cp) => cp.subCategory === 'Pig Iron Foundry Grade'
    );
    expect(foundryAfter).toHaveLength(0);

    const allDocs = await MandiCategoryPrice.find({ mandi: mandi._id });
    const latestForUi = Object.values(
      allDocs.reduce((acc, curr) => {
        const key = String(curr.mandi);
        if (!acc[key] || new Date(acc[key].updatedAt) < new Date(curr.updatedAt)) {
          acc[key] = curr;
        }
        return acc;
      }, {})
    )[0];

    const uiFoundry = latestForUi.categoryPrices.filter(
      (cp) => cp.subCategory === 'Pig Iron Foundry Grade'
    );
    expect(uiFoundry).toHaveLength(0);

    const steelStillThere = latestForUi.categoryPrices.some(
      (cp) => cp.subCategory === 'Pig Iron (Steel Grade)'
    );
    expect(steelStillThere).toBe(true);

    const olderFoundry = (
      await MandiCategoryPrice.findById(olderDoc._id)
    ).categoryPrices.filter((cp) => cp.subCategory === 'Pig Iron Foundry Grade');
    expect(olderFoundry).toHaveLength(1);
  });

  test('does not remove duplicate subCategory lines when only one entry id is deleted', async () => {
    const mandi = await Mandi.create({
      mandiname: 'Dup Mandi',
      city: 'City',
      state: 'State',
      categories: ['Iron'],
    });

    const doc = await MandiCategoryPrice.create({
      mandi: mandi._id,
      categoryPrices: [
        {
          category: 'Iron',
          subCategory: 'Ms Billet',
          price: 45800,
          unit: 'Ton',
          date: new Date('2026-04-15'),
        },
        {
          category: 'Iron',
          subCategory: 'Ms Billet',
          price: 45900,
          unit: 'Ton',
          date: new Date('2026-04-16'),
        },
      ],
    });

    const firstEntryId = doc.categoryPrices[0]._id;

    await request(app)
      .delete(`/v1/mandiRates/prices/${doc._id}/${firstEntryId}`)
      .expect(httpStatus.OK);

    const reloaded = await MandiCategoryPrice.findById(doc._id);
    expect(reloaded.categoryPrices).toHaveLength(1);
    expect(reloaded.categoryPrices[0].price).toBe(45900);
  });
});
