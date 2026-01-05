import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ProcessResult } from '@/types'

interface ProcessStore {
  processResults: ProcessResult[]
  addResult: (result: ProcessResult) => void
  updateResult: (id: string, updates: Partial<ProcessResult>) => void
  removeResult: (id: string) => void
  clearResults: () => void
}

export const useProcessStore = create<ProcessStore>()(
  persist(
    (set) => ({
      processResults: [],

      addResult: (result) =>
        set((state) => ({
          processResults: [result, ...state.processResults],
        })),

      updateResult: (id, updates) =>
        set((state) => ({
          processResults: state.processResults.map((result) =>
            result.id === id ? { ...result, ...updates } : result,
          ),
        })),

      removeResult: (id) =>
        set((state) => ({
          processResults: state.processResults.filter((r) => r.id !== id),
        })),

      clearResults: () => set({ processResults: [] }),
    }),
    {
      name: 'process-storage',
      // 过滤掉处理中的任务，不持久化
      partialize: (state) => ({
        processResults: state.processResults.filter(
          (r) => r.status !== 'processing',
        ),
      }),
    },
  ),
)
