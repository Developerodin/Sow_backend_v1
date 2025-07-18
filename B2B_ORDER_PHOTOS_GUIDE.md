# B2B Order Photos Integration Guide

## Overview
The B2B Order model has been updated to support multiple photo uploads with both URLs and S3 keys, similar to the KYC system.

## Model Changes

### B2bOrder.model.js
```javascript
photos: {
    type: [String], // Array of photo URLs
    required: false,
    default: []
},
photoKeys: {
    type: [String], // Array of photo keys for S3
    required: false,
    default: []
}
```

## Controller Updates

### B2bOrder.controller.js - createOrder function
The controller now handles:
- Empty photos array
- Single photo/photoKey
- Multiple photos/photoKeys
- String or Array input formats

## Usage Examples

### 1. Frontend Usage (Two-Step Process)

#### Step 1: Upload Photos to S3
```javascript
// Single photo upload
const singlePhotoFormData = new FormData();
singlePhotoFormData.append('file', photoFile);

const singleResponse = await fetch('/api/v1/files/upload', {
    method: 'POST',
    body: singlePhotoFormData
});

// Multiple photos upload
const multiplePhotoFormData = new FormData();
photoFiles.forEach(file => {
    multiplePhotoFormData.append('files', file);
});

const multipleResponse = await fetch('/api/v1/files/upload-multiple', {
    method: 'POST',
    body: multiplePhotoFormData
});
```

#### Step 2: Create Order with Photo URLs and Keys
```javascript
// Example with multiple photos
const orderData = {
    category: "Electronics",
    orderBy: "userId123",
    orderTo: "userId456",
    location: "locationId789",
    subCategory: "Mobile Phones",
    weight: "1",
    unit: "kg",
    notes: "Handle with care",
    value: 100,
    totalPrice: 110,
    photos: [
        "https://s3.amazonaws.com/bucket/photo1.jpg",
        "https://s3.amazonaws.com/bucket/photo2.jpg"
    ],
    photoKeys: [
        "uploads/photo1_timestamp.jpg",
        "uploads/photo2_timestamp.jpg"
    ],
    orderStatus: "New"
};

const response = await fetch('/api/v1/b2b-orders', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer your-token'
    },
    body: JSON.stringify(orderData)
});
```

### 2. Postman Examples

#### Create Order with No Photos
```json
{
    "category": "Electronics",
    "orderBy": "userId123",
    "orderTo": "userId456",
    "location": "locationId789",
    "subCategory": "Mobile Phones",
    "weight": "1",
    "unit": "kg",
    "value": 100,
    "totalPrice": 110,
    "orderStatus": "New"
}
```

#### Create Order with Single Photo
```json
{
    "category": "Electronics",
    "orderBy": "userId123",
    "orderTo": "userId456",
    "location": "locationId789",
    "subCategory": "Mobile Phones",
    "weight": "1",
    "unit": "kg",
    "value": 100,
    "totalPrice": 110,
    "photos": ["https://s3.amazonaws.com/bucket/photo1.jpg"],
    "photoKeys": ["uploads/photo1_timestamp.jpg"],
    "orderStatus": "New"
}
```

#### Create Order with Multiple Photos
```json
{
    "category": "Electronics",
    "orderBy": "userId123",
    "orderTo": "userId456",
    "location": "locationId789",
    "subCategory": "Mobile Phones",
    "weight": "1",
    "unit": "kg",
    "value": 100,
    "totalPrice": 110,
    "photos": [
        "https://s3.amazonaws.com/bucket/photo1.jpg",
        "https://s3.amazonaws.com/bucket/photo2.jpg",
        "https://s3.amazonaws.com/bucket/photo3.jpg"
    ],
    "photoKeys": [
        "uploads/photo1_timestamp.jpg",
        "uploads/photo2_timestamp.jpg",
        "uploads/photo3_timestamp.jpg"
    ],
    "orderStatus": "New"
}
```

### 3. Controller Input Handling

The controller automatically handles different input formats:

```javascript
// String input (JSON string)
photos: '["url1", "url2"]'
photoKeys: '["key1", "key2"]'

// Array input
photos: ["url1", "url2"]
photoKeys: ["key1", "key2"]

// Single string input
photos: "single_url"
photoKeys: "single_key"

// Empty/undefined input
photos: undefined // becomes []
photoKeys: undefined // becomes []
```

## Response Format

### Successful Order Creation
```json
{
    "_id": "orderId123",
    "orderNo": "ORD-1234567890-1234",
    "category": "Electronics",
    "orderBy": "userId123",
    "orderTo": "userId456",
    "location": "locationId789",
    "subCategory": "Mobile Phones",
    "weight": "1",
    "unit": "kg",
    "value": 100,
    "totalPrice": 110,
    "photos": [
        "https://s3.amazonaws.com/bucket/photo1.jpg",
        "https://s3.amazonaws.com/bucket/photo2.jpg"
    ],
    "photoKeys": [
        "uploads/photo1_timestamp.jpg",
        "uploads/photo2_timestamp.jpg"
    ],
    "orderStatus": "New",
    "otp": 1234,
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
}
```

## Key Features

1. **Flexible Input**: Handles string, array, or empty inputs
2. **Array Storage**: Both photos and photoKeys stored as arrays
3. **Default Values**: Empty arrays initialized automatically
4. **S3 Integration**: Compatible with existing file upload system
5. **Backward Compatibility**: Existing code continues to work
6. **Multiple Photos**: Supports unlimited photo uploads per order

## Important Notes

1. **Two-Step Process**: Upload files to S3 first, then create order with URLs/keys
2. **Array Matching**: Ensure photos and photoKeys arrays have matching indices
3. **File Limits**: Follow existing S3 upload limits (5MB per file, 10 files max for multiple upload)
4. **Error Handling**: Controller gracefully handles malformed JSON strings
5. **Database**: Arrays automatically initialized as empty if not provided 