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
} from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { useShallow } from 'zustand/react/shallow'
import { SCResultDialog } from '@/components/SC'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Progress } from '@/components/ui/progress'
import { DataTable } from '@/components/ui/table/data-table'
import {
  cn,
  downloadFile,
  formatFileSize,
  getFileIcon,
  getFileTypeLabel,
} from '@/lib'
import { useProcessStore } from '@/store/useProcessStore'
import type { ProcessResult } from '@/types'
import { InputModeEnum, ModeEnum, StatusEnum } from '@/types'

export function SCProcessingHistory() {
  const { results, removeResult, removeResults, clearResults } =
    useProcessStore(
      useShallow((state) => ({
        results: state.processResults,
        removeResult: state.removeResult,
        removeResults: state.removeResults,
        clearResults: state.clearResults,
      })),
    )

  const [currentResult, setCurrentResult] = useState<ProcessResult | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({})

  const selectedResults = useMemo(() => {
    return results.filter((result) => rowSelection[result.id])
  }, [results, rowSelection])

  const selectedCount = selectedResults.length

  const handleResetAll = useCallback(() => {
    clearResults()
    setRowSelection({})
    toast.success('All results cleared')
  }, [clearResults])

  const handleDownloadResult = useCallback((result: ProcessResult) => {
    if (result.status !== StatusEnum.COMPLETED) {
      toast.error('Cannot download incomplete result')
      return
    }

    if (result.inputMode === InputModeEnum.MESSAGE) {
      const filename =
        result.mode === ModeEnum.ENCRYPT
          ? `encrypted_text_${result.timestamp}.enc`
          : `${result.timestamp}.txt`
      downloadFile(result.data, filename)
    } else if (result.fileInfo) {
      downloadFile(result.data, result.fileInfo.name)
    }
    toast.success('File downloaded successfully')
  }, [])

  const handleBatchDownload = useCallback(() => {
    const completedResults = selectedResults.filter(
      (r) => r.status === StatusEnum.COMPLETED,
    )

    if (completedResults.length === 0) {
      toast.error('No completed results to download')
      return
    }

    completedResults.forEach((result) => {
      handleDownloadResult(result)
    })

    toast.success(`Downloaded ${completedResults.length} file(s)`)
    setRowSelection({})
  }, [selectedResults, handleDownloadResult])

  const handleBatchDelete = useCallback(() => {
    const ids = selectedResults.map((r) => r.id)
    removeResults(ids)
    setRowSelection({})
    toast.success(`Removed ${ids.length} result(s)`)
  }, [selectedResults, removeResults])

  const handleViewResult = useCallback((result: ProcessResult) => {
    if (result.status !== StatusEnum.COMPLETED) {
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
        id: 'select',
        header: ({ table }) => (
          <Checkbox
            checked={
              table.getIsAllPageRowsSelected() ||
              (table.getIsSomePageRowsSelected() && 'indeterminate')
            }
            onCheckedChange={(value) =>
              table.toggleAllPageRowsSelected(!!value)
            }
            aria-label="Select all"
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
            aria-label="Select row"
          />
        ),
        size: 50,
        enableSorting: false,
      },
      {
        id: 'name',
        header: 'Name',
        cell: ({ row }) => {
          const result = row.original

          if (result.inputMode === InputModeEnum.MESSAGE) {
            return (
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
                  <FileText className="size-4 text-blue-500" />
                </div>
                <div className="flex flex-col">
                  <span className="font-medium">Text Message</span>
                  <span className="text-xs text-muted-foreground">
                    Plain Text
                  </span>
                </div>
              </div>
            )
          }

          if (result.fileInfo) {
            const config = getFileIcon(
              result.fileInfo.name,
              result.fileInfo.type,
            )
            const label = getFileTypeLabel(result.fileInfo.name)
            const Icon = config.icon

            return (
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    'p-2 rounded-lg',
                    config.bgColor,
                    config.darkBgColor,
                  )}
                >
                  <Icon className={cn('size-4', config.color)} />
                </div>
                <div className="flex flex-col min-w-0">
                  <span
                    className="font-medium truncate max-w-50"
                    title={result.fileInfo.name}
                  >
                    {result.fileInfo.name}
                  </span>
                  <span className="text-xs text-muted-foreground">{label}</span>
                </div>
              </div>
            )
          }

          return <span className="font-medium">Unknown</span>
        },
        enableSorting: false,
      },
      {
        accessorKey: 'mode',
        id: 'action',
        header: 'Action',
        cell: ({ getValue }) => {
          const mode = getValue<'ENCRYPT' | 'DECRYPT'>()

          const config = {
            ENCRYPT: {
              label: 'Encrypt',
              icon: Lock,
              className: 'bg-blue-500 hover:bg-blue-600',
            },
            DECRYPT: {
              label: 'Decrypt',
              icon: Unlock,
              className: 'bg-green-500 hover:bg-green-600',
            },
          }

          const { label, icon: Icon, className } = config[mode]

          return (
            <Badge className={cn('gap-1', className)}>
              <Icon className="size-3" />
              {label}
            </Badge>
          )
        },
        size: 120,
        enableSorting: false,
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => {
          const { status } = row.original

          if (status === StatusEnum.PROCESSING) {
            return (
              <Badge variant="outline" className="gap-1.5 px-2">
                <Loader2 className="size-3.5 animate-spin" />
                <span>Processing</span>
              </Badge>
            )
          }

          if (status === StatusEnum.FAILED) {
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

          if (status === StatusEnum.PROCESSING) {
            return (
              <div className="space-y-1 min-w-40">
                <Progress value={progress || 0} className="h-1.5" />
                <span className="text-xs text-muted-foreground">
                  {stage || 'Processing...'}
                </span>
              </div>
            )
          }

          if (status === StatusEnum.FAILED && error) {
            return (
              <span
                className="text-xs text-red-500 block max-w-40 truncate"
                title={error}
              >
                {error}
              </span>
            )
          }

          return (
            <span className="text-xs text-muted-foreground">
              {status === StatusEnum.COMPLETED ? 'Completed' : '-'}
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
          const isProcessing = result.status === StatusEnum.PROCESSING
          const isFailed = result.status === StatusEnum.FAILED
          const canView =
            result.inputMode === InputModeEnum.MESSAGE &&
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
    state: {
      rowSelection,
    },
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    getRowId: (row) => row.id,
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
        <DataTable table={table}>
          <div className="flex items-center gap-2">
            {selectedCount > 0 && (
              <>
                <Button variant="outline" onClick={handleBatchDownload}>
                  <Download className="size-4" />
                  Download
                </Button>
                <Button variant="destructive" onClick={handleBatchDelete}>
                  <Trash2 className="size-4" />
                  Delete
                </Button>
              </>
            )}
            <Button
              variant="outline"
              onClick={handleResetAll}
              className="ml-auto"
            >
              <RefreshCw className="size-4" />
              Reset All
            </Button>
          </div>
        </DataTable>
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
