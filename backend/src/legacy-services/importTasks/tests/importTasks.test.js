import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import EncryptionService from '../services/encryptionService.js';

// Mock environment variable for testing
const originalEnv = process.env.ENCRYPTION_KEY;
const testKey = EncryptionService.generateKey();

describe('EncryptionService', () => {
    beforeEach(() => {
        process.env.ENCRYPTION_KEY = testKey;
    });

    afterEach(() => {
        process.env.ENCRYPTION_KEY = originalEnv;
    });

    describe('constructor', () => {
        it('should initialize with valid base64 key', () => {
            expect(() => new EncryptionService()).not.toThrow();
        });

        it('should throw error when ENCRYPTION_KEY is missing', () => {
            delete process.env.ENCRYPTION_KEY;
            expect(() => new EncryptionService()).toThrow(
                'ENCRYPTION_KEY environment variable is required'
            );
        });

        it('should throw error when key is invalid base64', () => {
            process.env.ENCRYPTION_KEY = 'invalid-base64!@#';
            expect(() => new EncryptionService()).toThrow('Invalid ENCRYPTION_KEY format');
        });

        it('should throw error when key is wrong length', () => {
            process.env.ENCRYPTION_KEY = Buffer.from('short').toString('base64');
            expect(() => new EncryptionService()).toThrow('Encryption key must be 32 bytes');
        });
    });

    describe('encrypt/decrypt', () => {
        let encryptionService;

        beforeEach(() => {
            encryptionService = new EncryptionService();
        });

        it('should encrypt and decrypt text correctly', () => {
            const plaintext = 'Hello, World!';
            const encrypted = encryptionService.encrypt(plaintext);
            const decrypted = encryptionService.decrypt(encrypted);

            expect(decrypted).toBe(plaintext);
        });

        it('should produce different ciphertext for same plaintext', () => {
            const plaintext = 'test message';
            const encrypted1 = encryptionService.encrypt(plaintext);
            const encrypted2 = encryptionService.encrypt(plaintext);

            expect(encrypted1).not.toBe(encrypted2);
        });

        it('should handle empty string', () => {
            const plaintext = '';
            const encrypted = encryptionService.encrypt(plaintext);
            const decrypted = encryptionService.decrypt(encrypted);

            expect(decrypted).toBe(plaintext);
        });

        it('should handle JSON data', () => {
            const plaintext = JSON.stringify({ access_token: 'abc123', expires_in: 3600 });
            const encrypted = encryptionService.encrypt(plaintext);
            const decrypted = encryptionService.decrypt(encrypted);

            expect(JSON.parse(decrypted)).toEqual(JSON.parse(plaintext));
        });

        it('should throw error for non-string plaintext', () => {
            expect(() => encryptionService.encrypt(123)).toThrow(
                'Plaintext must be a non-empty string'
            );
            expect(() => encryptionService.encrypt(null)).toThrow(
                'Plaintext must be a non-empty string'
            );
            expect(() => encryptionService.encrypt(undefined)).toThrow(
                'Plaintext must be a non-empty string'
            );
        });

        it('should throw error for invalid encrypted data', () => {
            expect(() => encryptionService.decrypt('invalid')).toThrow(
                'Invalid encrypted data format'
            );
            expect(() => encryptionService.decrypt('a:b')).toThrow('Invalid encrypted data format');
            expect(() => encryptionService.decrypt(null)).toThrow(
                'Encrypted data must be a non-empty string'
            );
        });

        it('should throw error for tampered ciphertext', () => {
            const plaintext = 'secret message';
            const encrypted = encryptionService.encrypt(plaintext);
            const parts = encrypted.split(':');
            const tamperedEncrypted = parts[0] + ':' + parts[1] + ':' + 'tampered';

            expect(() => encryptionService.decrypt(tamperedEncrypted)).toThrow('Decryption failed');
        });
    });

    describe('generateKey', () => {
        it('should generate valid base64 key of correct length', () => {
            const key = EncryptionService.generateKey();
            const keyBuffer = Buffer.from(key, 'base64');

            expect(keyBuffer.length).toBe(32);
            expect(typeof key).toBe('string');
        });

        it('should generate different keys each time', () => {
            const key1 = EncryptionService.generateKey();
            const key2 = EncryptionService.generateKey();

            expect(key1).not.toBe(key2);
        });
    });
});

describe('Microsoft Mappers', () => {
    describe('mapTaskFromMicrosoft', () => {
        it('should map basic Microsoft task correctly', async () => {
            const { mapTaskFromMicrosoft } = await import('../mappers/microsoftMapper.js');

            const microsoftTask = {
                id: 'task-123',
                title: 'Test Task',
                body: {
                    content: 'This is a test task',
                    contentType: 'text',
                },
                dueDateTime: {
                    dateTime: '2024-01-15T10:00:00.0000000',
                },
                importance: 'high',
                status: 'notStarted',
                categories: ['work', 'important'],
                createdDateTime: '2024-01-01T09:00:00.0000000',
                lastModifiedDateTime: '2024-01-01T09:00:00.0000000',
            };

            const mapped = mapTaskFromMicrosoft(microsoftTask, 'list-123');

            expect(mapped.title).toBe('Test Task');
            expect(mapped.description).toBe('This is a test task');
            expect(mapped.priority).toBe('high');
            expect(mapped.isCompleted).toBe(false);
            expect(mapped.tags).toEqual(['work', 'important']);
            expect(mapped.providerTaskId).toBe('task-123');
            expect(mapped.providerListId).toBe('list-123');
            expect(mapped.estimatedDuration).toBeGreaterThan(0);
        });

        it('should handle completed task', async () => {
            const { mapTaskFromMicrosoft } = await import('../mappers/microsoftMapper.js');

            const microsoftTask = {
                id: 'task-completed',
                title: 'Completed Task',
                status: 'completed',
                completedDateTime: {
                    dateTime: '2024-01-10T15:30:00.0000000',
                },
                importance: 'normal',
            };

            const mapped = mapTaskFromMicrosoft(microsoftTask, 'list-123');

            expect(mapped.isCompleted).toBe(true);
            expect(mapped.completedAt).toEqual(new Date('2024-01-10T15:30:00.0000000'));
            expect(mapped.priority).toBe('medium');
        });
    });
});

// Integration test placeholder (would need actual test database)
describe('ImportService Integration', () => {
    it.skip('should create import session', () => {
        // This would test the full import flow with a test database
        // Skipped for now as it requires database setup
    });
});
