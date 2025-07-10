# KYC Multiple Image Upload Guide

This guide explains how to upload multiple owner and warehouse images for KYC using AWS S3 file upload functionality.

## 🚀 Features

- ✅ Upload multiple owner images to AWS S3
- ✅ Upload multiple warehouse images to AWS S3
- ✅ Save multiple image URLs and S3 keys to KYC model
- ✅ Delete images using existing `/files/delete/:key` endpoint
- ✅ File size validation (5MB limit per image)
- ✅ Unique file naming with UUID
- ✅ Support for bulk image operations

## 📋 Prerequisites

### Environment Variables
Add these to your `.env` file:
```env
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_REGION=your_aws_region
AWS_BUCKET_NAME=your_s3_bucket_name
```

## 🔧 API Endpoints

### 1. Upload Single File to S3
**POST** `/files/upload`

**Headers:**
```
Content-Type: multipart/form-data
```

**Body (form-data):**
- `file`: File to upload

**Example Response:**
```json
{
  "success": true,
  "message": "File uploaded successfully",
  "data": {
    "url": "https://your-bucket.s3.amazonaws.com/1234567890-uuid.jpg",
    "key": "1234567890-uuid.jpg"
  }
}
```

### 2. Upload Multiple Files to S3
**POST** `/files/upload-multiple`

**Headers:**
```
Content-Type: multipart/form-data
```

**Body (form-data):**
- `files`: Multiple files (up to 10 files)

**Example Response:**
```json
{
  "success": true,
  "message": "Files uploaded successfully",
  "data": {
    "files": [
      {
        "url": "https://your-bucket.s3.amazonaws.com/1234567890-uuid1.jpg",
        "key": "1234567890-uuid1.jpg",
        "originalName": "image1.jpg"
      },
      {
        "url": "https://your-bucket.s3.amazonaws.com/1234567890-uuid2.jpg",
        "key": "1234567890-uuid2.jpg",
        "originalName": "image2.jpg"
      }
    ],
    "totalFiles": 2
  }
}
```

### 3. Upload Multiple Owner Images to KYC
**POST** `/v1/b2bUser/kycOwnerImage`

**Headers:**
```
Content-Type: application/json
```

**Body:**
```json
{
  "kycId": "507f1f77bcf86cd799439011",
  "ownerImages": [
    {
      "ownerImageUrl": "https://your-bucket.s3.amazonaws.com/1234567890-uuid1.jpg",
      "ownerImageKey": "1234567890-uuid1.jpg"
    },
    {
      "ownerImageUrl": "https://your-bucket.s3.amazonaws.com/1234567890-uuid2.jpg",
      "ownerImageKey": "1234567890-uuid2.jpg"
    }
  ]
}
```

### 4. Upload Multiple Warehouse Images to KYC
**POST** `/v1/b2bUser/kycWareHouseImage`

**Headers:**
```
Content-Type: application/json
```

**Body:**
```json
{
  "kycId": "507f1f77bcf86cd799439011",
  "warehouseImages": [
    {
      "warehouseImageUrl": "https://your-bucket.s3.amazonaws.com/1234567890-uuid1.jpg",
      "warehouseImageKey": "1234567890-uuid1.jpg"
    },
    {
      "warehouseImageUrl": "https://your-bucket.s3.amazonaws.com/1234567890-uuid2.jpg",
      "warehouseImageKey": "1234567890-uuid2.jpg"
    }
  ]
}
```

### 5. Update Owner Images (Replace All)
**PUT** `/v1/b2bUser/kycOwnerImage/:kycId`

### 6. Update Warehouse Images (Replace All)
**PUT** `/v1/b2bUser/kycWareHouseImage/:kycId`

### 7. Get Owner Images
**GET** `/v1/b2bUser/kycOwnerImage/:kycId`

### 8. Get Warehouse Images
**GET** `/v1/b2bUser/kycWareHouseImage/:kycId`

### 9. Delete File from S3
**DELETE** `/files/delete/:key`

## 📱 Frontend Implementation

### React/JavaScript Logic

#### Upload Multiple Files to S3
```javascript
const uploadMultipleFiles = async (files) => {
  const formData = new FormData();
  files.forEach(file => formData.append('files', file));

  const response = await fetch('/files/upload-multiple', {
    method: 'POST',
    body: formData,
  });

  const data = await response.json();
  return data.data.files; // Returns array of {url, key, originalName}
};
```

#### Upload Multiple Owner Images
```javascript
const uploadMultipleOwnerImages = async (kycId, imageFiles) => {
  // Step 1: Upload files to S3
  const uploadedFiles = await uploadMultipleFiles(imageFiles);
  
  // Step 2: Prepare owner images data
  const ownerImages = uploadedFiles.map(file => ({
    ownerImageUrl: file.url,
    ownerImageKey: file.key
  }));

  // Step 3: Save to KYC
  const response = await fetch('/v1/b2bUser/kycOwnerImage', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ kycId, ownerImages })
  });

  return await response.json();
};
```

#### Upload Multiple Warehouse Images
```javascript
const uploadMultipleWarehouseImages = async (kycId, imageFiles) => {
  // Step 1: Upload files to S3
  const uploadedFiles = await uploadMultipleFiles(imageFiles);
  
  // Step 2: Prepare warehouse images data
  const warehouseImages = uploadedFiles.map(file => ({
    warehouseImageUrl: file.url,
    warehouseImageKey: file.key
  }));

  // Step 3: Save to KYC
  const response = await fetch('/v1/b2bUser/kycWareHouseImage', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ kycId, warehouseImages })
  });

  return await response.json();
};
```

#### Get Images
```javascript
const getOwnerImages = async (kycId) => {
  const response = await fetch(`/v1/b2bUser/kycOwnerImage/${kycId}`);
  const data = await response.json();
  return data.ownerImages || [];
};

const getWarehouseImages = async (kycId) => {
  const response = await fetch(`/v1/b2bUser/kycWareHouseImage/${kycId}`);
  const data = await response.json();
  return data.warehouseImages || [];
};
```

#### Delete Multiple Images
```javascript
const deleteMultipleImages = async (imageKeys) => {
  const deletePromises = imageKeys.map(key => 
    fetch(`/files/delete/${key}`, { method: 'DELETE' })
  );
  await Promise.all(deletePromises);
};
```

#### Update Images (Replace All)
```javascript
const updateOwnerImages = async (kycId, imageFiles) => {
  const uploadedFiles = await uploadMultipleFiles(imageFiles);
  const ownerImages = uploadedFiles.map(file => ({
    ownerImageUrl: file.url,
    ownerImageKey: file.key
  }));

  const response = await fetch(`/v1/b2bUser/kycOwnerImage/${kycId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ownerImages })
  });

  return await response.json();
};
```

### React Component Logic

#### File Upload Handler
```javascript
const handleFileUpload = (event, uploadFunction) => {
  const files = Array.from(event.target.files);
  if (files.length > 0) {
    uploadFunction(kycId, files);
  }
};
```

#### Image Display Logic
```javascript
const renderImageGallery = (images) => {
  return images.map((image, index) => (
    <img 
      key={index}
      src={image} 
      alt={`Image ${index + 1}`} 
      style={{ width: 150, height: 100, objectFit: 'cover', margin: '5px' }}
    />
  ));
};
```

#### State Management
```javascript
const [ownerImages, setOwnerImages] = useState([]);
const [warehouseImages, setWarehouseImages] = useState([]);
const [loading, setLoading] = useState(false);

// Load images on component mount
useEffect(() => {
  loadImages();
}, [kycId]);

const loadImages = async () => {
  const ownerData = await getOwnerImages(kycId);
  const warehouseData = await getWarehouseImages(kycId);
  setOwnerImages(ownerData);
  setWarehouseImages(warehouseData);
};
```

#### Upload Functions with Loading States
```javascript
const handleOwnerImagesUpload = async (event) => {
  const files = Array.from(event.target.files);
  if (files.length > 0) {
    setLoading(true);
    try {
      const result = await uploadMultipleOwnerImages(kycId, files);
      setOwnerImages(result.data.ownerImages);
    } catch (error) {
      alert('Failed to upload owner images');
    } finally {
      setLoading(false);
    }
  }
};

const handleWarehouseImagesUpload = async (event) => {
  const files = Array.from(event.target.files);
  if (files.length > 0) {
    setLoading(true);
    try {
      const result = await uploadMultipleWarehouseImages(kycId, files);
      setWarehouseImages(result.data.warehouseImages);
    } catch (error) {
      alert('Failed to upload warehouse images');
    } finally {
      setLoading(false);
    }
  }
};
```

## 🔍 Database Schema

The KYC model includes arrays for multiple images:
```javascript
{
  OwnerImage: [String],        // Array of S3 image URLs
  OwnerImageKey: [String],     // Array of S3 file keys for deletion
  WareHouseImage: [String],    // Array of S3 image URLs
  WarehouseImageKey: [String]  // Array of S3 file keys for deletion
}
```

## ⚠️ Error Handling

### Common Errors
1. **File too large**: 5MB limit per image
2. **Too many files**: Maximum 10 files per upload
3. **Invalid file type**: Only images allowed
4. **KYC not found**: Check if KYC ID exists
5. **Missing parameters**: Ensure all required fields are provided

### Error Response Format
```json
{
  "message": "Error description",
  "error": "Detailed error message"
}
```

## 🛠️ Troubleshooting

### S3 Connection Issues
1. Verify AWS credentials in `.env`
2. Check S3 bucket permissions
3. Ensure bucket CORS is configured
4. Verify AWS region matches bucket region

### File Upload Issues
1. Check file size (max 5MB per image)
2. Ensure files are images
3. Verify multipart/form-data content type
4. Check network connectivity

### KYC Issues
1. Verify KYC ID exists
2. Check MongoDB connection
3. Ensure proper data types

## 📝 Notes

- Uses existing `/files/upload` for single files
- Uses new `/files/upload-multiple` for multiple files
- Multi-step process: upload files first, then save URLs to KYC
- File names include timestamp and UUID for uniqueness
- Both image URLs and S3 keys are stored for complete file management
- File size limit is 5MB per image
- Maximum 10 files per upload
- Supports multiple images for both owner and warehouse
- Arrays are automatically initialized if they don't exist
- Upload adds to existing images, update replaces all images 