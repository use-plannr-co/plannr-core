import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 12; // 96 bits for GCM
const TAG_LENGTH = 16; // 128 bits

class EncryptionService {
    constructor() {
        // Get encryption key from environment - should be 32 bytes (256 bits)
        const keyBase64 = process.env.ENCRYPTION_KEY;
        if (!keyBase64) {
            throw new Error('ENCRYPTION_KEY environment variable is required');
        }

        try {
            this.key = Buffer.from(keyBase64, 'base64');
            if (this.key.length !== KEY_LENGTH) {
                throw new Error(
                    `Encryption key must be ${KEY_LENGTH} bytes (${KEY_LENGTH * 8} bits)`
                );
            }
        } catch (error) {
            throw new Error('Invalid ENCRYPTION_KEY format. Must be a valid base64 string.');
        }
    }

    /**
     * Encrypts a plaintext string and returns base64 encoded result
     * Format: iv:tag:ciphertext (all base64 encoded, separated by colons)
     */
    encrypt(plaintext) {
        if (!plaintext || typeof plaintext !== 'string') {
            throw new Error('Plaintext must be a non-empty string');
        }

        const iv = crypto.randomBytes(IV_LENGTH);
        const cipher = crypto.createCipherGCM(ALGORITHM, this.key, iv);

        let ciphertext = cipher.update(plaintext, 'utf8');
        ciphertext = Buffer.concat([ciphertext, cipher.final()]);

        const tag = cipher.getAuthTag();

        // Return format: iv:tag:ciphertext (base64 encoded)
        return `${iv.toString('base64')}:${tag.toString('base64')}:${ciphertext.toString('base64')}`;
    }

    /**
     * Decrypts a string encrypted with encrypt()
     */
    decrypt(encryptedData) {
        if (!encryptedData || typeof encryptedData !== 'string') {
            throw new Error('Encrypted data must be a non-empty string');
        }

        try {
            const parts = encryptedData.split(':');
            if (parts.length !== 3) {
                throw new Error('Invalid encrypted data format');
            }

            const iv = Buffer.from(parts[0], 'base64');
            const tag = Buffer.from(parts[1], 'base64');
            const ciphertext = Buffer.from(parts[2], 'base64');

            const decipher = crypto.createDecipherGCM(ALGORITHM, this.key, iv);
            decipher.setAuthTag(tag);

            let plaintext = decipher.update(ciphertext, null, 'utf8');
            plaintext += decipher.final('utf8');

            return plaintext;
        } catch (error) {
            throw new Error(`Decryption failed: ${error.message}`);
        }
    }

    /**
     * Generate a new base64-encoded encryption key for use in environment variables
     * This is a utility function for setup/deployment
     */
    static generateKey() {
        const key = crypto.randomBytes(KEY_LENGTH);
        return key.toString('base64');
    }
}

export default EncryptionService;
