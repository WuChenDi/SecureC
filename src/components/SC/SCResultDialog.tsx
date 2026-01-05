'use client'

import { Clipboard, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { copyToClipboard } from '@/lib'
import type { ProcessResult } from '@/types'
import { ModeEnum } from '@/types'

interface SCResultDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  result: ProcessResult | null
  onDownload: (result: ProcessResult) => void
}

export function SCResultDialog({
  open,
  onOpenChange,
  result,
  onDownload,
}: SCResultDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {result?.mode === ModeEnum.ENCRYPT
              ? 'Encrypted Text'
              : 'Decrypted Text'}
          </DialogTitle>
          <DialogDescription>
            {result?.mode === ModeEnum.ENCRYPT
              ? 'Your message has been encrypted successfully'
              : 'Your message has been decrypted successfully'}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-sm font-medium">
                {result?.mode === ModeEnum.ENCRYPT
                  ? 'Encrypted Content'
                  : 'Decrypted Content'}
              </Label>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => result && onDownload(result)}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => result?.text && copyToClipboard(result.text)}
                >
                  <Clipboard className="h-4 w-4 mr-2" />
                  Copy
                </Button>
              </div>
            </div>
            <Textarea
              value={result?.text || ''}
              readOnly
              className="font-mono text-sm min-h-[300px] max-h-[400px]"
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
