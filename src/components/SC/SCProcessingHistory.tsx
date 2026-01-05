'use client'

import type { ColumnDef } from '@tanstack/react-table'
import { getCoreRowModel, useReactTable } from '@tanstack/react-table'
import {
  AlertCircle,
  CheckCircle,
  Download,
  FileText,
  Loader2,
  Lock,
  RefreshCw,
  Trash2,
  Unlock,
  Upload,
} from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { useShallow } from 'zustand/react/shallow'
import { SCResultDialog } from '@/components/SC'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { DataTable } from '@/components/ui/table/data-table'
import {
  downloadFile,
  formatFileSize,
  getFilenameWithoutExtension,
} from '@/lib/utils'
import { useProcessStore } from '@/store/useProcessStore'
import type { ProcessResult } from '@/types'

export function SCProcessingHistory() {
  const { results, removeResult, clearResults } = useProcessStore(
    useShallow((state) => ({
      results: state.processResults,
      removeResult: state.removeResult,
      clearResults: state.clearResults,
    })),
  )

  const [currentResult, setCurrentResult] = useState<ProcessResult | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  const handleResetAll = useCallback(() => {
    clearResults()
    toast.success('All results cleared')
  }, [clearResults])

  const handleDownloadResult = useCallback((result: ProcessResult) => {
    if (result.status !== 'completed') {
      toast.error('Cannot download incomplete result')
      return
    }

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
  }, [])

  const handleViewResult = useCallback((result: ProcessResult) => {
    if (result.status !== 'completed') {
      toast.error('Cannot view incomplete result')
      return
    }
    setCurrentResult(result)
    setIsDialogOpen(true)
  }, [])

  const handleRemoveResult = useCallback(
    (id: string) => {
      removeResult(id)
      toast.success('Result removed')
    },
    [removeResult],
  )

  const columns = useMemo<ColumnDef<ProcessResult>[]>(
    () => [
      {
        accessorKey: 'inputMode',
        header: 'Type',
        cell: ({ getValue }) => {
          const inputMode = getValue<'file' | 'message'>()
          return (
            <Badge variant="outline" className="gap-1">
              {inputMode === 'file' ? (
                <Upload className="size-3" />
              ) : (
                <FileText className="size-3" />
              )}
              {inputMode === 'file' ? 'File' : 'Text'}
            </Badge>
          )
        },
        size: 100,
        enableSorting: false,
      },
      {
        accessorKey: 'mode',
        id: 'action',
        header: 'Action',
        cell: ({ getValue }) => {
          const mode = getValue<'encrypt' | 'decrypt'>()
          return mode === 'encrypt' ? (
            <Badge className="bg-blue-500 gap-1">
              <Lock className="size-3" />
              Encrypted
            </Badge>
          ) : (
            <Badge className="bg-green-500 gap-1">
              <Unlock className="size-3" />
              Decrypted
            </Badge>
          )
        },
        size: 120,
        enableSorting: false,
      },
      {
        id: 'name',
        header: 'Name',
        cell: ({ row }) => (
          <span className="font-medium">
            {row.original.inputMode === 'file' && row.original.fileInfo
              ? row.original.fileInfo.name
              : 'Text Message'}
          </span>
        ),
        enableSorting: false,
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => {
          const { status, progress, stage, error } = row.original

          if (status === 'processing') {
            return (
              <Badge variant="outline" className="gap-1.5 px-2">
                <Loader2 className="size-3.5 animate-spin" />
                <span>Processing</span>
              </Badge>
            )
          }

          if (status === 'failed') {
            return (
              <Badge
                variant="outline"
                className="gap-1.5 px-2 text-red-600 border-red-200 dark:border-red-800"
              >
                <AlertCircle className="size-3.5" />
                <span>Failed</span>
              </Badge>
            )
          }

          return (
            <Badge
              variant="outline"
              className="gap-1.5 px-2 text-green-600 border-green-200 dark:border-green-800"
            >
              <CheckCircle className="size-3.5 fill-green-500 stroke-border dark:fill-green-400" />
              <span>Done</span>
            </Badge>
          )
        },
        size: 120,
        enableSorting: false,
      },
      {
        id: 'progress',
        header: 'Progress',
        cell: ({ row }) => {
          const { status, progress, stage, error } = row.original

          if (status === 'processing') {
            return (
              <div className="space-y-1 min-w-[160px]">
                <Progress value={progress || 0} className="h-1.5" />
                <span className="text-xs text-muted-foreground">
                  {stage || 'Processing...'}
                </span>
              </div>
            )
          }

          if (status === 'failed' && error) {
            return (
              <span
                className="text-xs text-red-500 block max-w-[160px] truncate"
                title={error}
              >
                {error}
              </span>
            )
          }

          return (
            <span className="text-xs text-muted-foreground">
              {status === 'completed' ? 'Completed' : '-'}
            </span>
          )
        },
        size: 180,
        enableSorting: false,
      },
      {
        id: 'size',
        header: 'Size',
        cell: ({ row }) => (
          <span className="text-sm text-gray-500">
            {formatFileSize(
              row.original.fileInfo?.size ?? row.original.data.byteLength,
            )}
          </span>
        ),
        size: 100,
        enableSorting: false,
      },
      {
        accessorKey: 'timestamp',
        header: 'Time',
        cell: ({ getValue }) => (
          <span className="text-sm text-gray-500">{String(getValue())}</span>
        ),
        size: 180,
        enableSorting: false,
      },
      {
        id: 'actions',
        header: () => <div className="text-right">Actions</div>,
        cell: ({ row }) => {
          const result = row.original
          const isProcessing = result.status === 'processing'
          const isFailed = result.status === 'failed'
          const canView =
            result.inputMode === 'message' &&
            result.text &&
            !isProcessing &&
            !isFailed

          return (
            <div className="flex items-center justify-end gap-2">
              {canView && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleViewResult(result)}
                  title="View text"
                >
                  <FileText className="size-4" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDownloadResult(result)}
                title="Download"
                disabled={isProcessing || isFailed}
              >
                <Download className="size-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleRemoveResult(result.id)}
                className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
                title="Delete"
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          )
        },
        size: 200,
        enableSorting: false,
      },
    ],
    [handleDownloadResult, handleRemoveResult, handleViewResult],
  )

  const table = useReactTable({
    data: results,
    columns,
    getCoreRowModel: getCoreRowModel(),
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
  })

  if (results.length === 0) {
    return null
  }

  return (
    <div className="bg-card/50 backdrop-blur-sm border border-gray-200 dark:border-gray-800 rounded-2xl shadow-xl overflow-hidden p-6">
      <div className="flex flex-col space-y-4 h-100">
        <Button variant="outline" onClick={handleResetAll} className="gap-2">
          <RefreshCw className="w-4 h-4" />
          Reset All
        </Button>
        <DataTable table={table} />
      </div>

      <SCResultDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        result={currentResult}
        onDownload={handleDownloadResult}
      />
    </div>
  )
}
