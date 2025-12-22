import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import config from '../src/config/config.js';
import { storeEmbedding } from '../src/services/vectorEmbedding.service.js';
import Category from '../src/models/category.modal.js';
import SubCategory from '../src/models/subCategory.modal.js';
import Mandi from '../src/models/Mandi.model.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

/**
 * Generate embeddings for all categories
 */
const generateCategoryEmbeddings = async () => {
  console.log('Generating embeddings for categories...');
  
  const categories = await Category.find({});
  console.log(`Found ${categories.length} categories`);

  for (const category of categories) {
    try {
      // Use category name as primary text
      const aliases = [];
      
      // Add variations
      if (category.name.includes('M.S')) {
        aliases.push(category.name.replace('M.S', 'MS'));
        aliases.push(category.name.replace('M.S', 'M S'));
      }

      await storeEmbedding({
        type: 'category',
        originalId: category._id,
        text: category.name,
        aliases,
        metadata: {
          description: category.description || null,
        },
      });

      console.log(`✓ Generated embedding for category: ${category.name}`);
    } catch (error) {
      console.error(`✗ Failed to generate embedding for category ${category.name}:`, error.message);
    }
  }

  console.log('Category embeddings generation completed\n');
};

/**
 * Generate embeddings for all subcategories
 */
const generateSubCategoryEmbeddings = async () => {
  console.log('Generating embeddings for subcategories...');
  
  const subCategories = await SubCategory.find({}).populate('categoryId');
  console.log(`Found ${subCategories.length} subcategories`);

  for (const subCategory of subCategories) {
    try {
      const aliases = [];
      
      // Add variations if needed
      if (subCategory.name.includes('M.S')) {
        aliases.push(subCategory.name.replace('M.S', 'MS'));
      }

      await storeEmbedding({
        type: 'subcategory',
        originalId: subCategory._id,
        text: subCategory.name,
        aliases,
        metadata: {
          categoryId: subCategory.categoryId._id,
          description: subCategory.description || null,
        },
      });

      console.log(`✓ Generated embedding for subcategory: ${subCategory.name}`);
    } catch (error) {
      console.error(`✗ Failed to generate embedding for subcategory ${subCategory.name}:`, error.message);
    }
  }

  console.log('Subcategory embeddings generation completed\n');
};

/**
 * Generate embeddings for all mandis
 */
const generateMandiEmbeddings = async () => {
  console.log('Generating embeddings for mandis...');
  
  const mandis = await Mandi.find({});
  console.log(`Found ${mandis.length} mandis`);

  for (const mandi of mandis) {
    try {
      const aliases = [];
      
      // Use mandiname if available, otherwise use city
      const primaryText = mandi.mandiname || mandi.city;
      
      // Add variations
      aliases.push(primaryText); // Original name
      aliases.push(`Mandi ${primaryText}`); // With "Mandi" prefix
      aliases.push(mandi.city); // City name
      if (mandi.mandiname && mandi.mandiname !== mandi.city) {
        aliases.push(mandi.mandiname); // Mandi name if different
      }

      await storeEmbedding({
        type: 'mandi',
        originalId: mandi._id,
        text: primaryText,
        aliases: [...new Set(aliases)], // Remove duplicates
        metadata: {
          city: mandi.city,
          state: mandi.state,
          mandiname: mandi.mandiname || null,
        },
      });

      console.log(`✓ Generated embedding for mandi: ${primaryText}`);
    } catch (error) {
      console.error(`✗ Failed to generate embedding for mandi ${mandi.mandiname || mandi.city}:`, error.message);
    }
  }

  console.log('Mandi embeddings generation completed\n');
};

/**
 * Main function to generate all embeddings
 */
const main = async () => {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(config.mongoose.url, config.mongoose.options);
    console.log('Connected to MongoDB\n');

    // Check if OpenAI API key is configured
    if (!config.openai.apiKey) {
      throw new Error('OPENAI_API_KEY is not configured in environment variables');
    }

    console.log('Starting vector embedding generation...\n');

    // Generate embeddings for all entities
    await generateCategoryEmbeddings();
    await generateSubCategoryEmbeddings();
    await generateMandiEmbeddings();

    console.log('All embeddings generated successfully!');
  } catch (error) {
    console.error('Error generating embeddings:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
    process.exit(0);
  }
};

// Run the script
main();






