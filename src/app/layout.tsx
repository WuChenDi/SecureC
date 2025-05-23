import type { Metadata } from 'next'
import { Inter } from 'next/font/google'

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
  description: 'SecureVault uses ECIES for secure and efficient file encryption and decryption.',
  keywords: [
    'SecureVault',
    'File encryption',
    'File decryption',
    'ECIES',
    'Asymmetric encryption',
    'Large file encryption',
    'Password protection',
    'Blockchain Security'
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
    description: 'SecureVault uses ECIES for secure and efficient file encryption and decryption.',
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
    description: 'SecureVault uses ECIES for secure and efficient file encryption and decryption.',
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
        </Providers>
      </body>
    </html>
  )
}
