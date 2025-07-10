# AWS S3 File Upload Integration Guide

This guide explains how to use the existing AWS S3 file upload functionality with the B2B user model for profile image management.

## 🚀 Features

- ✅ Upload files using existing `/files/upload` endpoint
- ✅ Save image URL and S3 key to B2B user model
- ✅ Delete files using existing `/files/delete/:key` endpoint
- ✅ File size validation (5MB limit)
- ✅ Unique file naming with UUID

## 📋 Prerequisites

### Environment Variables
Add these to your `.env` file:
```env
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_REGION=your_aws_region
AWS_BUCKET_NAME=your_s3_bucket_name
```

### AWS S3 Bucket Setup
1. Create an S3 bucket in your AWS account
2. Configure CORS for your bucket:
```json
[
    {
        "AllowedHeaders": ["*"],
        "AllowedMethods": ["GET", "POST", "PUT", "DELETE"],
        "AllowedOrigins": ["*"],
        "ExposeHeaders": []
    }
]
```

## 🔧 API Endpoints

### 1. Upload File to S3
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

### 2. Save Image URL to User Profile
**POST** `/v1/b2bUser/profilepic`

**Headers:**
```
Content-Type: application/json
```

**Body:**
```json
{
  "userId": "507f1f77bcf86cd799439011",
  "imageUrl": "https://your-bucket.s3.amazonaws.com/1234567890-uuid.jpg",
  "imageKey": "1234567890-uuid.jpg"
}
```

**Example Response:**
```json
{
  "message": "Image updated successfully",
  "data": {
    "user": {
      "id": "507f1f77bcf86cd799439011",
      "name": "John Doe",
      "image": "https://your-bucket.s3.amazonaws.com/1234567890-uuid.jpg",
      "imageKey": "1234567890-uuid.jpg"
    }
  }
}
```

### 3. Delete File from S3
**DELETE** `/files/delete/:key`

**Example Response:**
```json
{
  "success": true,
  "message": "File deleted successfully"
}
```

### 4. Get Profile Image
**GET** `/v1/b2bUser/profilepic/:userId`

**Example Response:**
```json
{
  "image": "https://your-bucket.s3.amazonaws.com/1234567890-uuid.jpg"
}
```

## 📱 Postman Examples

### Step 1: Upload File to S3
1. **Method**: POST
2. **URL**: `{{base_url}}/files/upload`
3. **Headers**: 
   - `Content-Type`: `multipart/form-data`
4. **Body**: 
   - Select `form-data`
   - Add key: `file` (File), select your image file

### Step 2: Save Image URL to User Profile
1. **Method**: POST
2. **URL**: `{{base_url}}/v1/b2bUser/profilepic`
3. **Headers**: 
   - `Content-Type`: `application/json`
4. **Body** (raw JSON):
```json
{
  "userId": "507f1f77bcf86cd799439011",
  "imageUrl": "https://your-bucket.s3.amazonaws.com/1234567890-uuid.jpg",
  "imageKey": "1234567890-uuid.jpg"
}
```

### Delete File from S3
1. **Method**: DELETE
2. **URL**: `{{base_url}}/files/delete/1234567890-uuid.jpg`

### Get Profile Image
1. **Method**: GET
2. **URL**: `{{base_url}}/v1/b2bUser/profilepic/507f1f77bcf86cd799439011`

## 🎨 Frontend Implementation

### React/JavaScript Example

#### Complete Image Upload Flow
```javascript
const uploadProfileImage = async (userId, imageFile) => {
  try {
    // Step 1: Upload file to S3
    const formData = new FormData();
    formData.append('file', imageFile);

    const uploadResponse = await fetch('/files/upload', {
      method: 'POST',
      body: formData,
    });

    const uploadData = await uploadResponse.json();
    
    if (!uploadResponse.ok) {
      throw new Error(uploadData.message);
    }

    // Step 2: Save image URL to user profile
    const profileResponse = await fetch('/v1/b2bUser/profilepic', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId: userId,
        imageUrl: uploadData.data.url,
        imageKey: uploadData.data.key
      }),
    });

    const profileData = await profileResponse.json();
    
    if (!profileResponse.ok) {
      throw new Error(profileData.message);
    }

    return profileData.data;
  } catch (error) {
    console.error('Error uploading profile image:', error);
    throw error;
  }
};

// Usage
const handleImageUpload = async (event) => {
  const file = event.target.files[0];
  if (file) {
    try {
      const result = await uploadProfileImage(userId, file);
      // Update UI with new image
      setProfileImage(result.user.image);
    } catch (error) {
      alert('Failed to upload image');
    }
  }
};
```

#### Delete Image
```javascript
const deleteProfileImage = async (userId, imageKey) => {
  try {
    // Step 1: Delete file from S3
    const deleteResponse = await fetch(`/files/delete/${imageKey}`, {
      method: 'DELETE',
    });

    if (!deleteResponse.ok) {
      throw new Error('Failed to delete file from S3');
    }

    // Step 2: Update user profile to remove image
    const profileResponse = await fetch('/v1/b2bUser/profilepic', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId: userId,
        imageUrl: null,
        imageKey: null
      }),
    });

    const profileData = await profileResponse.json();
    
    if (!profileResponse.ok) {
      throw new Error(profileData.message);
    }

    return profileData.data;
  } catch (error) {
    console.error('Error deleting profile image:', error);
    throw error;
  }
};
```

#### Get Image
```javascript
const getProfileImage = async (userId) => {
  try {
    const response = await fetch(`/v1/b2bUser/profilepic/${userId}`);
    const data = await response.json();
    
    if (response.ok) {
      return data.image;
    } else {
      throw new Error(data.message);
    }
  } catch (error) {
    console.error('Error fetching image:', error);
    return null;
  }
};
```

### React Component Example
```jsx
import React, { useState, useEffect } from 'react';

const ProfileImageUpload = ({ userId }) => {
  const [profileImage, setProfileImage] = useState(null);
  const [imageKey, setImageKey] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadProfileImage();
  }, [userId]);

  const loadProfileImage = async () => {
    try {
      const imageUrl = await getProfileImage(userId);
      setProfileImage(imageUrl);
    } catch (error) {
      console.error('Error loading profile image:', error);
    }
  };

  const handleImageUpload = async (event) => {
    const file = event.target.files[0];
    if (file) {
      setLoading(true);
      try {
        const result = await uploadProfileImage(userId, file);
        setProfileImage(result.user.image);
        setImageKey(result.user.imageKey);
      } catch (error) {
        alert('Failed to upload image');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleDeleteImage = async () => {
    if (!imageKey) return;
    
    setLoading(true);
    try {
      await deleteProfileImage(userId, imageKey);
      setProfileImage(null);
      setImageKey(null);
    } catch (error) {
      alert('Failed to delete image');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="profile-image-container">
      {profileImage ? (
        <div>
          <img 
            src={profileImage} 
            alt="Profile" 
            style={{ width: 100, height: 100, borderRadius: '50%' }}
          />
          <button onClick={handleDeleteImage} disabled={loading}>
            {loading ? 'Deleting...' : 'Delete Image'}
          </button>
        </div>
      ) : (
        <div>
          <input
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            disabled={loading}
          />
          {loading && <p>Uploading...</p>}
        </div>
      )}
    </div>
  );
};

export default ProfileImageUpload;
```

## 🔍 Database Schema

The B2B user model includes these fields:
```javascript
{
  image: String,      // S3 image URL
  imageKey: String    // S3 file key for deletion
}
```

## ⚠️ Error Handling

### Common Errors
1. **File too large**: 5MB limit
2. **Invalid file type**: Only images allowed
3. **AWS credentials**: Check environment variables
4. **S3 bucket**: Ensure bucket exists and is accessible

### Error Response Format
```json
{
  "success": false,
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
1. Check file size (max 5MB)
2. Ensure file is an image
3. Verify multipart/form-data content type
4. Check network connectivity

### Database Issues
1. Verify MongoDB connection
2. Check user ID exists
3. Ensure proper data types

## 📝 Notes

- Uses existing `/files/upload` and `/files/delete` endpoints
- Two-step process: upload file first, then save URL to user profile
- File names include timestamp and UUID for uniqueness
- Both image URL and S3 key are stored for complete file management
- File size limit is 5MB per upload 