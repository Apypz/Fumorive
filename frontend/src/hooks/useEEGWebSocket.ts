import { useEffect, useRef } from 'react'
import { useEEGStore, type EEGMetrics } from '../stores/eegStore'

interface UseEEGWebSocketProps {
  sessionId: string
  backendUrl?: string
  onMetricsReceived?: (metrics: EEGMetrics) => void
  onAlertReceived?: (alert: any) => void
  onError?: (error: string) => void
  enabled?: boolean
}

export function useEEGWebSocket({
  sessionId,
  backendUrl = 'ws://localhost:8000',
  onMetricsReceived,
  onAlertReceived,
  onError,
  enabled = true,
}: UseEEGWebSocketProps) {
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectAttemptsRef = useRef(0)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const pingTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const addMetrics = useEEGStore((state) => state.addMetrics)
  const setConnected = useEEGStore((state) => state.setConnected)
  const setConnectionError = useEEGStore((state) => state.setConnectionError)

  const MAX_RECONNECT_ATTEMPTS = 10
  const RECONNECT_DELAY_MS = 2000
  const PING_INTERVAL_MS = 30000 // 30 seconds

  const connectWebSocket = () => {
    if (!enabled || !sessionId) return

    try {
      const wsUrl = `${backendUrl.replace('http', 'ws')}/api/v1/ws/session/${sessionId}`
      console.log('[EEG] Connecting to WebSocket:', wsUrl)

      wsRef.current = new WebSocket(wsUrl)

      wsRef.current.onopen = () => {
        console.log('[EEG] WebSocket connected')
        reconnectAttemptsRef.current = 0
        setConnected(true)
        setConnectionError(null)

        // Start ping interval
        setupPingInterval()
      }

      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)

          // Handle different message types
          if (data.type === 'eeg_data') {
            const metrics: EEGMetrics = {
              timestamp: data.timestamp || new Date().toISOString(),
              rawChannels: {
                TP9: data.channels?.TP9 || 0,
                AF7: data.channels?.AF7 || 0,
                AF8: data.channels?.AF8 || 0,
                TP10: data.channels?.TP10 || 0,
              },
              deltapower: data.processed?.delta_power,
              thetaPower: data.processed?.theta_power,
              alphaPower: data.processed?.alpha_power,
              betaPower: data.processed?.beta_power,
              gammaPower: data.processed?.gamma_power,
              thetaAlphaRatio: data.processed?.theta_alpha_ratio,
              betaAlphaRatio: data.processed?.beta_alpha_ratio,
              signalQuality: data.processed?.signal_quality,
              cognitiveState: data.processed?.cognitive_state,
              eegFatigueScore: data.processed?.eeg_fatigue_score,
            }

            addMetrics(metrics)
            onMetricsReceived?.(metrics)
          } else if (data.type === 'status') {
            console.log('[EEG] Status:', data.message)
          } else if (data.type === 'error') {
            const errorMsg = `EEG Stream Error: ${data.message}`
            console.error('[EEG]', errorMsg)
            setConnectionError(errorMsg)
            onError?.(errorMsg)
          } else if (data.type === 'alert') {
            // Handle fatigue alert
            console.log('[EEG] Alert received:', data)
            const alert = {
              timestamp: data.timestamp || new Date().toISOString(),
              level: data.alert_level || 'warning',
              fatigueScore: data.fatigue_score || 0,
              eegContribution: data.eeg_contribution || 1.0,
              reason: data.trigger_reason || 'Fatigue detected',
            }
            onAlertReceived?.(alert)
          }
        } catch (error) {
          const err = error instanceof Error ? error.message : 'Unknown error'
          console.error('[EEG] Failed to parse message:', err, event.data)
        }
      }

      wsRef.current.onerror = (event) => {
        const errorMsg = `WebSocket error: ${event.type}`
        console.error('[EEG]', errorMsg)
        setConnectionError(errorMsg)
        setConnected(false)
        onError?.(errorMsg)
      }

      wsRef.current.onclose = (event) => {
        console.log(`[EEG] WebSocket disconnected (code: ${event.code}, reason: ${event.reason || 'none'})`)
        setConnected(false)
        clearPingInterval()
        attemptReconnect()
      }
    } catch (error) {
      const err = error instanceof Error ? error.message : 'Unknown error'
      const errorMsg = `Connection error: ${err}`
      console.error('[EEG]', errorMsg)
      setConnectionError(errorMsg)
      setConnected(false)
      onError?.(errorMsg)
    }
  }

  const setupPingInterval = () => {
    clearPingInterval()

    pingTimeoutRef.current = setInterval(() => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        try {
          wsRef.current.send(JSON.stringify({ type: 'ping' }))
        } catch (error) {
          console.error('[EEG] Failed to send ping:', error)
        }
      }
    }, PING_INTERVAL_MS)
  }

  const clearPingInterval = () => {
    if (pingTimeoutRef.current) {
      clearInterval(pingTimeoutRef.current)
      pingTimeoutRef.current = null
    }
  }

  const attemptReconnect = () => {
    if (reconnectAttemptsRef.current >= MAX_RECONNECT_ATTEMPTS) {
      const errorMsg = `Max reconnection attempts (${MAX_RECONNECT_ATTEMPTS}) reached`
      console.error('[EEG]', errorMsg)
      setConnectionError(errorMsg)
      onError?.(errorMsg)
      return
    }

    reconnectAttemptsRef.current += 1
    const delay = RECONNECT_DELAY_MS * Math.pow(2, Math.min(reconnectAttemptsRef.current - 1, 4))

    console.log(`[EEG] Reconnecting attempt ${reconnectAttemptsRef.current}/${MAX_RECONNECT_ATTEMPTS} in ${delay}ms`)

    reconnectTimeoutRef.current = setTimeout(() => {
      connectWebSocket()
    }, delay)
  }

  const disconnect = () => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }

    clearPingInterval()

    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }

    setConnected(false)
  }

  // Connect on mount and sessionId change
  useEffect(() => {
    if (enabled && sessionId) {
      connectWebSocket()
    }

    return () => {
      disconnect()
    }
  }, [sessionId, enabled])

  return {
    isConnected: useEEGStore((state) => state.isConnected),
    connectionError: useEEGStore((state) => state.connectionError),
    disconnect,
    reconnect: connectWebSocket,
  }
}
