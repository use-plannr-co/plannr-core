/**
 * Version Utilities Test Examples
 *
 * This file demonstrates the expected behavior of the version comparison system.
 * Run this file directly to see the test results: node src/utils/versionTests.js
 */

import { parseVersion, compareVersions, isVersionValid } from './versionUtils.js';

// Test cases for version parsing
console.log('=== Version Parsing Tests ===');
console.log('parseVersion("1.2.3"):', parseVersion('1.2.3')); // { major: 1, minor: 2, patch: 3 }
console.log('parseVersion("1.1"):', parseVersion('1.1')); // { major: 1, minor: 1, patch: 0 }
console.log('parseVersion("2"):', parseVersion('2')); // { major: 2, minor: 0, patch: 0 }
console.log('parseVersion("v1.1.1"):', parseVersion('v1.1.1')); // { major: 1, minor: 1, patch: 1 }
console.log('parseVersion(""):', parseVersion('')); // { major: 0, minor: 0, patch: 0 }
console.log('parseVersion(null):', parseVersion(null)); // { major: 0, minor: 0, patch: 0 }

console.log('\n=== Version Comparison Tests ===');
// Test cases for version comparison
console.log('compareVersions("1.1.0", "1.1.1"):', compareVersions('1.1.0', '1.1.1')); // -1 (1.1.0 < 1.1.1)
console.log('compareVersions("1.1.1", "1.1.1"):', compareVersions('1.1.1', '1.1.1')); // 0 (equal)
console.log('compareVersions("1.2.0", "1.1.1"):', compareVersions('1.2.0', '1.1.1')); // 1 (1.2.0 > 1.1.1)
console.log('compareVersions("2.0.0", "1.9.9"):', compareVersions('2.0.0', '1.9.9')); // 1 (2.0.0 > 1.9.9)
console.log('compareVersions("1.1", "1.1.0"):', compareVersions('1.1', '1.1.0')); // 0 (1.1.0 == 1.1.0)
console.log('compareVersions("1", "1.0.0"):', compareVersions('1', '1.0.0')); // 0 (1.0.0 == 1.0.0)
console.log('compareVersions("1.0.1", "1.0"):', compareVersions('1.0.1', '1.0')); // 1 (1.0.1 > 1.0.0)

console.log('\n=== Version Validation Tests (minVersion = "1.1.1") ===');
const minVersion = '1.1.1';
console.log('isVersionValid("1.1.0", "1.1.1"):', isVersionValid('1.1.0', minVersion)); // false (update required)
console.log('isVersionValid("1.1.1", "1.1.1"):', isVersionValid('1.1.1', minVersion)); // true (meets minimum)
console.log('isVersionValid("1.2.0", "1.1.1"):', isVersionValid('1.2.0', minVersion)); // true (exceeds minimum)
console.log('isVersionValid("2.0.0", "1.1.1"):', isVersionValid('2.0.0', minVersion)); // true (major version ahead)
console.log('isVersionValid("1.0.9", "1.1.1"):', isVersionValid('1.0.9', minVersion)); // false (minor version behind)
console.log('isVersionValid("0.9.9", "1.1.1"):', isVersionValid('0.9.9', minVersion)); // false (major version behind)

console.log('\n=== Edge Cases ===');
console.log('isVersionValid("", "1.1.1"):', isVersionValid('', minVersion)); // false (empty version)
console.log('isVersionValid("1", "1.1.1"):', isVersionValid('1', minVersion)); // false (1.0.0 < 1.1.1)
console.log('isVersionValid("1.1", "1.1.1"):', isVersionValid('1.1', minVersion)); // false (1.1.0 < 1.1.1)
console.log('isVersionValid("1.1.1.0", "1.1.1"):', isVersionValid('1.1.1.0', minVersion)); // true (extra parts ignored)

console.log('\n=== Test Results Summary ===');
const testCases = [
    { current: '1.1.0', expected: false, description: 'Should require update (patch behind)' },
    { current: '1.1.1', expected: true, description: 'Should pass (exact match)' },
    { current: '1.2.0', expected: true, description: 'Should pass (minor ahead)' },
    { current: '2.0.0', expected: true, description: 'Should pass (major ahead)' },
    { current: '1.0.9', expected: false, description: 'Should require update (minor behind)' },
    { current: '', expected: false, description: 'Should require update (empty version)' },
];

let passed = 0;
let failed = 0;

testCases.forEach(({ current, expected, description }) => {
    const result = isVersionValid(current, minVersion);
    const status = result === expected ? '✅ PASS' : '❌ FAIL';
    console.log(`${status}: ${description} | ${current} vs ${minVersion} = ${result}`);

    if (result === expected) {
        passed++;
    } else {
        failed++;
    }
});

console.log(`\nTest Results: ${passed} passed, ${failed} failed`);
