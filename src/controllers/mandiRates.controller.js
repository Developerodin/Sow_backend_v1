import mongoose from 'mongoose';
import MandiCategoryPrice from '../models/MandiRates.model.js';
import Mandi from '../models/Mandi.model.js';
import Notification from '../models/b2bNotification.js';
import { sendNotificationToAllUsers } from './pushNotifications.controller.js';

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

    // Push Notification logic
    try {
      await sendNotificationToAllUsers(
        'New Rates available',
        'Check out the latest mandi rates.',
        {
          type: 'mandiRatesUpdate',
        }
      );
    } catch (notifyErr) {
      console.error('Push notification error:', notifyErr);
    }

  } catch (error) {
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

    const mandiCategoryPrice = await MandiCategoryPrice.findOne({ mandi: mandiId });
    const categoryPrice = mandiCategoryPrice.categoryPrices.find(cp => cp.category === category && cp.subCategory === subCategory);

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

const deleteCategoryPrice = async (req, res) => {
  try {
    const { mandiId, category , subCategory } = req.params;

    // Find the MandiCategoryPrice document by mandiId
    const mandiCategoryPrice = await MandiCategoryPrice.findOne({ mandi: mandiId });

    // If no MandiCategoryPrice is found, return a 404 error
    if (!mandiCategoryPrice) {
      return res.status(404).json({ message: 'Mandi not found' });
    }

    // Find the index of the category to be deleted in the categoryPrices array
    const categoryIndex = mandiCategoryPrice.categoryPrices.findIndex(
      (cp) => cp.category === category && cp.subCategory === subCategory
    );

    // If the category is not found, return a 404 error
    if (categoryIndex === -1) {
      return res.status(404).json({ message: 'Category not found' });
    }

    // Remove the category from the categoryPrices array
    mandiCategoryPrice.categoryPrices.splice(categoryIndex, 1);

    // Save the updated document
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

    console.log('Starting bulk operations...');

    const bulkOperations = validMandiPrices.map(({ mandiId, category, subCategory, price, priceDifference, unit, date, time }) => {
      return {
        updateOne: {
          filter: { mandi: mandiId, 'categoryPrices.category': category },
          update: {
            $set: {
              'categoryPrices.$.subCategory': subCategory || null,
              'categoryPrices.$.price': price || 0,
              'categoryPrices.$.priceDifference': priceDifference || null,
              'categoryPrices.$.unit': unit || null,
              'categoryPrices.$.date': date || null,
              'categoryPrices.$.time': time || null,
            },
          },
          upsert: false,
        },
      };
    });

    const upsertOperations = validMandiPrices.map(({ mandiId, category, subCategory, price, priceDifference, unit, date, time }) => {
      return {
        updateOne: {
          filter: { mandi: mandiId },
          update: {
            $addToSet: {
              categoryPrices: {
                category,
                subCategory: subCategory || null,
                price: price || 0,
                priceDifference: priceDifference || null,
                unit: unit || null,
                date: date || null,
                time: time || null,
              },
            },
          },
          upsert: true,
        },
      };
    });

    // Perform bulk write for both update and upsert operations
    const bulkWriteOperations = [...bulkOperations, ...upsertOperations];

    console.log('Executing bulkWrite with', bulkWriteOperations.length, 'operations');
    await MandiCategoryPrice.bulkWrite(bulkWriteOperations);
    console.log('BulkWrite completed successfully');

    // Push Notification logic
    try {
      await sendNotificationToAllUsers(
        'New Rates available',
        'Check out the latest mandi rates.',
        {
          type: 'mandiRatesUpdate',
        }
      );
    } catch (notifyErr) {
      console.error('Push notification error:', notifyErr);
    }

    // Prepare response message
    let responseMessage = `Mandi prices updated successfully. Processed ${validMandiPrices.length} entries.`;
    
    if (skippedEntries.length > 0) {
      responseMessage += ` Skipped ${skippedEntries.length} entries with invalid mandi IDs.`;
    }

    console.log('Sending success response:', responseMessage);
    res.status(200).json({ 
      message: responseMessage,
      processed: validMandiPrices.length,
      skipped: skippedEntries.length,
      skippedEntries: skippedEntries.length > 0 ? skippedEntries : undefined
    });
  } catch (error) {
    console.error('Error in saveOrUpdateMandiCategoryPrices:', error);
    res.status(500).json({ message: 'An error occurred while saving mandi prices.', error: error.message });
  }
};





// Get all data
const getAllData = async (req, res) => {
  try {
    const data = await MandiCategoryPrice.find().populate('mandi');
    // console.log("Raw Data Before Processing:", JSON.stringify(data, null, 2));
    // Add priceDifference field for each categoryPrices entry using getPriceDifference2
    const updatedData = await Promise.all(data.map(async (mandiCategoryPrice) => {
      const updatedCategoryPrices = await Promise.all(mandiCategoryPrice.categoryPrices.map(async (categoryPrice) => {
        const { category, subCategory } = categoryPrice;
        
        // Check if mandi exists before accessing its _id
        if (!mandiCategoryPrice.mandi) {
          return {
            ...categoryPrice.toObject(), // Convert to plain object
            priceDifference: {}, // Return empty object if no mandi
          };
        }
        
        // Call getPriceDifference2 to calculate the price difference
        const priceDifferenceData = await getPriceDifference2(mandiCategoryPrice.mandi._id, category, subCategory) || {};
        
        // Replace the priceDifference field with the result from getPriceDifference2
        return {
          ...categoryPrice.toObject(), // Convert to plain object
          priceDifference: priceDifferenceData, // Update with new price difference
        };
      }));

      // Return updated MandiCategoryPrice object
      return {
        ...mandiCategoryPrice.toObject(),
        categoryPrices: updatedCategoryPrices,
      };
    }));
    // console.log("DAta ===>",updatedData)
    res.status(200).json(updatedData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get price difference and percentage change
const getPriceDifference = async (req, res) => {
  try {
    const { mandiId, category,subCategory } = req.params;

    // Find all MandiCategoryPrice documents for the specified mandiId
    const mandiCategoryPrices = await MandiCategoryPrice.find({ mandi: mandiId });

    // Check if any mandiCategoryPrices were found
    if (!mandiCategoryPrices || mandiCategoryPrices.length === 0) {
      return res.status(404).json({ message: 'Mandi not found' });
    }

    // Flatten the categoryPrices array from all documents
    const allCategoryPrices = mandiCategoryPrices.flatMap(mandi => mandi.categoryPrices);

    // Filter for the specified category and sort by createdAt in descending order
    const categoryPrices = allCategoryPrices
      .filter(cp => cp.category === category && cp.subCategory === subCategory)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)); // Sort by timestamp, latest first

    // Check if there are enough prices to compare
    if (categoryPrices.length < 2) {
      return res.status(400).json({ message: 'Not enough data to compare prices' });
    }

    // Extract the current and previous prices
    // console.log("Array data  ==>",categoryPrices[categoryPrices.length -1],categoryPrices[categoryPrices.length -2])
    const currentPrice = categoryPrices[categoryPrices.length - 1].price;
    const previousPrice = categoryPrices[categoryPrices.length -2].price;
    //  console.log("cureent price ==>",currentPrice )
    //  console.log("previous Price ==>",previousPrice )
    // Calculate the difference and percent change
    const difference = currentPrice - previousPrice;
    const percentChange = ((difference / previousPrice) * 100).toFixed(2);
    const tag = difference > 0 ? 'Increment' : 'Decrement';

    // Return the result as JSON
    res.status(200).json({
      category,
      currentPrice,
      previousPrice,
      difference,
      percentChange,
      tag,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getPriceDifference2 = async (mandiId, category,subCategory) => {
  try {
    // Check if mandiId is valid
    if (!mandiId) {
      return {};
    }

    // Find all MandiCategoryPrice documents for the specified mandiId
    const mandiCategoryPrices = await MandiCategoryPrice.find({ mandi: mandiId });

    // Check if any mandiCategoryPrices were found
    if (!mandiCategoryPrices || mandiCategoryPrices.length === 0) {
      return {}
    }

    // Flatten the categoryPrices array from all documents
    const allCategoryPrices = mandiCategoryPrices.flatMap(mandi => mandi.categoryPrices);

    // Filter for the specified category and sort by createdAt in descending order
    const categoryPrices = allCategoryPrices
      .filter(cp => cp.category === category && cp.subCategory === subCategory)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)); // Sort by timestamp, latest first

    // Check if there are enough prices to compare
    if (categoryPrices.length < 2) {
      return {};
    }

    // Extract the current and previous prices
    // console.log("Array data  ==>",categoryPrices[categoryPrices.length -1],categoryPrices[categoryPrices.length -2])
    const currentPrice = categoryPrices[categoryPrices.length - 1].price;
    const previousPrice = categoryPrices[categoryPrices.length -2].price;
    //  console.log("cureent price ==>",currentPrice )
    //  console.log("previous Price ==>",previousPrice )
    // Calculate the difference and percent change
    const difference = currentPrice - previousPrice;
    const percentChange = ((difference / previousPrice) * 100).toFixed(2);
    const tag = difference > 0 ? 'Increment' : 'Decrement';

    // Return the result as JSON
    return({
      category,
      currentPrice,
      previousPrice,
      difference,
      percentChange,
      tag,
    });
  } catch (error) {
    console.error('Error in getPriceDifference2:', error);
    return {};
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

export {saveOrUpdateMandiCategoryPrices, saveCategoryPrices, updateCategoryPrice, deleteCategoryPrice, getAllData, getPriceDifference, getMandiHistory, getCategoryHistory, getHistoryByTimeframe, getMandiByCategory };
