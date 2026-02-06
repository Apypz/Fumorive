/**
 * EEG Module - Barrel Exports
 * 
 * Import all EEG-related components, hooks, and stores from this module
 * for clean and organized imports throughout your application.
 * 
 * Usage Examples:
 * 
 * ┌─ Stores ─────────────────────────────────────────────────────────────
 * │ import { useEEGStore } from '@/modules/eeg'
 * │ 
 * │ const metrics = useEEGStore(state => state.currentMetrics)
 * │ const isConnected = useEEGStore(state => state.isConnected)
 * │ const average = useEEGStore(state => state.getAverageMetrics(2000))
 * 
 * ├─ Hooks ──────────────────────────────────────────────────────────────
 * │ import { useEEGWebSocket } from '@/modules/eeg'
 * │ 
 * │ const { isConnected, connectionError } = useEEGWebSocket({
 * │   sessionId,
 * │   onMetricsReceived: (metrics) => console.log(metrics)
 * │ })
 * 
 * ├─ Components ─────────────────────────────────────────────────────────
 * │ import { 
 * │   EEGDashboard, 
 * │   EEGMetricsDisplay, 
 * │   EEGWaveformDisplay,
 * │   EEGMonitoringPage 
 * │ } from '@/modules/eeg'
 * │ 
 * │ // Main dashboard (all-in-one)
 * │ <EEGDashboard sessionId={sessionId} />
 * │ 
 * │ // Individual components
 * │ <EEGMetricsDisplay />
 * │ <EEGWaveformDisplay channel="AF7" />
 * │ 
 * │ // Full monitoring page
 * │ <EEGMonitoringPage />
 * 
 * ├─ Types ──────────────────────────────────────────────────────────────
 * │ import { EEGMetrics, EEGStreamState } from '@/modules/eeg'
 * │ 
 * │ const handleMetrics = (metrics: EEGMetrics) => {
 * │   // ...
 * │ }
 * 
 * └──────────────────────────────────────────────────────────────────────
 * 
 * 📚 Documentation:
 * - Component Details: frontend/src/components/EEG/README.md
 * - Quick Start: EEG_QUICK_START.md
 * - Setup Guide: EEG_SETUP_GUIDE.md
 * 
 * 🎯 Common Patterns:
 * 
 * 1. Display EEG Dashboard
 *    <EEGDashboard sessionId={sessionId} />
 * 
 * 2. Get Real-time Metrics
 *    const metrics = useEEGStore(s => s.currentMetrics)
 * 
 * 3. Monitor Connection
 *    const { isConnected } = useEEGWebSocket({ sessionId })
 * 
 * 4. React to Cognitive State Changes
 *    <EEGDashboard 
 *      sessionId={sessionId}
 *      onStateChange={(state) => console.log(state)}
 *    />
 * 
 * 5. Get Historical Averages
 *    const avg = useEEGStore(s => s.getAverageMetrics(5000))
 * 
 * ✅ Everything is typed with TypeScript for IDE support!
 */
