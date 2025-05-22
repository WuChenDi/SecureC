# SecureVault

SecureVault is a Next.js-based client-side file encryption/decryption tool designed to provide users with a secure and convenient file encryption service. It utilizes the `eciesjs` library to implement asymmetric encryption (based on the secp256k1 curve's ECIES), supports chunked processing for large files, and ensures efficient and secure operations through Web Workers and server-side APIs.

### Features

- **Support for Any File Type**: Capable of encrypting and decrypting any file type.
- **Asymmetric Encryption**: Uses ECIES (Elliptic Curve Integrated Encryption Scheme) for encryption, with public key encryption and private key decryption.
- **Password Protection**: Requires a user-provided password for encryption and decryption, with the password's SHA-256 hash stored in the encrypted file for verification.
- **Large File Chunking**: Supports splitting large files into chunks (default 5MB) to optimize memory usage and performance.
- **Web Worker**: Encryption operations run in a Web Worker to avoid blocking the main thread, ensuring a smooth UI.
- **Server-Side Decryption**: Decryption is handled via a secure Next.js API route, protecting the private key from client-side exposure.
- **Automatic Download**: Encrypted/decrypted files are automatically downloaded to the user's device.

## Instructions

### Encrypting Files

1. **Select a File**:
   - Click the file upload area or drag and drop a file into the designated area.
   - Supports any file type, with file information (name, size, type) displayed on the interface.
2. **Enter Password**:
   - Input an encryption password in the password field (required).
3. **Click Encrypt**:
   - Click the "Encrypt" button to process the file in chunks and encrypt it using the ECIES public key.
   - The encrypted file (with a `.encrypted` suffix) is automatically downloaded.

### Decrypting Files

1. **Select Encrypted File**:
   - Choose a previously encrypted file (with a `.encrypted` suffix).
2. **Enter Password**:
   - Input the password used during encryption (required).
3. **Click Decrypt**:
   - Click the "Decrypt" button to decrypt the file via the server-side API.
   - If the password is correct, the decrypted original file is automatically downloaded; otherwise, a "Password incorrect" error is displayed.

## Security Considerations

- **Private Key Protection**: The `ECIES_PRIVATE_KEY` is stored server-side (in `.env.local`) and used only in the decryption API, preventing exposure to the client.
- **Password Verification**: Uses SHA-256 hash to verify passwords, which is simple but vulnerable to brute-force attacks. Consider upgrading to a stronger encryption scheme (e.g., combining AES with ECIES).
- **File Chunking**: Chunked processing prevents large files from consuming excessive memory, suitable for handling large files.
- **HTTPS**: Ensure HTTPS is used in production to secure API communications.
- **Key Management**: Regularly rotate ECIES key pairs and use a secure key management system.

## 📜 License

[MIT](./LICENSE) License &copy; 2025-PRESENT [wudi](https://github.com/WuChenDi)
