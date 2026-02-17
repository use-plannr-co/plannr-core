/**
 * Semantic Version Utilities
 *
 * Provides robust semantic version comparison for MAJOR.MINOR.PATCH format.
 * Handles missing parts by treating them as 0.
 */

/**
 * Parse a semantic version string into components
 * @param {string} version - Version string like "1.2.3" or "1.1"
 * @returns {object} - { major, minor, patch } with numeric values
 */
export const parseVersion = (version) => {
    if (!version || typeof version !== 'string') {
        return { major: 0, minor: 0, patch: 0 };
    }

    // Remove any leading 'v' prefix
    const cleanVersion = version.replace(/^v/i, '');

    // Split by dots and convert to numbers, defaulting missing parts to 0
    const parts = cleanVersion.split('.').map((part) => {
        const num = parseInt(part, 10);
        return isNaN(num) ? 0 : num;
    });

    return {
        major: parts[0] || 0,
        minor: parts[1] || 0,
        patch: parts[2] || 0,
    };
};

/**
 * Compare two semantic versions
 * @param {string} version1 - First version to compare
 * @param {string} version2 - Second version to compare
 * @returns {number} - Returns -1 if version1 < version2, 0 if equal, 1 if version1 > version2
 */
export const compareVersions = (version1, version2) => {
    const v1 = parseVersion(version1);
    const v2 = parseVersion(version2);

    // Compare major version first
    if (v1.major !== v2.major) {
        return v1.major < v2.major ? -1 : 1;
    }

    // Compare minor version
    if (v1.minor !== v2.minor) {
        return v1.minor < v2.minor ? -1 : 1;
    }

    // Compare patch version
    if (v1.patch !== v2.patch) {
        return v1.patch < v2.patch ? -1 : 1;
    }

    // Versions are equal
    return 0;
};

/**
 * Check if a version meets the minimum requirement
 * @param {string} currentVersion - Current app version
 * @param {string} minVersion - Minimum required version
 * @returns {boolean} - True if currentVersion >= minVersion
 */
export const isVersionValid = (currentVersion, minVersion) => {
    return compareVersions(currentVersion, minVersion) >= 0;
};

/**
 * Unit test examples (inline comments showing expected behavior):
 *
 * compareVersions("1.1.0", "1.1.1") => -1 (1.1.0 < 1.1.1)
 * compareVersions("1.1.1", "1.1.1") => 0 (equal)
 * compareVersions("1.2.0", "1.1.1") => 1 (1.2.0 > 1.1.1)
 * compareVersions("2.0.0", "1.9.9") => 1 (2.0.0 > 1.9.9)
 * compareVersions("1.1", "1.1.0") => 0 (1.1.0 == 1.1.0, missing patch treated as 0)
 * compareVersions("1", "1.0.0") => 0 (1.0.0 == 1.0.0, missing parts treated as 0)
 *
 * isVersionValid("1.1.0", "1.1.1") => false (update required)
 * isVersionValid("1.1.1", "1.1.1") => true (meets minimum)
 * isVersionValid("1.2.0", "1.1.1") => true (exceeds minimum)
 * isVersionValid("2.0.0", "1.1.1") => true (major version ahead)
 */
