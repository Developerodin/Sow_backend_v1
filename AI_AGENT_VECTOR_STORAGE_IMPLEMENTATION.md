# AI Agent & Vector Storage Implementation Plan

## Overview
This document outlines the implementation plan for:
1. **Vector Storage System**: Storing categories, subcategories, and mandis as vector embeddings in MongoDB
2. **AI Agent**: Using OpenAI API to parse unstructured market rate messages and extract structured data
3. **Data Matching & Update**: Matching extracted data against vector embeddings and updating MongoDB

---

## Architecture Overview

```
┌─────────────────┐
│  Input Message  │ (Unstructured text with emojis, special chars)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   AI Agent      │ (OpenAI API - Parse & Extract)
│   (OpenAI)      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Vector Matching │ (Match against stored vectors)
│   (MongoDB)     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Data Update    │ (MandiRates.model.js format)
│   (MongoDB)     │
└─────────────────┘
```

---

## 1. Vector Storage System

### 1.1 Vector Embedding Schema

We need to create a new collection to store vector embeddings for:
- **Categories** (e.g., "M.S Ingot", "Old Scrap", "Pig Iron Foundry Grade")
- **SubCategories** (e.g., "Melting Scrap", "End cutting", "CRC scrap")
- **Mandis** (e.g., "Gobindgarh", "Bhavnagar", "Bhiwari", "Jalandhar")

### Proposed Schema: `VectorEmbeddings.model.js`

```javascript
{
  type: String, // 'category' | 'subcategory' | 'mandi'
  originalId: ObjectId, // Reference to Category/SubCategory/Mandi
  text: String, // Original text for embedding
  embedding: [Number], // Vector embedding (1536 dimensions for OpenAI)
  aliases: [String], // Alternative names/variations
  metadata: {
    // Additional context
  }
}
```

### 1.2 Vector Generation Script

**Script**: `scripts/generateVectorEmbeddings.js`

**Purpose**: 
- Fetch all categories, subcategories, and mandis from MongoDB
- Generate embeddings using OpenAI `text-embedding-3-small` or `text-embedding-ada-002`
- Store embeddings in MongoDB with references to original documents

**Process**:
1. Connect to MongoDB
2. Fetch all Categories → Generate embeddings → Store
3. Fetch all SubCategories → Generate embeddings → Store
4. Fetch all Mandis → Generate embeddings → Store
5. Handle aliases (e.g., "Gobindgarh" = "Mandi Gobindgarh")

---

## 2. AI Agent Implementation

### 2.1 Message Parsing Flow

**Input Example**:
```
👑👑🅚🅘🅝🅖 🅢🅣🅔🅔🅛👑👑
Date-15-12-2025 🗓️
Time-11:00 AM ⏱️⏱️
*M.S Ingot*
Mandi Gobindgarh=39700(+0)
Bhavnagar=38800(+0)
...
```

**AI Agent Steps**:

1. **Text Cleaning**: Remove emojis, special formatting, normalize text
2. **OpenAI Parsing**: Use structured output (JSON mode) to extract:
   - Date
   - Time
   - Categories with their rates
   - Mandis with prices
   - Price differences (if any)
   - Units (inferred or default)

3. **Structured Output Format**:
```json
{
  "date": "2025-12-15",
  "time": "11:00 AM",
  "rates": [
    {
      "category": "M.S Ingot",
      "subCategory": null,
      "mandiPrices": [
        {
          "mandi": "Gobindgarh",
          "price": 39700,
          "priceDifference": 0,
          "unit": "Ton" // inferred
        },
        {
          "mandi": "Bhavnagar",
          "price": 38800,
          "priceDifference": 0,
          "unit": "Ton"
        }
      ]
    },
    {
      "category": "Old Scrap",
      "subCategory": "Melting Scrap",
      "mandiPrices": [
        {
          "mandi": "Gobindgarh",
          "price": 28000,
          "priceDifference": 0,
          "unit": "Ton"
        }
      ]
    }
  ]
}
```

### 2.2 OpenAI Prompt Engineering

**System Prompt**:
```
You are an expert at parsing Indian steel market rate messages. Extract structured data from unstructured text.

Rules:
1. Extract date in format: YYYY-MM-DD
2. Extract time in 12-hour format: "HH:MM AM/PM"
3. Identify categories (main product types)
4. Identify subcategories (if mentioned)
5. Extract mandi names and their prices
6. Extract price differences (numbers in parentheses)
7. Infer unit (default: "Ton" for bulk, "Kg" for smaller quantities)
8. Handle variations in mandi names (e.g., "Mandi Gobindgarh" = "Gobindgarh")
9. Handle category variations (e.g., "M.S Ingot" = "MS Ingot")

Output format: JSON only, no markdown.
```

**User Prompt**:
```
Parse this market rate message and extract all rates:

[INPUT_MESSAGE]
```

### 2.3 Vector Matching

After AI extraction, match extracted entities against vector embeddings:

1. **Category Matching**:
   - Generate embedding for extracted category name
   - Find closest match using cosine similarity
   - Threshold: > 0.85 similarity

2. **SubCategory Matching**:
   - Generate embedding for extracted subcategory name
   - Find closest match using cosine similarity
   - Threshold: > 0.85 similarity

3. **Mandi Matching**:
   - Generate embedding for extracted mandi name
   - Find closest match using cosine similarity
   - Threshold: > 0.85 similarity
   - Handle aliases (e.g., "Mandi Gobindgarh" → "Gobindgarh")

### 2.4 Cosine Similarity Calculation

**Formula**: 
```
similarity = dot(A, B) / (||A|| * ||B||)
```

**Implementation**:
- Use MongoDB aggregation with `$vectorSearch` (if MongoDB Atlas) OR
- Calculate in Node.js using simple dot product
- Store top matches with similarity scores

---

## 3. Data Update Process

### 3.1 Update Flow

1. **Parse Message** → Get structured JSON
2. **Match Entities** → Find MongoDB ObjectIds for categories, subcategories, mandis
3. **Validate Data** → Ensure all required fields are present
4. **Update Database** → Create/Update `MandiCategoryPrice` documents

### 3.2 Database Update Logic

**For each category in parsed data**:
```javascript
{
  mandi: ObjectId, // Matched mandi ObjectId
  categoryPrices: [
    {
      category: String, // Matched category name
      subCategory: String, // Matched subcategory name (if exists)
      price: Number,
      priceDifference: Number,
      unit: String, // 'Kg' or 'Ton'
      date: Date,
      time: String // "11:00 AM"
    }
  ]
}
```

**Update Strategy**:
- Check if `MandiCategoryPrice` exists for this mandi + date
- If exists: Append/Update `categoryPrices` array
- If not: Create new document
- Handle duplicates (same category + subcategory + date + time)

---

## 4. Implementation Files

### 4.1 New Files to Create

1. **`src/models/VectorEmbedding.model.js`**
   - Schema for storing vector embeddings

2. **`src/services/vectorEmbedding.service.js`**
   - Generate embeddings using OpenAI
   - Store/retrieve embeddings
   - Calculate cosine similarity

3. **`src/services/aiAgent.service.js`**
   - Parse messages using OpenAI
   - Extract structured data
   - Handle errors and retries

4. **`src/services/marketRateParser.service.js`**
   - Orchestrate: Parse → Match → Update
   - Main service that ties everything together

5. **`src/controllers/marketRateParser.controller.js`**
   - API endpoint to receive messages
   - Validate input
   - Call parser service

6. **`src/routes/v1/marketRateParser.routes.js`**
   - Route definition for parser endpoint

7. **`scripts/generateVectorEmbeddings.js`**
   - One-time script to generate and store embeddings
   - Can be run manually or via cron

8. **`src/utils/textCleaner.js`**
   - Remove emojis, special characters
   - Normalize text for better matching

### 4.2 Environment Variables

Add to `.env`:
```env
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini  # or gpt-3.5-turbo for cost efficiency
OPENAI_EMBEDDING_MODEL=text-embedding-3-small
VECTOR_SIMILARITY_THRESHOLD=0.85
```

---

## 5. API Endpoint Design

### 5.1 Endpoint: `POST /api/v1/market-rates/parse`

**Request**:
```json
{
  "message": "👑👑🅚🅘🅝🅖 🅢🅣🅔🅔🅛👑👑\nDate-15-12-2025...",
  "source": "whatsapp" // optional
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "parsed": {
      "date": "2025-12-15",
      "time": "11:00 AM",
      "rates": [...]
    },
    "matched": {
      "categories": [...],
      "subCategories": [...],
      "mandis": [...]
    },
    "updated": {
      "mandiCategoryPrices": [...]
    }
  },
  "warnings": [
    "Could not match mandi: 'Mujfernagar'",
    "Category 'M.S Ingot' matched with low confidence (0.82)"
  ]
}
```

---

## 6. Error Handling & Edge Cases

### 6.1 Common Issues

1. **Unmatched Entities**:
   - Log warnings
   - Optionally create new entries or skip

2. **Low Similarity Scores**:
   - Threshold check
   - Manual review flag

3. **Multiple Matches**:
   - Use highest similarity
   - Log for review

4. **Date Parsing Issues**:
   - Handle various formats
   - Default to current date if unclear

5. **Time Parsing Issues**:
   - Validate 12-hour format
   - Default to null if invalid

6. **Price Format Variations**:
   - Handle commas (39,700)
   - Handle different separators
   - Extract numbers only

### 6.2 Validation

- Validate all extracted prices are numbers
- Validate date is valid
- Validate time format matches schema
- Validate unit is 'Kg' or 'Ton'
- Validate mandi ObjectId exists

---

## 7. Performance Considerations

### 7.1 Vector Search Optimization

- **Index**: Create index on `embedding` field (if using MongoDB Atlas vector search)
- **Caching**: Cache frequently matched embeddings
- **Batch Processing**: Process multiple messages in batch

### 7.2 OpenAI API Optimization

- **Rate Limiting**: Implement retry logic with exponential backoff
- **Cost Management**: Use cheaper models where possible (gpt-4o-mini for parsing, text-embedding-3-small for embeddings)
- **Caching**: Cache embeddings for same text

### 7.3 Database Optimization

- **Indexes**: 
  - `mandi` + `createdAt` on `MandiCategoryPrice`
  - `type` + `originalId` on `VectorEmbedding`
- **Bulk Operations**: Use bulk writes for updates

---

## 8. Testing Strategy

### 8.1 Unit Tests

- Text cleaning functions
- Cosine similarity calculation
- Date/time parsing
- Price extraction

### 8.2 Integration Tests

- Full parsing flow with mock OpenAI responses
- Vector matching with test embeddings
- Database update operations

### 8.3 Manual Testing

- Test with real WhatsApp messages
- Verify data accuracy
- Check edge cases

---

## 9. Deployment Considerations

### 9.1 Script Execution

**Generate Embeddings**:
```bash
node scripts/generateVectorEmbeddings.js
```

**Run on Schedule** (optional):
- Cron job to regenerate embeddings when categories/mandis change
- Or trigger via API endpoint

### 9.2 Monitoring

- Log all parsing attempts
- Track success/failure rates
- Monitor OpenAI API usage/costs
- Alert on low similarity matches

---

## 10. Alternative Approaches (Considerations)

### 10.1 Vector Database Options

**Option 1: MongoDB Native (Atlas)**
- Use MongoDB Atlas vector search
- Pros: Native integration, no extra service
- Cons: Requires Atlas, may have limitations

**Option 2: Pinecone/Weaviate/Qdrant**
- External vector database
- Pros: Optimized for vector search, better performance
- Cons: Additional service, cost, complexity

**Option 3: In-Memory Calculation**
- Store embeddings in MongoDB, calculate similarity in Node.js
- Pros: Simple, no external dependencies
- Cons: Slower for large datasets

**Recommendation**: Start with Option 3 (in-memory), migrate to Option 1 if needed.

### 10.2 AI Model Options

**Parsing**:
- `gpt-4o-mini`: Best balance of cost and accuracy
- `gpt-3.5-turbo`: Cheaper, may need more prompt engineering
- `gpt-4o`: Most accurate, higher cost

**Embeddings**:
- `text-embedding-3-small`: Latest, 1536 dimensions, good performance
- `text-embedding-ada-002`: Older, 1536 dimensions, cheaper

---

## 11. Implementation Phases

### Phase 1: Vector Storage Setup
1. Create `VectorEmbedding.model.js`
2. Create `generateVectorEmbeddings.js` script
3. Test embedding generation and storage

### Phase 2: AI Agent Core
1. Create `aiAgent.service.js`
2. Implement OpenAI parsing
3. Test with sample messages

### Phase 3: Vector Matching
1. Create `vectorEmbedding.service.js`
2. Implement cosine similarity
3. Test matching accuracy

### Phase 4: Integration
1. Create `marketRateParser.service.js`
2. Integrate parse → match → update flow
3. Create API endpoint

### Phase 5: Testing & Refinement
1. Test with real messages
2. Tune similarity thresholds
3. Handle edge cases
4. Optimize performance

---

## 12. Questions & Decisions Needed

1. **Vector Database**: Use MongoDB native or external service?
2. **Similarity Threshold**: What's acceptable? (Suggested: 0.85)
3. **Unmatched Entities**: Create new entries or skip?
4. **Update Strategy**: Replace or append categoryPrices?
5. **Date Handling**: What if date is missing or unclear?
6. **Unit Inference**: Default to "Ton" or try to infer from context?
7. **Batch Processing**: Process multiple messages at once?
8. **Error Recovery**: Retry failed parsing attempts?

---

## 13. Estimated Costs (OpenAI API)

**Per Message**:
- Parsing: ~500 tokens input + 200 tokens output = ~$0.0005 (gpt-4o-mini)
- Embeddings: ~10-20 embeddings × $0.00002 = ~$0.0002-0.0004
- **Total per message**: ~$0.0007-0.0009

**Monthly (1000 messages)**:
- ~$0.70-0.90

**Initial Embedding Generation**:
- ~100-200 embeddings = ~$0.002-0.004 (one-time)

---

## 14. Next Steps

1. **Review this document** and confirm approach
2. **Decide on vector database** approach
3. **Set similarity thresholds** and error handling strategy
4. **Create implementation tasks** based on phases
5. **Start with Phase 1** (Vector Storage Setup)

---

## Notes

- Consider using **structured outputs** (JSON mode) for more reliable parsing
- Implement **rate limiting** for OpenAI API calls
- Add **logging** for debugging and monitoring
- Consider **webhook** for real-time message processing
- May need **manual review queue** for low-confidence matches






