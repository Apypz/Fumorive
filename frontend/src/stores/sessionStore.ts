import { create } from 'zustand'

interface SessionStoreState {
  sessionId: string
  setSessionId: (id: string) => void
  initializeSession: () => void
}

export const useSessionStore = create<SessionStoreState>((set) => ({
  sessionId: '',

  setSessionId: (id: string) => set({ sessionId: id }),

  initializeSession: () => {
    set((state) => ({
      sessionId: state.sessionId || `session_${Date.now()}_${Math.random().toString(36).substring(7)}`,
    }))
  },
}))
