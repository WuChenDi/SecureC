import type { Metadata } from 'next'
import { Inter } from 'next/font/google'

import '@/app/globals.css'
import { Providers } from '@/components/providers'

const inter = Inter({ subsets: ['latin'] })

// --- SEO Metadata ---
export const metadata: Metadata = {
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <body className={inter.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
