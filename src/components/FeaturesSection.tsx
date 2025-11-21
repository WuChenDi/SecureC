import { Info, ChevronDown } from 'lucide-react'
import { useState } from 'react'

import { cn } from '@/lib/utils'

export default function FeaturesSection() {
  const [showFeatures, setShowFeatures] = useState(false)

  const features = [
    'Encrypt and decrypt files or text securely with AES-GCM.',
    'Derive secure keys from passwords using Argon2id.',
    'Process large files efficiently with chunked encryption.',
    'Download encrypted or decrypted results with one click.'
  ]

  return (
    <div className="rounded-lg bg-gray-900/40 border border-gray-800/50 backdrop-blur-sm">
      <div
        className="w-full flex items-center justify-between p-4 rounded-lg"
        onClick={() => setShowFeatures(!showFeatures)}
      >
        <div className="flex items-center gap-2.5">
          <Info className="w-4.5 h-4.5 text-blue-400" />
          <span className="text-base font-medium text-gray-200">Features</span>
        </div>
        <ChevronDown
          className={cn(
            'w-4.5 h-4.5 text-gray-400 transition-transform duration-200',
            showFeatures && 'rotate-180'
          )}
        />
      </div>

      {showFeatures && (
        <div className="px-4 pb-4 space-y-3">
          {features.map((feature, index) => (
            <div key={index} className="flex items-start gap-3">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-2 shrink-0" />
              <p className="text-sm text-gray-400 leading-relaxed">
                {feature}
              </p>
            </div>
          ))}

          <div className="pt-3 mt-3 border-t border-gray-800/50">
            <p className="text-xs text-gray-500 text-center">
              All encryption happens locally in your browser
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
