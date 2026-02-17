# App Version Enforcement - Frontend Implementation

This implementation adds startup version checking and force update functionality to the Plannr React Native app using native OS alerts.

## 📁 Files Created/Updated

### New Files:

1. **`src/utils/apiClient.js`** - Enhanced API client with version headers
2. **`src/context/AppUpdateContext.js`** - Global update state management

### Updated Files:

1. **`App.js`** - Integrated update context and native Alert
2. **`src/utils/authenticatedAPI.js`** - Updated to use new API client with version enforcement

### Removed Files:

1. **`src/components/ForceUpdateModal.jsx`** - Replaced with native Alert implementation

## 🔄 How It Works

### 1. App Startup Flow

```
App Launch → AppUpdateProvider → checkAppCompatibility() → API Call to /api/app/version
    ↓
Version Check Result:
├── ✅ Compatible (1.1.1+) → App continues normally
└── ❌ Incompatible (< 1.1.1) → Native Alert appears
```

### 2. Version Headers

All API requests automatically include:

- `X-App-Version`: "1.1.0" (from app.json via expo-constants)
- `X-Platform`: "ios" (from Platform.OS)

### 3. Force Update Triggers

- **Startup check**: Runs 1 second after app launch
- **API responses**: Any 426 status or "APP_UPDATE_REQUIRED" code triggers alert
- **Global handler**: Registered via global variable to avoid circular dependencies

## 🎯 Current Behavior

With app version `1.1.0` and backend minimum `1.1.1`:

- Native Alert will appear on startup
- Alert cannot be dismissed (no cancel button)
- "Update Now" button opens App Store directly
- In development: "Retry Check" button also available

## 🔧 Configuration

### Backend Requirements:

- Minimum version enforcement middleware active
- `/api/app/version` endpoint responding
- Current minimum: iOS 1.1.1
- App Store URL configured in backend: `https://apps.apple.com/app/plannr/id[YOUR_APP_ID]`

### Frontend Configuration:

- App version: Set in `app.json` → `expo.version`
- Platform detection: Automatic via `Platform.OS`
- Update URL: Provided by backend response or fallback to default

## 🧪 Testing

### Test Scenarios:

1. **Version 1.1.0** (current) → Should trigger native alert
2. **Version 1.1.1** → Should pass
3. **Version 1.2.0** → Should pass
4. **Network offline** → Should allow app to proceed

### Development Tools:

- `__DEV__` flag shows retry button in alert
- Global update handler can be triggered manually
- Context provides `resetUpdateState()` for testing

## 🚨 Error Handling

### Network Failures:

- Startup check fails → App proceeds normally
- API calls fail → No alert triggered

### Invalid Responses:

- Non-JSON responses → Ignored
- Missing update info → Default App Store URL used

### Production Safety:

- No infinite loops (single startup check)
- Graceful degradation on errors
- Alert only appears when explicitly required

## 🔄 API Integration

The `makeAuthenticatedRequest()` function automatically:

1. Adds version headers to all requests
2. Checks responses for update requirements
3. Triggers native alert if needed
4. Maintains existing authentication flow

## 🎨 UI/UX - Native Alert

### Alert Configuration:

- Title: "Update Required"
- Message: Backend-provided or default message
- Cannot be dismissed (`cancelable: false`)
- Native OS styling and accessibility

### Button Configuration:

**Production:**

- "Update Now" button → Opens App Store via `Linking.openURL()`

**Development:**

- "Retry Check" button (cancel style) → Retries version check
- "Update Now" button (default style) → Opens App Store

### Update Flow:

1. User sees native "Update Required" alert
2. Taps "Update Now" button
3. App Store opens automatically
4. User updates and returns to app
5. Version check passes, app proceeds normally

## 🔗 App Store Integration

### URL Configuration:

- **Backend configured**: Uses URL from API response
- **Fallback URLs**:
    - iOS: `https://apps.apple.com/app/plannr/id[YOUR_APP_ID]`
    - Android: `https://play.google.com/store/apps/details?id=com.sthareja19.Plannr`

### Setup Instructions:

1. Replace `[YOUR_APP_ID]` with actual App Store ID in backend config
2. Update Android package ID if needed
3. Test links before production deployment

## 🚀 Deployment Notes

1. **Backend First**: Deploy backend version enforcement before frontend
2. **Version Bump**: Update `app.json` version before App Store submission
3. **App Store ID**: Update backend with actual App Store URL once published
4. **Testing**: Test alert behavior on both iOS and Android
5. **Store URLs**: Verify store links work correctly before release

## 🛠 Implementation Details

### Alert Advantages:

- ✅ Native OS appearance and accessibility
- ✅ Consistent with platform conventions
- ✅ Automatically handles focus and screen readers
- ✅ Cannot be dismissed accidentally
- ✅ No custom styling required
- ✅ Lighter weight than custom modal

### Alert Behavior:

- Appears immediately when update required
- Blocks app usage until action taken
- Automatically handles platform-specific styling
- Supports multiple buttons with different styles
- Integrates seamlessly with `Linking` API
