import { GoogleAnalytics } from '@next/third-parties/google'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { Toaster } from 'sonner'

import '@/app/globals.css'
import { Providers } from '@/components/providers'
import Aurora from '@/components/reactbits/Aurora'
import Particles from '@/components/reactbits/Particles'

const inter = Inter({ subsets: ['latin'] })

const BackgroundEffects = () => (
  <>
    <div className="fixed inset-0">
      <Aurora
        colorStops={['#4C00FF', '#97FFF4', '#FF3D9A']}
        blend={3.3}
        amplitude={0.3}
        speed={1.3}
      />
    </div>
    <div className="fixed inset-0">
      <Particles
        particleColors={['#ffffff', '#ffffff']}
        particleCount={400}
        particleSpread={10}
        speed={0.05}
        particleBaseSize={100}
        moveParticlesOnHover={false}
        alphaParticles={false}
        disableRotation={false}
      />
    </div>
  </>
)

// --- SEO Metadata ---
export const metadata: Metadata = {
  title: 'SecureVault',
  icons: 'https://notes-wudi.pages.dev/images/logo.png',
  description: 'SecureVault is a client-side tool for secure file and text encryption/decryption using AES-GCM with Argon2id key derivation.',
  keywords: [
    'SecureVault',
    'File encryption',
    'Text encryption',
    'File decryption',
    'Text decryption',
    'AES-GCM',
    'Argon2id',
    'Client-side encryption',
    'Password protection'
  ],
  referrer: 'no-referrer-when-downgrade',
  authors: [{ name: 'wudi' }],
  robots: { index: true, follow: true },
  metadataBase: new URL('https://secure-vault.pages.dev/'),
  alternates: {
    canonical: '/'
  },
  openGraph: {
    title: 'SecureVault',
    description: 'SecureVault is a client-side tool for secure file and text encryption/decryption using AES-GCM with Argon2id key derivation.',
    url: '/',
    siteName: 'SecureVault',
    images: [
      {
        url: 'https://cdn.jsdelivr.net/gh/cdLab996/picture-lib/wudi/SecureVault/index.png'
      }
    ],
    locale: 'en_US',
    type: 'website'
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SecureVault',
    description: 'SecureVault is a client-side tool for secure file and text encryption/decryption using AES-GCM with Argon2id key derivation.',
    images: ['https://cdn.jsdelivr.net/gh/cdLab996/picture-lib/wudi/SecureVault/index.png'],
    creator: '@wuchendi96'
  }
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <body className={inter.className}>
        <Providers>
          <BackgroundEffects />
          {children}
          <Toaster
            richColors
            position="top-right"
            duration={3000}
          />
        </Providers>
      </body>
      <GoogleAnalytics gaId="G-VECVREEZT1" />
    </html>
  )
}
