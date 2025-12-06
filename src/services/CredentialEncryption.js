/**
 * Credential Encryption Service
 * Handles secure encryption/decryption of web app credentials
 */

import crypto from 'crypto';

// Encryption configuration
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const SALT_LENGTH = 32;
const KEY_LENGTH = 32;
const ITERATIONS = 100000;

/**
 * Derive encryption key from master key and salt
 */
function deriveKey(masterKey, salt) {
    return crypto.pbkdf2Sync(masterKey, salt, ITERATIONS, KEY_LENGTH, 'sha512');
}

/**
 * Encrypt a string value
 * @param {string} plaintext - Value to encrypt
 * @param {string} masterKey - Master encryption key
 * @returns {string} Encrypted value as base64
 */
export function encrypt(plaintext, masterKey) {
    if (!masterKey) {
        throw new Error('Encryption key is required');
    }

    // Generate random salt and IV
    const salt = crypto.randomBytes(SALT_LENGTH);
    const iv = crypto.randomBytes(IV_LENGTH);

    // Derive key from master key
    const key = deriveKey(masterKey, salt);

    // Encrypt
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    let encrypted = cipher.update(plaintext, 'utf8', 'base64');
    encrypted += cipher.final('base64');

    // Get auth tag
    const authTag = cipher.getAuthTag();

    // Combine salt + iv + authTag + encrypted into single base64 string
    const combined = Buffer.concat([
        salt,
        iv,
        authTag,
        Buffer.from(encrypted, 'base64')
    ]);

    return combined.toString('base64');
}

/**
 * Decrypt an encrypted string value
 * @param {string} encryptedData - Encrypted value as base64
 * @param {string} masterKey - Master encryption key
 * @returns {string} Decrypted plaintext
 */
export function decrypt(encryptedData, masterKey) {
    if (!masterKey) {
        throw new Error('Encryption key is required');
    }

    // Decode combined data
    const combined = Buffer.from(encryptedData, 'base64');

    // Extract components
    const salt = combined.subarray(0, SALT_LENGTH);
    const iv = combined.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
    const authTag = combined.subarray(
        SALT_LENGTH + IV_LENGTH,
        SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH
    );
    const encrypted = combined.subarray(SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH);

    // Derive key from master key
    const key = deriveKey(masterKey, salt);

    // Decrypt
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted);
    decrypted = Buffer.concat([decrypted, decipher.final()]);

    return decrypted.toString('utf8');
}

/**
 * Generate a secure random encryption key
 * @returns {string} Base64 encoded random key
 */
export function generateEncryptionKey() {
    return crypto.randomBytes(KEY_LENGTH).toString('base64');
}

/**
 * Hash a value for secure storage (one-way)
 * @param {string} value - Value to hash
 * @returns {string} Hashed value
 */
export function hashValue(value) {
    return crypto.createHash('sha256').update(value).digest('hex');
}

/**
 * Credential Manager Class
 * Manages encrypted storage of web app credentials
 */
export class CredentialManager {
    constructor(encryptionKey) {
        if (!encryptionKey) {
            throw new Error('Encryption key is required');
        }
        this.encryptionKey = encryptionKey;
    }

    /**
     * Encrypt credentials for storage
     * @param {Object} credentials - { username, password }
     * @returns {Object} Encrypted credentials
     */
    encryptCredentials(credentials) {
        return {
            username_encrypted: encrypt(credentials.username, this.encryptionKey),
            password_encrypted: encrypt(credentials.password, this.encryptionKey)
        };
    }

    /**
     * Decrypt stored credentials
     * @param {Object} encrypted - Encrypted credentials
     * @returns {Object} Decrypted credentials
     */
    decryptCredentials(encrypted) {
        return {
            username: decrypt(encrypted.username_encrypted, this.encryptionKey),
            password: decrypt(encrypted.password_encrypted, this.encryptionKey)
        };
    }

    /**
     * Prepare credentials for Supabase storage
     * Uses Supabase Vault for password storage
     * @param {Object} credentials - { name, url, loginUrl, username, password, notes }
     * @param {Object} supabase - Supabase client
     * @returns {Object} Prepared record for storage
     */
    async prepareForStorage(credentials, supabase) {
        // Encrypt username
        const usernameEncrypted = encrypt(credentials.username, this.encryptionKey);

        // Store password in Supabase Vault
        const { data: vaultData, error: vaultError } = await supabase.rpc('vault.create_secret', {
            secret: credentials.password,
            name: `credential_${Date.now()}_${hashValue(credentials.url).slice(0, 8)}`
        });

        if (vaultError) {
            // Fallback: encrypt password directly if Vault not available
            console.warn('Vault not available, using direct encryption');
            return {
                name: credentials.name,
                url: credentials.url,
                loginUrl: credentials.loginUrl,
                username_encrypted: usernameEncrypted,
                password_vault_id: `encrypted:${encrypt(credentials.password, this.encryptionKey)}`
            };
        }

        return {
            name: credentials.name,
            url: credentials.url,
            loginUrl: credentials.loginUrl,
            username_encrypted: usernameEncrypted,
            password_vault_id: vaultData.id
        };
    }

    /**
     * Retrieve credentials from Supabase storage
     * @param {Object} record - Stored credential record
     * @param {Object} supabase - Supabase client
     * @returns {Object} Decrypted credentials
     */
    async retrieveFromStorage(record, supabase) {
        // Decrypt username
        const username = decrypt(record.username_encrypted, this.encryptionKey);

        // Check if password is in Vault or encrypted directly
        let password;
        if (record.password_vault_id.startsWith('encrypted:')) {
            // Direct encryption fallback
            password = decrypt(
                record.password_vault_id.replace('encrypted:', ''),
                this.encryptionKey
            );
        } else {
            // Retrieve from Vault
            const { data: secret, error } = await supabase.rpc('vault.get_secret', {
                secret_id: record.password_vault_id
            });

            if (error) {
                throw new Error('Failed to retrieve password from Vault');
            }
            password = secret.decrypted_secret;
        }

        return {
            name: record.name,
            url: record.url,
            loginUrl: record.login_url,
            username,
            password
        };
    }
}

/**
 * Create a credential manager instance
 * @param {string} encryptionKey - Master encryption key
 * @returns {CredentialManager}
 */
export function createCredentialManager(encryptionKey) {
    const key = encryptionKey || process.env.ENCRYPTION_KEY;
    if (!key) {
        throw new Error('ENCRYPTION_KEY environment variable is required');
    }
    return new CredentialManager(key);
}

export default CredentialManager;
