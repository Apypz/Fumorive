import { useEffect, useState } from 'react'
import { useAlertStore, type Alert } from '../stores/alertStore'
import './AlertNotification.css'

export function AlertNotification() {
    const alerts = useAlertStore((state) => state.alerts)
    const acknowledgeAlert = useAlertStore((state) => state.acknowledgeAlert)
    const [visibleAlerts, setVisibleAlerts] = useState<Alert[]>([])

    useEffect(() => {
        // Show only unacknowledged alerts
        const unacknowledged = alerts.filter(a => !a.acknowledged).slice(0, 3)
        setVisibleAlerts(unacknowledged)

        // Auto-acknowledge after 10 seconds
        const timers = unacknowledged.map(alert =>
            setTimeout(() => acknowledgeAlert(alert.id), 10000)
        )

        return () => timers.forEach(clearTimeout)
    }, [alerts, acknowledgeAlert])

    if (visibleAlerts.length === 0) return null

    return (
        <div className="alert-notification-container">
            {visibleAlerts.map((alert) => (
                <div
                    key={alert.id}
                    className={`alert-notification alert-${alert.level}`}
                    onClick={() => acknowledgeAlert(alert.id)}
                >
                    <div className="alert-header">
                        <div className="alert-icon">
                            {alert.level === 'critical' ? '🚨' : '⚠️'}
                        </div>
                        <div className="alert-title">
                            {alert.level === 'critical' ? 'CRITICAL FATIGUE' : 'Fatigue Warning'}
                        </div>
                        <button
                            className="alert-close"
                            onClick={(e) => {
                                e.stopPropagation()
                                acknowledgeAlert(alert.id)
                            }}
                        >
                            ×
                        </button>
                    </div>

                    <div className="alert-body">
                        <div className="alert-score">
                            Fatigue Score: <strong>{alert.fatigueScore.toFixed(1)}</strong>
                        </div>
                        <div className="alert-reason">{alert.reason}</div>
                        <div className="alert-time">
                            {new Date(alert.timestamp).toLocaleTimeString()}
                        </div>
                    </div>

                    <div className="alert-progress" />
                </div>
            ))}
        </div>
    )
}
