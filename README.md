# SecureVault

SecureVault is a Next.js-based client-side file encryption/decryption tool designed to provide users with a secure and convenient file encryption service. It utilizes the `eciesjs` library to implement asymmetric encryption (based on the secp256k1 curve's ECIES), supports chunked processing for large files, and ensures efficient and secure operations through Web Workers.

## Link

- Latest: <https://secure-vault.pages.dev/>
- V2: <https://e507d271.secure-vault.pages.dev/>
- V1: <https://57914116.secure-vault.pages.dev/>

## Features

- **Support for Any File Type**: Capable of encrypting and decrypting any file type.
- **Asymmetric Encryption**: Uses ECIES (Elliptic Curve Integrated Encryption Scheme) for encryption, with public key encryption (Base58 encoded) and private key decryption (derived from a mnemonic phrase or provided directly).
- **Large File Chunking**: Supports splitting large files into chunks (default 5MB) to optimize memory usage and performance.
- **Web Worker**: Encryption and decryption operations run in a Web Worker to avoid blocking the main thread, ensuring a smooth UI.
- **Automatic Download**: Encrypted/decrypted files are automatically downloaded to the user's device.
- **Mnemonic Phrase Support**: Allows users to derive private keys from mnemonic phrases for decryption, with an option to generate and copy the private key.

## Instructions

### Encrypting Files

1. **Select a File**:
   - Click the file upload area or drag and drop a file into the designated area.
   - Supports any file type, with file information (name, size, type) displayed on the interface.
2. **Enter Public Key**:
   - Input a Base58-encoded public key (approximately 44-45 characters, decoding to 33 bytes) in the provided field (required).
3. **Click Encrypt**:
   - Click the "Encrypt" button to process the file in chunks and encrypt it using the ECIES public key.
   - The encrypted file (with a `.enc` suffix) is automatically downloaded.

### Decrypting Files

1. **Select Encrypted File**:
   - Choose a previously encrypted file (with a `.enc` suffix).
2. **Enter Mnemonic Phrase or Private Key**:
   - Input the mnemonic phrase (e.g., 12-word phrase) used to derive the private key, or directly input the private key (64 hex characters).
   - Optionally, click "Generate Keys" to derive the private key from the mnemonic phrase and copy it for use.
3. **Click Decrypt**:
   - Click the "Decrypt" button to decrypt the file using the private key.
   - If the private key is correct, the decrypted original file is automatically downloaded; otherwise, a "Decryption failed" error is displayed.

## Security Considerations

- **Client-Side Encryption**: All encryption and decryption operations are performed client-side using Web Workers, ensuring that sensitive data (e.g., private keys) never leaves the user's device.
- **Mnemonic Phrase Security**: Users are responsible for securely storing their mnemonic phrases. Loss of the mnemonic phrase will result in the inability to decrypt files.
- **Public Key Validation**: The tool validates Base58-encoded public keys by decoding and ensuring they are 33 bytes (compressed public key format), preventing invalid key usage.
- **Large File Handling**: Chunked processing prevents large files from consuming excessive memory, making the tool suitable for handling large files.
- **HTTPS**: Ensure HTTPS is used in production to secure file uploads and downloads.
- **Key Management**: Users should securely manage their mnemonic phrases and private keys. Consider using a secure wallet or key management system for long-term storage.
- **Client-Side Risks**: Since operations are client-side, ensure the client environment (e.g., browser) is free from malware or extensions that could access sensitive data like mnemonic phrases or private keys.

## 📜 License

[MIT](./LICENSE) License &copy; 2025-PRESENT [wudi](https://github.com/WuChenDi)
