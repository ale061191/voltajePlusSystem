import CryptoJS from 'crypto-js';

/**
 * BNC DataCypher — AES encryption/decryption + SHA256 validation
 * Based on the official BNC documentation algorithm:
 * - PBKDF2 with fixed salt bytes ("Ivan Medvedev")
 * - 1000 iterations, SHA1 hasher
 * - AES encryption with UTF-16LE encoding
 */
export class BncCrypto {
    private key: CryptoJS.lib.WordArray;
    private iv: CryptoJS.lib.WordArray;

    constructor(encryptionKey: string) {
        // Fixed salt bytes from BNC documentation: [0x49, 0x76, 0x61, 0x6e, 0x20, 0x4d, 0x65, 0x64, 0x76, 0x65, 0x64, 0x65, 0x76]
        // This spells "Ivan Medvedev" in ASCII
        const saltHex = [0x49, 0x76, 0x61, 0x6e, 0x20, 0x4d, 0x65, 0x64, 0x76, 0x65, 0x64, 0x65, 0x76]
            .map(byte => byte.toString(16).padStart(2, '0'))
            .join('');
        const salt = CryptoJS.enc.Hex.parse(saltHex);

        // Derive key + IV using PBKDF2
        const keyAndIv = CryptoJS.PBKDF2(encryptionKey, salt, {
            keySize: 48 / 4,       // 12 words = 48 bytes total (32 key + 16 IV)
            iterations: 1000,
            hasher: CryptoJS.algo.SHA1
        });

        // First 8 words (32 bytes) = AES Key
        this.key = CryptoJS.lib.WordArray.create(keyAndIv.words.slice(0, 8), 32);
        // Next 4 words (16 bytes) = IV
        this.iv = CryptoJS.lib.WordArray.create(keyAndIv.words.slice(8, 12), 16);
    }

    /**
     * Encrypt a JSON string payload with AES (for the "Value" field)
     */
    encryptAES(text: string): string {
        const textWordArray = CryptoJS.enc.Utf16LE.parse(text);
        const encrypted = CryptoJS.AES.encrypt(textWordArray, this.key, {
            iv: this.iv,
        });
        return encrypted.toString(); // Base64 output
    }

    /**
     * Decrypt an AES-encrypted response (the "value" field from BNC responses)
     */
    decryptAES(ciphertext: string): string {
        const decrypted = CryptoJS.AES.decrypt(ciphertext, this.key, {
            iv: this.iv,
        });
        return decrypted.toString(CryptoJS.enc.Utf16LE);
    }

    /**
     * Generate SHA256 hash of the payload (for the "Validation" field)
     */
    static hashSHA256(text: string): string {
        return CryptoJS.SHA256(text).toString(CryptoJS.enc.Hex);
    }

    /**
     * Build a complete BNC API request body
     */
    buildRequest(clientGUID: string, reference: string, payload: object, testMode: boolean = false): object {
        const payloadJson = JSON.stringify(payload);
        return {
            ClientGUID: clientGUID,
            Reference: reference,
            Value: this.encryptAES(payloadJson),
            Validation: BncCrypto.hashSHA256(payloadJson),
            swTestOperation: testMode
        };
    }

    /**
     * Parse a BNC API response — decrypt the "value" field
     */
    parseResponse(response: { status: string; message: string; value?: string; validation?: string }): {
        ok: boolean;
        code: string;
        message: string;
        data: any;
    } {
        const ok = response.status === 'OK';
        const code = response.message?.substring(0, 6) || '';
        const message = response.message?.substring(6) || '';

        let data = null;
        if (ok && response.value) {
            try {
                const decrypted = this.decryptAES(response.value);
                data = JSON.parse(decrypted);
            } catch (e) {
                data = { raw: response.value, decryptError: (e as Error).message };
            }
        }

        return { ok, code, message, data };
    }
}
