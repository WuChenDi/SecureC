import { Info, ChevronDown } from 'lucide-react'
import { useState } from 'react'

import { cn } from '@/lib/utils'

export default function FeaturesSection() {
  const [showFeatures, setShowFeatures] = useState(false)

  return (
    <div className="rounded-xl p-4 border border-gray-100 dark:border-zinc-800 shadow-lg">
      <div
        className="flex items-center justify-between cursor-pointer"
        onClick={() => setShowFeatures(!showFeatures)}
      >
        <div className="flex items-center gap-3">
          <Info className="w-5 h-5 text-blue-500 dark:text-blue-400" />
          <span className="text-base sm:text-lg font-semibold text-white">Features</span>
        </div>
        <ChevronDown
          className={cn(
            'w-5 h-5 text-gray-600 dark:text-gray-400 transform transition-transform duration-300',
            showFeatures ? 'rotate-180' : ''
          )}
        />
      </div>
      <ul
        className={cn(
          'space-y-4 text-sm sm:text-base transition-all duration-500 ease-in-out overflow-hidden',
          showFeatures ? 'max-h-96 opacity-100 pt-4' : 'max-h-0 opacity-0'
        )}
      >
        <li className="flex items-start gap-3">
          <span className="w-2.5 h-2.5 mt-1.5 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex-shrink-0 animate-pulse-light" />
          <span className="text-gray-700 dark:text-gray-300">Supports encryption/decryption of files and text.</span>
        </li>
        <li className="flex items-start gap-3">
          <span className="w-2.5 h-2.5 mt-1.5 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex-shrink-0 animate-pulse-light" />
          <span className="text-gray-700 dark:text-gray-300">Uses ECIES with secp256k1 curve for asymmetric encryption.</span>
        </li>
        <li className="flex items-start gap-3">
          <span className="w-2.5 h-2.5 mt-1.5 rounded-full bg-gradient-to-br from-pink-500 to-red-500 flex-shrink-0 animate-pulse-light" />
          <span className="text-gray-700 dark:text-gray-300">Processes large files in chunks for better efficiency.</span>
        </li>
        <li className="flex items-start gap-3">
          <span className="w-2.5 h-2.5 mt-1.5 rounded-full bg-gradient-to-br from-blue-400 to-emerald-400 flex-shrink-0 animate-pulse-light" />
          <span className="text-gray-700 dark:text-gray-300">Optional auto-download for encrypted/decrypted results.</span>
        </li>
      </ul>
    </div>
  )
}
