import { Progress } from '@/components/ui/progress'

interface ProgressIndicatorProps {
  isProcessing: boolean
  processingStage: string
  processingProgress: number
}

export default function ProgressIndicator({ isProcessing, processingStage, processingProgress }: ProgressIndicatorProps) {
  if (!isProcessing) return null

  return (
    <div className="space-y-3 sm:space-y-4 animate-fadeIn">
      <div className="flex items-center justify-between">
        <div className="text-sm sm:text-base font-semibold text-blue-600 dark:text-blue-400">
          {processingStage || 'Processing...'}
        </div>
        <div className="text-sm font-medium text-gray-600 dark:text-gray-400">
          {Math.round(processingProgress)}%
        </div>
      </div>
      <Progress
        value={processingProgress}
        className="h-2 sm:h-2.5 bg-gray-200 dark:bg-gray-700 rounded-full bg-linear-to-r"
      />
    </div>
  )
}
