import { create } from 'zustand'

export interface Alert {
    id: string
    timestamp: string
    level: 'warning' | 'critical'
    fatigueScore: number
    eegContribution: number
    reason: string
    acknowledged: boolean
}

interface AlertStore {
    alerts: Alert[]
    unreadCount: number
    addAlert: (alert: Omit<Alert, 'id' | 'acknowledged'>) => void
    acknowledgeAlert: (id: string) => void
    clearAlerts: () => void
}

export const useAlertStore = create<AlertStore>((set) => ({
    alerts: [],
    unreadCount: 0,

    addAlert: (alertData) => set((state) => {
        const newAlert: Alert = {
            ...alertData,
            id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            acknowledged: false,
        }

        return {
            alerts: [newAlert, ...state.alerts].slice(0, 50), // Keep last 50 alerts
            unreadCount: state.unreadCount + 1,
        }
    }),

    acknowledgeAlert: (id) => set((state) => ({
        alerts: state.alerts.map(alert =>
            alert.id === id ? { ...alert, acknowledged: true } : alert
        ),
        unreadCount: Math.max(0, state.unreadCount - 1),
    })),

    clearAlerts: () => set({
        alerts: [],
        unreadCount: 0,
    }),
}))
