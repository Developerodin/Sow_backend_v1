# Category and SubCategory Image API Guide

This document describes the API endpoints for managing images in Categories and SubCategories, including both image URLs and image keys.

## Category Image Management

### 1. Create Category (with optional image)
- **URL:** `/categories`
- **Method:** `POST`
- **Request Body:**
```json
{
  "name": "Electronics",
  "description": "Electronic products category",
  "image": "https://example.com/electronics.jpg",
  "imageKey": "categories/electronics/123.jpg"
}
```
- **Response:**
```json
{
  "_id": "64a1b2c3d4e5f6789012345",
  "name": "Electronics",
  "description": "Electronic products category",
  "image": "https://example.com/electronics.jpg",
  "imageKey": "categories/electronics/123.jpg",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

### 2. Update Category (with optional image)
- **URL:** `/categories/:id`
- **Method:** `PATCH`
- **Request Body:**
```json
{
  "name": "Updated Electronics",
  "description": "Updated electronic products category",
  "image": "https://example.com/electronics_new.jpg",
  "imageKey": "categories/electronics/456.jpg"
}
```

### 3. Update Category Image Only
- **URL:** `/categories/update-image`
- **Method:** `PUT`
- **Request Body:**
```json
{
  "categoryId": "64a1b2c3d4e5f6789012345",
  "image": "https://example.com/new_image.jpg",
  "imageKey": "categories/electronics/789.jpg"
}
```

### 4. Update All Category Images
- **URL:** `/categories/update-allimage`
- **Method:** `POST`
- **Request Body:**
```json
{
  "image": "https://example.com/default_category.jpg",
  "imageKey": "categories/default/999.jpg"
}
```

---

## SubCategory Image Management

### 1. Create SubCategory (with optional image)
- **URL:** `/subcategories`
- **Method:** `POST`
- **Request Body:**
```json
{
  "categoryId": "64a1b2c3d4e5f6789012345",
  "name": "Mobile Phones",
  "description": "Mobile phone subcategory",
  "price": 500,
  "isTradable": true,
  "image": "https://example.com/mobile_phones.jpg",
  "imageKey": "subcategories/mobile_phones/123.jpg"
}
```
- **Response:**
```json
{
  "_id": "64a1b2c3d4e5f6789012346",
  "categoryId": "64a1b2c3d4e5f6789012345",
  "name": "Mobile Phones",
  "description": "Mobile phone subcategory",
  "price": 500,
  "isTradable": true,
  "image": "https://example.com/mobile_phones.jpg",
  "imageKey": "subcategories/mobile_phones/123.jpg",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

### 2. Update SubCategory (with optional image)
- **URL:** `/subcategories/:id`
- **Method:** `PATCH`
- **Request Body:**
```json
{
  "name": "Updated Mobile Phones",
  "description": "Updated mobile phone subcategory",
  "price": 600,
  "isTradable": false,
  "image": "https://example.com/mobile_phones_new.jpg",
  "imageKey": "subcategories/mobile_phones/456.jpg"
}
```

### 3. Upload SubCategory Image
- **URL:** `/subcategories/upload-image`
- **Method:** `POST`
- **Request Body:**
```json
{
  "subcategoryId": "64a1b2c3d4e5f6789012346",
  "image": "https://example.com/new_subcategory_image.jpg",
  "imageKey": "subcategories/mobile_phones/789.jpg"
}
```

### 4. Update All SubCategory Images
- **URL:** `/subcategories/upload-allimage`
- **Method:** `POST`
- **Request Body:**
```json
{
  "image": "https://example.com/default_subcategory.jpg",
  "imageKey": "subcategories/default/999.jpg"
}
```

---

## Data Submission Without Images

### Category Creation (No Image)
```json
{
  "name": "Books",
  "description": "Book category"
}
```

### SubCategory Creation (No Image)
```json
{
  "categoryId": "64a1b2c3d4e5f6789012345",
  "name": "Fiction Books",
  "description": "Fiction book subcategory",
  "price": 25,
  "isTradable": true
}
```

---

## Field Descriptions

### Category Fields
- `name` (required): Category name
- `description` (optional): Category description
- `image` (optional): Image URL
- `imageKey` (optional): Image storage key (e.g., S3 key)

### SubCategory Fields
- `categoryId` (required): Reference to parent category
- `name` (required): SubCategory name
- `description` (optional): SubCategory description
- `price` (optional): Price value
- `isTradable` (optional): Trading status (default: true)
- `image` (optional): Image URL
- `imageKey` (optional): Image storage key (e.g., S3 key)

---

## Notes
- Both `image` and `imageKey` fields are optional
- Data can be submitted without any image fields
- Image URLs are typically returned from your file storage service (e.g., AWS S3)
- Image keys are used for file management and deletion
- All endpoints support partial updates (only send the fields you want to update)
- The `image` field stores the URL, while `imageKey` stores the storage reference 