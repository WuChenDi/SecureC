# SecureVault

SecureVault is a Next.js-based client-side encryption tool designed to securely encrypt and decrypt files and text messages using AES-GCM symmetric encryption. It leverages the `@noble/ciphers` library for encryption and Argon2id for secure password-based key derivation, supports chunked processing for large files, and ensures smooth performance with Web Workers.

## Link

- Latest: <https://secure-vault.pages.dev/>
- V2: <https://e507d271.secure-vault.pages.dev/>
- V1: <https://57914116.secure-vault.pages.dev/>

## Features

- **File and Text Encryption**: Encrypt and decrypt any file type or text messages using AES-GCM.
- **Password-Based Security**: Securely derive encryption keys from passwords using Argon2id with random salts.
- **Large File Chunking**: Process large files in 5MB chunks to optimize memory usage and performance.
- **Web Worker Performance**: Run encryption and decryption in a Web Worker to keep the UI responsive.
- **Manual Download**: Download encrypted (`.enc`) or decrypted files with one click, with timestamped filenames.
- **Progress Feedback**: Real-time progress updates during encryption/decryption for a better user experience.
- **Client-Side Privacy**: All operations are performed locally, ensuring data never leaves your device.

## Instructions

### Encrypting Files or Text

1. **Select Mode**:
   - Choose **File** mode to upload a file or **Messages** mode to input text.
   - For files, click the upload area or drag and drop a file (any type supported). File details (name, size, type) will be displayed.
   - For text, enter the message in the provided textarea.
2. **Enter Password**:
   - Input a secure password in the password field (required).
3. **Click Encrypt**:
   - Click the "Encrypt" button to process the file or text using AES-GCM encryption.
   - Files are processed in chunks; text is encrypted as a single block and output as Base64.
   - After processing, click the "Download" button to save the encrypted file (`.enc` suffix) or view the encrypted text in a dialog (with copy/download options).

### Decrypting Files or Text

1. **Select Mode**:
   - Choose **File** mode for encrypted files (`.enc`) or **Messages** mode for encrypted text (Base64).
   - For files, upload the `.enc` file. For text, paste the Base64-encoded encrypted text.
2. **Enter Password**:
   - Input the same password used for encryption.
3. **Click Decrypt**:
   - Click the "Decrypt" button to decrypt the file or text.
   - If the password is correct, the decrypted file is available for download (with original extension if available), or the decrypted text is shown in a dialog.
   - If the password is incorrect, a "Decryption failed" error is displayed.

## Security Considerations

- **Client-Side Encryption**: All operations are performed locally using Web Workers, ensuring sensitive data (e.g., passwords, files) never leaves your device.
- **Password Security**: Use strong, unique passwords and store them securely. A lost password will prevent decryption of files or text.
- **Large File Handling**: Chunked processing ensures efficient handling of large files without excessive memory usage.
- **Random Salts and IVs**: Each encryption uses a random salt (for Argon2id) and IV (for AES-GCM) to enhance security.
- **HTTPS**: Deploy SecureVault over HTTPS in production to secure file uploads and downloads.
- **Client-Side Risks**: Ensure your browser is free from malware or extensions that could access sensitive data like passwords or files.
- **No Server Storage**: Since all processing is client-side, no data is stored on servers, but users must manage their own backups of encrypted files.

## 📜 License

[MIT](./LICENSE) License © 2025-PRESENT [wudi](https://github.com/WuChenDi)
