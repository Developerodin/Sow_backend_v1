import OpenAI from 'openai';
import config from '../config/config.js';
import VectorEmbedding from '../models/VectorEmbedding.model.js';
import { cleanForEmbedding } from '../utils/textCleaner.js';

const openai = new OpenAI({
  apiKey: config.openai.apiKey,
});

/**
 * Generate embedding for text using OpenAI
 * @param {string} text - Text to generate embedding for
 * @returns {Promise<number[]>} Embedding vector
 */
const generateEmbedding = async (text) => {
  if (!text || !text.trim()) {
    throw new Error('Text is required for embedding generation');
  }

  try {
    const cleanedText = cleanForEmbedding(text);
    
    const response = await openai.embeddings.create({
      model: config.openai.embeddingModel,
      input: cleanedText,
    });

    return response.data[0].embedding;
  } catch (error) {
    throw new Error(`Failed to generate embedding: ${error.message}`);
  }
};

/**
 * Calculate cosine similarity between two vectors
 * @param {number[]} vecA - First vector
 * @param {number[]} vecB - Second vector
 * @returns {number} Cosine similarity score (0-1)
 */
const cosineSimilarity = (vecA, vecB) => {
  if (vecA.length !== vecB.length) {
    throw new Error('Vectors must have the same length');
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  if (denominator === 0) return 0;

  return dotProduct / denominator;
};

/**
 * Store vector embedding in database
 * @param {Object} embeddingData - Embedding data
 * @param {string} embeddingData.type - Type: 'category', 'subcategory', or 'mandi'
 * @param {ObjectId} embeddingData.originalId - Original document ID
 * @param {string} embeddingData.text - Original text
 * @param {string[]} [embeddingData.aliases] - Alternative names
 * @param {Object} [embeddingData.metadata] - Additional metadata
 * @returns {Promise<VectorEmbedding>} Stored embedding
 */
const storeEmbedding = async (embeddingData) => {
  const { type, originalId, text, aliases = [], metadata = {} } = embeddingData;

  // Generate embedding
  const embedding = await generateEmbedding(text);

  // Determine typeRef based on type
  const typeRefMap = {
    category: 'Category',
    subcategory: 'SubCategory',
    mandi: 'Mandi',
  };

  const typeRef = typeRefMap[type];
  if (!typeRef) {
    throw new Error(`Invalid type: ${type}`);
  }

  // Check if embedding already exists
  const existing = await VectorEmbedding.findOne({ type, originalId });
  
  if (existing) {
    // Update existing embedding
    existing.text = text;
    existing.embedding = embedding;
    existing.aliases = aliases;
    existing.metadata = metadata;
    await existing.save();
    return existing;
  }

  // Create new embedding
  return VectorEmbedding.create({
    type,
    originalId,
    typeRef,
    text,
    embedding,
    aliases,
    metadata,
  });
};

/**
 * Find best matching entity using vector similarity
 * @param {string} searchText - Text to search for
 * @param {string} type - Type to search: 'category', 'subcategory', or 'mandi'
 * @param {number} [limit=5] - Maximum number of results
 * @returns {Promise<Array>} Array of matches with similarity scores
 */
const findBestMatch = async (searchText, type, limit = 5) => {
  if (!searchText || !searchText.trim()) {
    return [];
  }

  // Generate embedding for search text
  const searchEmbedding = await generateEmbedding(searchText);

  // Get all embeddings of the specified type
  const embeddings = await VectorEmbedding.find({ type }).populate('originalId');

  // Calculate similarities
  const matches = embeddings
    .map((embedding) => {
      const similarity = cosineSimilarity(searchEmbedding, embedding.embedding);
      return {
        embedding,
        similarity,
        originalId: embedding.originalId,
        text: embedding.text,
        aliases: embedding.aliases,
      };
    })
    .filter((match) => match.similarity >= config.openai.similarityThreshold)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, limit);

  return matches;
};

/**
 * Find single best match above threshold
 * @param {string} searchText - Text to search for
 * @param {string} type - Type to search
 * @returns {Promise<Object|null>} Best match or null
 */
const findBestSingleMatch = async (searchText, type) => {
  const matches = await findBestMatch(searchText, type, 1);
  return matches.length > 0 ? matches[0] : null;
};

/**
 * Batch generate embeddings for multiple texts
 * @param {string[]} texts - Array of texts to generate embeddings for
 * @returns {Promise<number[][]>} Array of embedding vectors
 */
const batchGenerateEmbeddings = async (texts) => {
  if (!texts || texts.length === 0) {
    return [];
  }

  try {
    const cleanedTexts = texts.map((text) => cleanForEmbedding(text));
    
    const response = await openai.embeddings.create({
      model: config.openai.embeddingModel,
      input: cleanedTexts,
    });

    return response.data.map((item) => item.embedding);
  } catch (error) {
    throw new Error(`Failed to generate batch embeddings: ${error.message}`);
  }
};

export {
  generateEmbedding,
  cosineSimilarity,
  storeEmbedding,
  findBestMatch,
  findBestSingleMatch,
  batchGenerateEmbeddings,
};







