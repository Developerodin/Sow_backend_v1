# PAN Verification API Guide

This guide documents the PAN (Permanent Account Number) verification APIs for B2B users in the SOW Backend system.

## Overview

The PAN verification system allows B2B users to verify their PAN numbers using the TruthScreen service and automatically stores the verification results in the KYC system.

## Base URL

```
POST /api/v1/b2bUser/:userId/verify-pan
GET /api/v1/b2bUser/:userId/pan-status
PUT /api/v1/b2bUser/:userId/update-pan
```

## API Endpoints

### 1. Verify PAN Number

**Endpoint:** `POST /api/v1/b2bUser/:userId/verify-pan`

**Description:** Verifies a PAN number using the TruthScreen service and stores the verification result in the user's KYC record.

**Parameters:**
- `userId` (path parameter): The ID of the B2B user

**Request Body:**
```json
{
  "panNumber": "ABCDE1234F"
}
```

**Response (Success - 200):**
```json
{
  "success": true,
  "message": "PAN verified successfully",
  "data": {
    "panNumber": "ABCDE1234F",
    "panVerified": true,
    "panVerificationDate": "2024-01-15T10:30:00.000Z",
    "verificationData": {
      "valid": true,
      "message": "PAN verification completed",
      "status": "VALID",
      "data": {
        "Name": "JOHN DOE",
        "NameOnTheCard": "JOHN DOE",
        "STATUS": "ACTIVE",
        "PanHolderStatusType": "INDIVIDUAL",
        "LastUpdate": "2024-01-01"
      },
      "panNumber": "ABCDE1234F",
      "transactionId": "TS1705312200000",
      "name": "JOHN DOE",
      "nameOnCard": "JOHN DOE",
      "panStatus": "ACTIVE",
      "panHolderType": "INDIVIDUAL",
      "lastUpdate": "2024-01-01",
      "verificationDate": "2024-01-15T10:30:00.000Z"
    }
  }
}
```

**Response (Error - 400):**
```json
{
  "success": false,
  "message": "PAN verification failed: Invalid PAN number",
  "data": {
    "valid": false,
    "message": "Invalid PAN number",
    "status": "INVALID",
    "panNumber": "INVALID123",
    "transactionId": "TS1705312200000"
  }
}
```

**Response (Error - 500):**
```json
{
  "success": false,
  "message": "PAN verification failed: Internal server error"
}
```

### 2. Get PAN KYC Status

**Endpoint:** `GET /api/v1/b2bUser/:userId/pan-status`

**Description:** Retrieves the current PAN verification status for a B2B user.

**Parameters:**
- `userId` (path parameter): The ID of the B2B user

**Response (Success - 200):**
```json
{
  "success": true,
  "data": {
    "panNumber": "ABCDE1234F",
    "panVerified": true,
    "panVerificationDate": "2024-01-15T10:30:00.000Z",
    "panKycData": {
      "valid": true,
      "message": "PAN verification completed",
      "status": "VALID",
      "data": {
        "Name": "JOHN DOE",
        "NameOnTheCard": "JOHN DOE",
        "STATUS": "ACTIVE",
        "PanHolderStatusType": "INDIVIDUAL",
        "LastUpdate": "2024-01-01"
      },
      "panNumber": "ABCDE1234F",
      "transactionId": "TS1705312200000",
      "name": "JOHN DOE",
      "nameOnCard": "JOHN DOE",
      "panStatus": "ACTIVE",
      "panHolderType": "INDIVIDUAL",
      "lastUpdate": "2024-01-01",
      "verificationDate": "2024-01-15T10:30:00.000Z"
    }
  }
}
```

**Response (Not Found - 404):**
```json
{
  "success": false,
  "message": "KYC details not found for this user"
}
```

### 3. Update PAN KYC

**Endpoint:** `PUT /api/v1/b2bUser/:userId/update-pan`

**Description:** Updates the PAN number for a B2B user, re-verifies it, and updates the KYC record.

**Parameters:**
- `userId` (path parameter): The ID of the B2B user

**Request Body:**
```json
{
  "panNumber": "WXYZ9876A"
}
```

**Response (Success - 200):**
```json
{
  "success": true,
  "message": "PAN KYC updated successfully",
  "data": {
    "panNumber": "WXYZ9876A",
    "panVerified": true,
    "panVerificationDate": "2024-01-15T11:00:00.000Z",
    "verificationData": {
      "valid": true,
      "message": "PAN verification completed",
      "status": "VALID",
      "data": {
        "Name": "JANE SMITH",
        "NameOnTheCard": "JANE SMITH",
        "STATUS": "ACTIVE",
        "PanHolderStatusType": "INDIVIDUAL",
        "LastUpdate": "2024-01-01"
      },
      "panNumber": "WXYZ9876A",
      "transactionId": "TS1705312400000",
      "name": "JANE SMITH",
      "nameOnCard": "JANE SMITH",
      "panStatus": "ACTIVE",
      "panHolderType": "INDIVIDUAL",
      "lastUpdate": "2024-01-01",
      "verificationDate": "2024-01-15T11:00:00.000Z"
    }
  }
}
```

**Response (Not Found - 404):**
```json
{
  "success": false,
  "message": "KYC details not found for this user"
}
```

## Data Model

The PAN verification data is stored in the B2B KYC model with the following fields:

```javascript
{
  panNumber: {
    type: String,
    required: false,
    trim: true,
    validate(value) {
      if (value && !validator.matches(value, /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/)) {
        throw new Error('Invalid PAN number');
      }
    },
  },
  panVerified: {
    type: Boolean,
    default: false,
  },
  panVerificationDate: Date,
  panKycData: {
    type: Object, // Store the complete verification response
    required: false,
  }
}
```

## PAN Number Format

PAN numbers must follow the Indian PAN format:
- 10 characters long
- First 5 characters: Uppercase letters (A-Z)
- Next 4 characters: Digits (0-9)
- Last character: Uppercase letter (A-Z)
- Example: `ABCDE1234F`

## Error Handling

The APIs handle the following error scenarios:

1. **Invalid PAN Format**: Returns 400 with validation error
2. **PAN Verification Failure**: Returns 400 with verification error details
3. **User Not Found**: Returns 404
4. **KYC Not Found**: Returns 404 (for get and update operations)
5. **Server Errors**: Returns 500 with error message

## Integration with TruthScreen

The PAN verification uses the TruthScreen service (`src/services/truthscreen.service.js`) which:
- Encrypts the PAN number using AES-128-CBC
- Sends the request to TruthScreen API
- Decrypts the response
- Returns structured verification data

## Usage Examples

### Frontend Integration

```javascript
// Verify PAN
const verifyPAN = async (userId, panNumber) => {
  const response = await fetch(`/api/v1/b2bUser/${userId}/verify-pan`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ panNumber })
  });
  return response.json();
};

// Get PAN Status
const getPANStatus = async (userId) => {
  const response = await fetch(`/api/v1/b2bUser/${userId}/pan-status`);
  return response.json();
};

// Update PAN
const updatePAN = async (userId, panNumber) => {
  const response = await fetch(`/api/v1/b2bUser/${userId}/update-pan`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ panNumber })
  });
  return response.json();
};
```

### cURL Examples

```bash
# Verify PAN
curl -X POST http://localhost:3000/api/v1/b2bUser/64f1a2b3c4d5e6f7g8h9i0j1/verify-pan \
  -H "Content-Type: application/json" \
  -d '{"panNumber": "ABCDE1234F"}'

# Get PAN Status
curl -X GET http://localhost:3000/api/v1/b2bUser/64f1a2b3c4d5e6f7g8h9i0j1/pan-status

# Update PAN
curl -X PUT http://localhost:3000/api/v1/b2bUser/64f1a2b3c4d5e6f7g8h9i0j1/update-pan \
  -H "Content-Type: application/json" \
  -d '{"panNumber": "WXYZ9876A"}'
```

## Security Considerations

1. **PAN Number Validation**: Server-side validation ensures proper PAN format
2. **Encryption**: PAN numbers are encrypted before sending to TruthScreen
3. **Secure Storage**: Verification data is stored securely in the database
4. **Access Control**: APIs should be protected with appropriate authentication

## Notes

- The verification process is automatic and real-time
- Failed verifications are logged with detailed error messages
- The system stores complete verification response data for audit purposes
- PAN numbers are automatically converted to uppercase
- Verification dates are automatically set when verification is successful 