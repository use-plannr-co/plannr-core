# Users Module API Documentation

## Overview

The Users module handles user authentication, profile management, and user preferences for the Plannr backend. It integrates with Clerk for authentication and provides endpoints for user management.

## Authentication

Most endpoints require authentication via Clerk. Include the user's Clerk ID in the request headers:

```
x-clerk-user-id: [clerk_user_id]
```

## User Endpoints

### POST /api/users/auth/login

**Description**: Authenticate user and create if they don't exist in the database.

**Headers**:

- `Content-Type: application/json`
- `x-clerk-user-id: [clerk_user_id]`

**Request Body**:

```json
{
    "clerkUserId": "user_2abc123",
    "email": "user@example.com",
    "displayName": "John Doe",
    "avatarUrl": "https://example.com/avatar.jpg"
}
```

**Response** (201 Created):

```json
{
    "success": true,
    "message": "User logged in successfully",
    "data": {
        "id": "uuid",
        "clerkUserId": "user_2abc123",
        "email": "user@example.com",
        "displayName": "John Doe",
        "avatarUrl": "https://example.com/avatar.jpg",
        "preferences": {
            "id": "uuid",
            "userId": "uuid",
            "uiMode": "system",
            "notificationsEnabled": true,
            "leadMinutes": 30,
            "minGapMinutes": 15,
            "maxWorkHoursPerDay": 8,
            "weekendPolicy": "allow",
            "nickname": null,
            "version": 1,
            "updatedAt": "2024-01-01T00:00:00.000Z",
            "createdAt": "2024-01-01T00:00:00.000Z"
        }
    }
}
```

### GET /api/users/profile

**Description**: Get current user's profile with preferences.

**Headers**:

- `x-clerk-user-id: [clerk_user_id]`

**Response** (200 OK):

```json
{
    "success": true,
    "data": {
        "id": "uuid",
        "clerkUserId": "user_2abc123",
        "email": "user@example.com",
        "displayName": "John Doe",
        "avatarUrl": "https://example.com/avatar.jpg",
        "preferences": {
            /* preferences object */
        },
        "createdAt": "2024-01-01T00:00:00.000Z",
        "updatedAt": "2024-01-01T00:00:00.000Z"
    },
    "message": "User profile retrieved successfully"
}
```

### PUT /api/users/profile

**Description**: Update user profile information.

**Headers**:

- `Content-Type: application/json`
- `x-clerk-user-id: [clerk_user_id]`

**Request Body**:

```json
{
    "displayName": "John Smith",
    "avatarUrl": "https://example.com/new-avatar.jpg"
}
```

**Response** (200 OK):

```json
{
    "success": true,
    "message": "User profile updated successfully",
    "data": {
        "id": "uuid",
        "clerkUserId": "user_2abc123",
        "email": "user@example.com",
        "displayName": "John Smith",
        "avatarUrl": "https://example.com/new-avatar.jpg",
        "updatedAt": "2024-01-01T00:00:00.000Z"
    }
}
```

### DELETE /api/users/profile

**Description**: Delete user account and all associated data.

**Headers**:

- `x-clerk-user-id: [clerk_user_id]`

**Response** (200 OK):

```json
{
    "success": true,
    "message": "User deleted successfully"
}
```

## Preferences Endpoints

### GET /api/preferences

**Description**: Get user preferences in frontend format.

**Headers**:

- `x-clerk-user-id: [clerk_user_id]`

**Response** (200 OK):

```json
{
    "success": true,
    "data": {
        "theme": "dark",
        "defaultStrategy": "earliest-fit",
        "defaultMinGap": "15",
        "defaultMaxWorkingHours": "8",
        "taskRemindersEnabled": true,
        "leadMinutes": "30",
        "nickname": ""
    },
    "message": "Preferences retrieved successfully"
}
```

### PUT /api/preferences

**Description**: Update user preferences.

**Headers**:

- `Content-Type: application/json`
- `x-clerk-user-id: [clerk_user_id]`

**Request Body** (all fields optional):

```json
{
    "theme": "dark",
    "defaultMinGap": "20",
    "defaultMaxWorkingHours": "10",
    "taskRemindersEnabled": false,
    "leadMinutes": "45",
    "nickname": "Johnny"
}
```

**Response** (200 OK):

```json
{
    "success": true,
    "message": "Preferences updated successfully",
    "data": {
        "theme": "dark",
        "defaultStrategy": "earliest-fit",
        "defaultMinGap": "20",
        "defaultMaxWorkingHours": "10",
        "taskRemindersEnabled": false,
        "leadMinutes": "45",
        "nickname": "Johnny"
    }
}
```

### POST /api/preferences/reset

**Description**: Reset user preferences to default values.

**Headers**:

- `x-clerk-user-id: [clerk_user_id]`

**Response** (200 OK):

```json
{
    "success": true,
    "message": "Preferences reset successfully",
    "data": {
        "theme": "system",
        "defaultStrategy": "earliest-fit",
        "defaultMinGap": "15",
        "defaultMaxWorkingHours": "8",
        "taskRemindersEnabled": true,
        "leadMinutes": "30",
        "nickname": ""
    }
}
```

## Webhook Endpoints

### POST /api/users/webhooks/clerk

**Description**: Handle Clerk webhook events for user lifecycle management.

**Headers**:

- `Content-Type: application/json`

**Request Body**:

```json
{
    "type": "user.created",
    "data": {
        "id": "user_2abc123",
        "email_addresses": [
            {
                "id": "email_123",
                "email_address": "user@example.com"
            }
        ],
        "first_name": "John",
        "last_name": "Doe",
        "profile_image_url": "https://example.com/avatar.jpg"
    }
}
```

**Response** (200 OK):

```json
{
    "success": true
}
```

## Error Responses

### 400 Bad Request

```json
{
    "success": false,
    "message": "Validation failed",
    "errors": [
        /* validation error details */
    ]
}
```

### 401 Unauthorized

```json
{
    "success": false,
    "message": "Authentication required"
}
```

### 404 Not Found

```json
{
    "success": false,
    "message": "User not found"
}
```

### 409 Conflict

```json
{
    "success": false,
    "message": "User already exists",
    "data": {
        "userId": "uuid"
    }
}
```

### 500 Internal Server Error

```json
{
    "success": false,
    "message": "Something went wrong",
    "stack": "Error details..." // Only in development
}
```

## Frontend Integration

### Example usage in your React Native app:

```javascript
// After successful Clerk authentication
const loginToBackend = async (user) => {
    const response = await fetch('/api/users/auth/login', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-clerk-user-id': user.id,
        },
        body: JSON.stringify({
            clerkUserId: user.id,
            email: user.emailAddresses[0].emailAddress,
            displayName: user.fullName,
            avatarUrl: user.imageUrl,
        }),
    });

    const data = await response.json();
    return data;
};

// Get user preferences
const getUserPreferences = async (clerkUserId) => {
    const response = await fetch('/api/preferences', {
        headers: {
            'x-clerk-user-id': clerkUserId,
        },
    });

    const data = await response.json();
    return data.data; // Returns preferences in frontend format
};

// Update preferences
const updatePreferences = async (clerkUserId, preferences) => {
    const response = await fetch('/api/preferences', {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'x-clerk-user-id': clerkUserId,
        },
        body: JSON.stringify(preferences),
    });

    const data = await response.json();
    return data.data;
};
```

## Database Schema

### Users Table

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_user_id TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Preferences Table

```sql
CREATE TABLE preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  ui_mode TEXT NOT NULL DEFAULT 'system',
  notifications_enabled BOOLEAN NOT NULL DEFAULT true,
  lead_minutes INTEGER NOT NULL DEFAULT 30,
  min_gap_minutes INTEGER NOT NULL DEFAULT 15,
  max_work_hours_per_day INTEGER NOT NULL DEFAULT 8,
  weekend_policy TEXT NOT NULL DEFAULT 'allow',
  nickname TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```
