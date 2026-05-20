import { create } from 'zustand'
import type { ChatMessage, ModuleId } from '@/types'

interface AgentStore {
  // Per-module chat histories
  histories: Record<ModuleId, ChatMessage[]>
  addMessage: (module: ModuleId, msg: ChatMessage) => void
  clearHistory: (module: ModuleId) => void
}

export const useAgentStore = create<AgentStore>((set) => ({
  histories: { crm: [], finance: [], ops: [] },

  addMessage: (module, msg) =>
    set((s) => ({
      histories: {
        ...s.histories,
        [module]: [...s.histories[module], msg],
      },
    })),

  clearHistory: (module) =>
    set((s) => ({
      histories: { ...s.histories, [module]: [] },
    })),
}))

// ── Filter store ──────────────────────────────────────────────────────────────
interface FilterStore {
  companies: string[]
  setCompanies: (companies: string[]) => void
}

export const useFilterStore = create<FilterStore>((set) => ({
  companies: [],
  setCompanies: (companies) => set({ companies }),
}))
