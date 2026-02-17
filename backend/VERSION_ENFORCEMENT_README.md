# App Version Enforcement System

This system enforces minimum app version requirements for the Plannr mobile app to ensure users are running compatible versions.

## Overview

The version enforcement middleware checks incoming requests for app version headers and compares them against configured minimum versions using semantic version comparison (MAJOR.MINOR.PATCH).

## Files Structure

```
backend/src/
├── config/
│   └── versionPolicy.js          # Version policy configuration
├── middleware/
│   └── enforceMinAppVersion.js   # Main enforcement middleware
├── utils/
│   ├── versionUtils.js           # Semantic version utilities
│   └── versionTests.js           # Test examples and demonstrations
└── server.js                     # Updated to include middleware
```

## Configuration

### Version Policy (`config/versionPolicy.js`)

```javascript
export const VERSION_POLICY = {
    minVersions: {
        ios: '1.1.1',
        android: '1.1.1',
    },
    updateUrls: {
        ios: 'https://apps.apple.com/app/plannr/id123456789',
        android: 'https://play.google.com/store/apps/details?id=com.sthareja19.Plannr',
    },
    exemptRoutes: ['/health', '/metrics', '/api/health', '/api/app/version'],
};
```

## API Usage

### Client Headers

Clients must send these headers with requests:

- `X-App-Version`: App version (e.g., "1.2.0")
- `X-Platform`: Platform name ("ios" or "android")

### Response Codes

#### 400 - Missing Version Header

```json
{
    "code": "APP_VERSION_MISSING",
    "message": "App version required"
}
```

#### 426 - Update Required

```json
{
    "code": "APP_UPDATE_REQUIRED",
    "minVersion": "1.1.1",
    "platform": "ios",
    "updateUrl": "https://apps.apple.com/app/plannr/id123456789",
    "message": "Please update Plannr to continue."
}
```

## Endpoints

### GET /api/app/version

Returns version information for a platform:

```json
{
    "minVersion": "1.1.1",
    "platform": "ios",
    "updateUrl": "https://apps.apple.com/app/plannr/id123456789"
}
```

Query parameter:

- `platform` (optional): Platform to get version info for

## Version Comparison Examples

The system uses robust semantic version comparison:

| Current Version | Min Version | Result             | Reason               |
| --------------- | ----------- | ------------------ | -------------------- |
| 1.1.0           | 1.1.1       | ❌ Update Required | Patch version behind |
| 1.1.1           | 1.1.1       | ✅ Valid           | Exact match          |
| 1.2.0           | 1.1.1       | ✅ Valid           | Minor version ahead  |
| 2.0.0           | 1.1.1       | ✅ Valid           | Major version ahead  |
| 1.0.9           | 1.1.1       | ❌ Update Required | Minor version behind |
| 1.1             | 1.1.1       | ❌ Update Required | 1.1.0 < 1.1.1        |

## Exempt Routes

The following routes skip version enforcement:

- `/health` - Health check endpoint
- `/metrics` - Metrics endpoint
- `/api/health` - API health check
- `/api/app/version` - Version info endpoint

## Testing

Run the test examples:

```bash
node src/utils/versionTests.js
```

This will demonstrate all version comparison scenarios and edge cases.

## Implementation Details

### Middleware Placement

The middleware is applied globally before API routes in `server.js`:

```javascript
// Apply version enforcement middleware globally
app.use(enforceMinAppVersion);

// API Routes (protected by version enforcement)
app.use('/api', apiRoutes);
```

### Error Handling

If the middleware encounters an error, it logs the error but allows the request to proceed to avoid blocking users. This ensures high availability.

### Semantic Versioning

- Missing version parts are treated as 0 (e.g., "1.1" becomes "1.1.0")
- Comparison is done numerically, not as strings
- Supports "v" prefix (e.g., "v1.1.1" is parsed correctly)

## Updating Minimum Versions

To update minimum required versions:

1. Edit `config/versionPolicy.js`
2. Update the `minVersions` object
3. Deploy the backend
4. The change takes effect immediately for new requests

## Frontend Integration

The React Native app should send headers with every API request:

```javascript
// In your API client
const headers = {
    'X-App-Version': '1.2.0', // From app.json or Constants.expoConfig.version
    'X-Platform': Platform.OS, // 'ios' or 'android'
};
```
