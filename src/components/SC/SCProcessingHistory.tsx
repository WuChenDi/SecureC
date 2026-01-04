'use client'

import {
  Download,
  FileText,
  Lock,
  RefreshCw,
  Trash2,
  Unlock,
  Upload,
} from 'lucide-react'
import { toast } from 'sonner'
import { useShallow } from 'zustand/react/shallow'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  downloadFile,
  formatFileSize,
  getFilenameWithoutExtension,
} from '@/lib/utils'
import { useProcessStore } from '@/store/useProcessStore'
import type { ProcessResult } from '@/types'

interface SCProcessingHistoryProps {
  onViewResult: (result: ProcessResult) => void
}

export function SCProcessingHistory({
  onViewResult,
}: SCProcessingHistoryProps) {
  const { results, removeResult, clearResults } = useProcessStore(
    useShallow((state) => ({
      results: state.processResults,
      removeResult: state.removeResult,
      clearResults: state.clearResults,
    })),
  )

  const handleResetAll = () => {
    clearResults()
    toast.success('All results cleared')
  }

  const handleDownloadResult = (result: ProcessResult) => {
    if (result.inputMode === 'message') {
      const filename =
        result.mode === 'encrypt'
          ? `encrypted_text_${result.timestamp}.enc`
          : `${result.timestamp}.txt`
      downloadFile(result.data, filename)
    } else if (result.fileInfo) {
      if (result.mode === 'encrypt') {
        const nameWithoutExt = getFilenameWithoutExtension(result.fileInfo.name)
        downloadFile(result.data, `${nameWithoutExt}_${result.timestamp}.enc`)
      } else {
        const extension = result.fileInfo.originalExtension || 'bin'
        downloadFile(result.data, `${result.timestamp}.${extension}`)
      }
    }
    toast.success('File downloaded successfully')
  }

  const handleRemoveResult = (id: string) => {
    removeResult(id)
    toast.success('Result removed')
  }

  if (results.length === 0) {
    return null
  }

  return (
    <div className="bg-card/50 backdrop-blur-sm border border-gray-200 dark:border-gray-800 rounded-2xl shadow-xl overflow-hidden">
      <div className="border-b border-gray-200 dark:border-gray-800 px-6 py-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              Processing History
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {results.length} {results.length === 1 ? 'result' : 'results'}
            </p>
          </div>
          <Button variant="outline" onClick={handleResetAll} className="gap-2">
            <RefreshCw className="w-4 h-4" />
            Reset All
          </Button>
        </div>
      </div>

      <div className="p-6">
        <div className="border rounded-lg overflow-hidden bg-card">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">Type</TableHead>
                  <TableHead className="w-[120px]">Action</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead className="w-[120px]">Size</TableHead>
                  <TableHead className="w-[180px]">Timestamp</TableHead>
                  <TableHead className="w-[200px] text-right">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {results.map((result) => (
                  <TableRow key={result.id}>
                    <TableCell>
                      <Badge variant="outline" className="gap-1">
                        {result.inputMode === 'file' ? (
                          <Upload className="w-3 h-3" />
                        ) : (
                          <FileText className="w-3 h-3" />
                        )}
                        {result.inputMode === 'file' ? 'File' : 'Text'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {result.mode === 'encrypt' ? (
                        <Badge className="bg-blue-500 gap-1">
                          <Lock className="w-3 h-3" />
                          Encrypted
                        </Badge>
                      ) : (
                        <Badge className="bg-green-500 gap-1">
                          <Unlock className="w-3 h-3" />
                          Decrypted
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">
                      {result.inputMode === 'file' && result.fileInfo
                        ? result.fileInfo.name
                        : 'Text Message'}
                    </TableCell>
                    <TableCell className="text-sm text-gray-500">
                      {result.fileInfo?.size
                        ? formatFileSize(result.fileInfo.size)
                        : formatFileSize(result.data.byteLength)}
                    </TableCell>
                    <TableCell className="text-sm text-gray-500">
                      {result.timestamp}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {result.inputMode === 'message' && result.text && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onViewResult(result)}
                            title="View text"
                          >
                            <FileText className="w-4 h-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDownloadResult(result)}
                          title="Download"
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveResult(result.id)}
                          className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </div>
  )
}
