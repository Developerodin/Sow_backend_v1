# B2B KYC Aadhar Card Image API Guide

This document describes the API endpoints for uploading, updating, and retrieving Aadhar card front and back images for B2B KYC.

## Main KYC Endpoints (Include Aadhar Images)

### 1. Add KYC Details (with Aadhar Images)
- **URL:** `/b2bUser/kyc`
- **Method:** `POST`
- **Request Body:**
```json
{
  "userId": "<USER_ID>",
  "panNumber": "ABCDE1234F",
  "gstinNumber": "29ABCDE1234F1Z2",
  "panImage": "https://.../pan.jpg",
  "gstinImage": "https://.../gstin.jpg",
  "OwnerImage": ["https://.../owner1.jpg", "https://.../owner2.jpg"],
  "WareHouseImage": ["https://.../warehouse1.jpg", "https://.../warehouse2.jpg"],
  "aadharFrontImage": "https://.../aadhar_front.jpg",
  "aadharFrontImageKey": "aadhar/front/123.jpg",
  "aadharBackImage": "https://.../aadhar_back.jpg",
  "aadharBackImageKey": "aadhar/back/123.jpg"
}
```

### 2. Update KYC Details (with Aadhar Images)
- **URL:** `/b2bUser/kyc/:id`
- **Method:** `PUT`
- **Request Body:**
```json
{
  "panNumber": "ABCDE1234F",
  "gstinNumber": "29ABCDE1234F1Z2",
  "panImage": "https://.../pan_new.jpg",
  "gstinImage": "https://.../gstin_new.jpg",
  "OwnerImage": ["https://.../owner_new.jpg"],
  "WareHouseImage": ["https://.../warehouse_new.jpg"],
  "aadharFrontImage": "https://.../aadhar_front_new.jpg",
  "aadharFrontImageKey": "aadhar/front/456.jpg",
  "aadharBackImage": "https://.../aadhar_back_new.jpg",
  "aadharBackImageKey": "aadhar/back/456.jpg"
}
```

### 3. Update KYC Details by User ID (with Aadhar Images)
- **URL:** `/b2bUser/kyc/:userId`
- **Method:** `PUT`
- **Request Body:**
```json
{
  "gstinNumber": "29ABCDE1234F1Z2",
  "aadharFrontImage": "https://.../aadhar_front.jpg",
  "aadharFrontImageKey": "aadhar/front/123.jpg",
  "aadharBackImage": "https://.../aadhar_back.jpg",
  "aadharBackImageKey": "aadhar/back/123.jpg"
}
```

### 4. Get KYC Details by User ID (includes Aadhar Images)
- **URL:** `/b2bUser/kyc/:userId`
- **Method:** `GET`
- **Response:**
```json
{
  "success": true,
  "data": {
    "userId": "<USER_ID>",
    "panNumber": "ABCDE1234F",
    "gstinNumber": "29ABCDE1234F1Z2",
    "panImage": "https://.../pan.jpg",
    "gstinImage": "https://.../gstin.jpg",
    "aadharFrontImage": "https://.../aadhar_front.jpg",
    "aadharFrontImageKey": "aadhar/front/123.jpg",
    "aadharBackImage": "https://.../aadhar_back.jpg",
    "aadharBackImageKey": "aadhar/back/123.jpg",
    "OwnerImage": ["https://.../owner1.jpg"],
    "WareHouseImage": ["https://.../warehouse1.jpg"],
    "status": "pending",
    "totalOwnerImages": 1,
    "totalWarehouseImages": 1
  }
}
```

---

## Unified Aadhar Image Endpoints (Recommended)

### 1. Upload Both Aadhar Images
- **URL:** `/b2bUser/kycAadharImages`
- **Method:** `POST`
- **Request Body:**
```json
{
  "kycId": "<KYC_ID>",
  "aadharFrontImageUrl": "https://.../front.jpg",
  "aadharFrontImageKey": "aadhar/front/123.jpg",
  "aadharBackImageUrl": "https://.../back.jpg",
  "aadharBackImageKey": "aadhar/back/123.jpg"
}
```
- **Response:**
```json
{
  "message": "Aadhar images uploaded successfully",
  "data": {
    "kycId": "<KYC_ID>",
    "aadharFrontImage": "https://.../front.jpg",
    "aadharFrontImageKey": "aadhar/front/123.jpg",
    "aadharBackImage": "https://.../back.jpg",
    "aadharBackImageKey": "aadhar/back/123.jpg"
  }
}
```

---

### 2. Update Both Aadhar Images
- **URL:** `/b2bUser/kycAadharImages/:kycId`
- **Method:** `PUT`
- **Request Body:**
```json
{
  "aadharFrontImageUrl": "https://.../front_new.jpg",
  "aadharFrontImageKey": "aadhar/front/456.jpg",
  "aadharBackImageUrl": "https://.../back_new.jpg",
  "aadharBackImageKey": "aadhar/back/456.jpg"
}
```
- **Response:**
```json
{
  "message": "Aadhar images updated successfully",
  "data": {
    "kycId": "<KYC_ID>",
    "aadharFrontImage": "https://.../front_new.jpg",
    "aadharFrontImageKey": "aadhar/front/456.jpg",
    "aadharBackImage": "https://.../back_new.jpg",
    "aadharBackImageKey": "aadhar/back/456.jpg"
  }
}
```

---

### 3. Get Both Aadhar Images
- **URL:** `/b2bUser/kycAadharImages/:kycId`
- **Method:** `GET`
- **Response:**
```json
{
  "aadharFrontImage": "https://.../front.jpg",
  "aadharFrontImageKey": "aadhar/front/123.jpg",
  "aadharBackImage": "https://.../back.jpg",
  "aadharBackImageKey": "aadhar/back/123.jpg"
}
```

---

## Legacy/Advanced Endpoints (Single Image)
_Use these only if you need to upload or update front/back images separately._

### 1. Upload Aadhar Front Image
- **URL:** `/b2bUser/kycAadharFrontImage`
- **Method:** `POST`
- **Request Body:**
```json
{
  "kycId": "<KYC_ID>",
  "aadharFrontImageUrl": "https://.../front.jpg",
  "aadharFrontImageKey": "aadhar/front/123.jpg"
}
```
- **Response:**
```json
{
  "message": "Aadhar front image uploaded successfully",
  "data": {
    "kycId": "<KYC_ID>",
    "aadharFrontImage": "https://.../front.jpg",
    "aadharFrontImageKey": "aadhar/front/123.jpg"
  }
}
```

---

### 2. Get Aadhar Front Image
- **URL:** `/b2bUser/kycAadharFrontImage/:kycId`
- **Method:** `GET`
- **Response:**
```json
{
  "aadharFrontImage": "https://.../front.jpg",
  "aadharFrontImageKey": "aadhar/front/123.jpg"
}
```

---

### 3. Update Aadhar Front Image
- **URL:** `/b2bUser/kycAadharFrontImage/:kycId`
- **Method:** `PUT`
- **Request Body:**
```json
{
  "aadharFrontImageUrl": "https://.../front_new.jpg",
  "aadharFrontImageKey": "aadhar/front/456.jpg"
}
```
- **Response:**
```json
{
  "message": "Aadhar front image updated successfully",
  "data": {
    "kycId": "<KYC_ID>",
    "aadharFrontImage": "https://.../front_new.jpg",
    "aadharFrontImageKey": "aadhar/front/456.jpg"
  }
}
```

---

### 4. Upload Aadhar Back Image
- **URL:** `/b2bUser/kycAadharBackImage`
- **Method:** `POST`
- **Request Body:**
```json
{
  "kycId": "<KYC_ID>",
  "aadharBackImageUrl": "https://.../back.jpg",
  "aadharBackImageKey": "aadhar/back/123.jpg"
}
```
- **Response:**
```json
{
  "message": "Aadhar back image uploaded successfully",
  "data": {
    "kycId": "<KYC_ID>",
    "aadharBackImage": "https://.../back.jpg",
    "aadharBackImageKey": "aadhar/back/123.jpg"
  }
}
```

---

### 5. Get Aadhar Back Image
- **URL:** `/b2bUser/kycAadharBackImage/:kycId`
- **Method:** `GET`
- **Response:**
```json
{
  "aadharBackImage": "https://.../back.jpg",
  "aadharBackImageKey": "aadhar/back/123.jpg"
}
```

---

### 6. Update Aadhar Back Image
- **URL:** `/b2bUser/kycAadharBackImage/:kycId`
- **Method:** `PUT`
- **Request Body:**
```json
{
  "aadharBackImageUrl": "https://.../back_new.jpg",
  "aadharBackImageKey": "aadhar/back/456.jpg"
}
```
- **Response:**
```json
{
  "message": "Aadhar back image updated successfully",
  "data": {
    "kycId": "<KYC_ID>",
    "aadharBackImage": "https://.../back_new.jpg",
    "aadharBackImageKey": "aadhar/back/456.jpg"
  }
}
```

---

## Notes
- **Main KYC endpoints** now support Aadhar images along with PAN, GSTIN, Owner, and Warehouse images.
- **Unified endpoints** are recommended for handling both Aadhar images together.
- All endpoints require a valid `kycId` or `userId`.
- Only one image (front or back) is stored per KYC record; uploading or updating will overwrite the previous image.
- Image URLs and keys are typically returned from your file storage service (e.g., AWS S3).
- Aadhar images are single images (not arrays like Owner/Warehouse images). 