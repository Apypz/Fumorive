import { create } from 'zustand'
import { sessionApi } from '../api/session'

interface SessionStoreState {
  sessionId: string
  isBackendSession: boolean
  setSessionId: (id: string) => void
  initializeSession: () => Promise<void>
}

export const useSessionStore = create<SessionStoreState>((set, get) => ({
  sessionId: '',
  isBackendSession: false,

  setSessionId: (id: string) => set({ sessionId: id }),

  initializeSession: async () => {
    // Don't re-create if session already exists
    if (get().sessionId) {
      console.log('✅ Session already exists:', get().sessionId)
      return
    }

    try {
      console.log('📝 Creating new backend session...')
      const session = await sessionApi.create({
        session_name: `Driving Session - ${new Date().toLocaleString()}`,
        device_type: 'EEG + Camera',
      })

      console.log('✅ Backend session created:', session.id)
      set({ sessionId: session.id, isBackendSession: true })
    } catch (error: any) {
      console.error('❌ Failed to create backend session:', error)
      // Fallback to client-generated UUID if backend fails
      const fallbackId = crypto.randomUUID()
      console.warn('⚠️  Using fallback session ID (UUID):', fallbackId)
      set({ sessionId: fallbackId, isBackendSession: false })
    }
  },
}))

