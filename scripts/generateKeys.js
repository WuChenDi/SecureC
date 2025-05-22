import { PrivateKey } from 'eciesjs'

// Generate a new private key
const privateKey = new PrivateKey()

// Derive the public key from the private key
const publicKey = privateKey.publicKey.toHex()

// Output the keys in the format suitable for .env.local
console.log('NEXT_PUBLIC_ECIES_PUBLIC_KEY=' + publicKey)
console.log('ECIES_PRIVATE_KEY=' + privateKey.toHex())
