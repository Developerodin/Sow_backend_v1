# How to Add and Update Mandi Rates with Time

This guide explains how to add and update mandi rates, including specifying the time in Indian 12-hour format with AM/PM, using the API endpoints.

## 1. Add (Save) Mandi Rates with Time

**Endpoint:**
```
POST /v1/mandiRates/mandi-prices
```

**Request Body Example:**
```json
{
  "mandiPrices": [
    {
      "mandiId": "63b8e5b934e3e3f7d4a1c6f5",
      "category": "Vegetables",
      "subCategory": "Leafy",
      "price": 100,
      "priceDifference": 5,
      "date": "2024-11-22T00:00:00Z",
      "time": "10:30 AM"
    },
    {
      "mandiId": "63b8e5b934e3e3f7d4a1c6f5",
      "category": "Fruits",
      "subCategory": "Citrus",
      "price": 150,
      "priceDifference": 10,
      "date": "2024-11-22T00:00:00Z",
      "time": "03:45 PM"
    }
  ]
}
```

**Required Fields:**
- `mandiId`: The ID of the mandi.
- `category`: The category name.
- `price`: The price for the category.
- `time`: The time in `hh:mm AM/PM` format (e.g., `"10:30 AM"`, `"03:45 PM"`).

**Optional Fields:**
- `subCategory`, `priceDifference`, `date`

---

## 2. Update Mandi Rate (Including Time)

**Endpoint:**
```
PATCH /v1/mandiRates/:mandiId/:category
```

**Request Body Example:**
```json
{
  "price": 120,
  "time": "12:00 PM"
}
```

**Required Fields:**
- `price`: The new price.
- `time`: The new time in `hh:mm AM/PM` format.

**Note:**
- You can update both price and time together, or just one of them as needed.
- Make sure to use the correct `mandiId` and `category` in the URL.

---

## 3. Response Example

On success, you will receive a confirmation message or the updated data, e.g.:
```json
{
  "message": "Mandi prices updated successfully."
}
```

---

## 4. Additional Information
- The `time` field is stored as a string in the Indian 12-hour format with AM/PM (e.g., `"10:30 AM"`, `"03:45 PM"`).
- If you omit the `time` field, it will not be set or updated.
- For more details, refer to the Swagger documentation in your project. 