# Market Rate Parser - Usage Guide

## Overview
The Market Rate Parser uses AI (OpenAI) to automatically parse unstructured market rate messages and store them in the database. It uses vector embeddings to match categories, subcategories, and mandis.

## Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Variables
Add the following to your `.env` file:
```env
OPENAI_API_KEY=sk-your-openai-api-key-here
OPENAI_MODEL=gpt-4o-mini
OPENAI_EMBEDDING_MODEL=text-embedding-3-small
VECTOR_SIMILARITY_THRESHOLD=0.85
```

### 3. Generate Vector Embeddings
Before using the parser, you need to generate vector embeddings for all categories, subcategories, and mandis:

```bash
node scripts/generateVectorEmbeddings.js
```

This script will:
- Connect to MongoDB
- Fetch all categories, subcategories, and mandis
- Generate embeddings using OpenAI
- Store embeddings in the `VectorEmbedding` collection

**Note**: Run this script whenever you add new categories, subcategories, or mandis.

## API Usage

### Endpoint
```
POST /api/v1/market-rates/parse
```

### Request Body
```json
{
  "message": "👑👑🅚🅘🅝🅖 🅢🅣🅔🅔🅛👑👑\nDate-15-12-2025 🗓️\nTime-11:00 AM ⏱️⏱️\n*M.S Ingot*\nMandi Gobindgarh=39700(+0)\nBhavnagar=38800(+0)...",
  "source": "whatsapp" // optional
}
```

### Response
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
      "categories": ["M.S Ingot", "Old Scrap"],
      "subCategories": ["Melting Scrap", "End cutting"],
      "mandis": ["Gobindgarh", "Bhavnagar"]
    },
    "updated": {
      "mandiCategoryPrices": 5
    },
    "warnings": [
      "Could not match mandi: 'Mujfernagar'",
      "Category 'M.S Ingot' matched with low confidence (0.82)"
    ]
  }
}
```

## How It Works

1. **Message Parsing**: The AI agent (OpenAI) parses the unstructured message and extracts:
   - Date and time
   - Categories and subcategories
   - Mandi names and prices
   - Price differences
   - Units

2. **Vector Matching**: Each extracted entity is matched against stored vector embeddings:
   - Categories are matched against category embeddings
   - Subcategories are matched against subcategory embeddings
   - Mandis are matched against mandi embeddings
   - Uses cosine similarity with configurable threshold (default: 0.85)

3. **Database Update**: Matched data is stored in `MandiCategoryPrice` documents:
   - Creates new documents if they don't exist
   - Updates existing documents with new prices
   - Handles duplicate entries (same category + subcategory + date + time)

## Example Message Format

The parser can handle messages like:
```
👑👑🅚🅘🅝🅖 🅢🅣🅔🅔🅛👑👑
Date-15-12-2025 🗓️
Time-11:00 AM ⏱️⏱️
*M.S Ingot*
Mandi Gobindgarh=39700(+0)
Bhavnagar=38800(+0)
Bhiwari=38200(+0)
*Old Scrap*
Mandi Gobindgarh=28000(+0)
Melting Scrap=31500(+0)
```

## Troubleshooting

### Low Similarity Matches
If you see warnings about low confidence matches:
- Check if the entity name in the message matches the database
- Consider adding aliases to the VectorEmbedding documents
- Adjust `VECTOR_SIMILARITY_THRESHOLD` in `.env` (lower = more lenient)

### Unmatched Entities
If entities are not matched:
- Run the `generateVectorEmbeddings.js` script again
- Check if the entity exists in the database
- Verify the entity name spelling in the message

### OpenAI API Errors
- Verify `OPENAI_API_KEY` is correct
- Check API rate limits
- Ensure you have sufficient API credits

## Regenerating Embeddings

Run the script again when:
- New categories/subcategories/mandis are added
- Entity names are updated
- You want to refresh embeddings with better aliases

```bash
node scripts/generateVectorEmbeddings.js
```

## Cost Estimation

**Per Message**:
- Parsing: ~$0.0005 (gpt-4o-mini)
- Embeddings: ~$0.0002-0.0004 (10-20 embeddings)
- **Total**: ~$0.0007-0.0009 per message

**Initial Embedding Generation**:
- ~100-200 embeddings = ~$0.002-0.004 (one-time)

## Notes

- The parser automatically handles emoji removal and text cleaning
- Date formats are normalized to YYYY-MM-DD
- Time formats are normalized to HH:MM AM/PM
- Default unit is "Ton" if not specified
- Price differences in parentheses are extracted automatically






