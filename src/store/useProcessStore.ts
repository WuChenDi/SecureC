import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import type { ProcessResult } from '@/types'

interface ProcessState {
  processResults: ProcessResult[]
  addResult: (result: ProcessResult) => void
  removeResult: (id: string) => void
  clearResults: () => void
  getResultById: (id: string) => ProcessResult | undefined
}

export const useProcessStore = create<ProcessState>()(
  persist(
    (set, get) => ({
      processResults: [],

      addResult: (result) =>
        set((state) => ({
          processResults: [result, ...state.processResults],
        })),

      removeResult: (id) =>
        set((state) => ({
          processResults: state.processResults.filter((r) => r.id !== id),
        })),

      clearResults: () => set({ processResults: [] }),

      getResultById: (id) => {
        const state = get()
        return state.processResults.find((r) => r.id === id)
      },
    }),
    {
      name: 'process-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        processResults: state.processResults.map((result) => ({
          ...result,
          data: arrayBufferToBase64(result.data),
        })),
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.processResults = state.processResults.map((result: any) => ({
            ...result,
            data: base64ToArrayBuffer(result.data),
          }))
        }
      },
    },
  ),
)

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = atob(base64)
  const bytes = new Uint8Array(binaryString.length)
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i)
  }
  return bytes.buffer
}
