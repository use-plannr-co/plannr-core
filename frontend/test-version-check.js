// Quick test to verify version enforcement setup with Alert
// Run with: node test-version-check.js

const Constants = { expoConfig: { version: '1.1.0' } }; // Mock expo-constants
const Platform = { OS: 'ios' }; // Mock Platform

// Mock the version comparison logic
function compareVersions(v1, v2) {
    const parts1 = v1.split('.').map(Number);
    const parts2 = v2.split('.').map(Number);

    for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
        const part1 = parts1[i] || 0;
        const part2 = parts2[i] || 0;

        if (part1 < part2) return -1;
        if (part1 > part2) return 1;
    }

    return 0;
}

// Test scenarios
const currentVersion = Constants.expoConfig.version;
const minimumVersion = '1.1.1';

console.log('🔍 Version Enforcement Test - Native Alert Implementation');
console.log('========================================================');
console.log(`Current App Version: ${currentVersion}`);
console.log(`Minimum Required: ${minimumVersion}`);
console.log(`Platform: ${Platform.OS}`);
console.log('');

const comparison = compareVersions(currentVersion, minimumVersion);
const needsUpdate = comparison < 0;

console.log(`Version Comparison Result: ${comparison}`);
console.log(`Needs Update: ${needsUpdate ? 'YES ⚠️' : 'NO ✅'}`);
console.log('');

if (needsUpdate) {
    console.log('🚨 Expected Behavior:');
    console.log('- Native Alert will appear on app startup');
    console.log('- Alert cannot be dismissed (no cancel button)');
    console.log("- 'Update Now' button opens App Store");
    console.log("- In development: 'Retry Check' button also available");
    console.log('');
    console.log('📱 Alert will show:');
    console.log("  Title: 'Update Required'");
    console.log('  Message: Backend-provided message or default');
    console.log("  Buttons: ['Retry Check'] (dev only), 'Update Now'");
} else {
    console.log('✅ Expected Behavior:');
    console.log('- App will proceed normally');
    console.log('- No alert will be shown');
}

console.log('');
console.log('📱 API Headers that will be sent:');
console.log({
    'X-App-Version': currentVersion,
    'X-Platform': Platform.OS,
    'Content-Type': 'application/json',
});

console.log('');
console.log('🔗 App Store URL that will be used:');
const appStoreUrl =
    Platform.OS === 'ios'
        ? 'https://apps.apple.com/app/plannr/id[YOUR_APP_ID]'
        : 'https://play.google.com/store/apps/details?id=com.sthareja19.Plannr';
console.log(appStoreUrl);

console.log('');
console.log('🎯 To test different scenarios:');
console.log('1. Change app.json version to 1.1.1 or higher');
console.log('2. Or update backend minimum version policy');
console.log('3. Restart app to see different behavior');
console.log('4. Replace [YOUR_APP_ID] with actual App Store ID');
