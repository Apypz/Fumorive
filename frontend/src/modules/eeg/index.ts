// EEG module exports
// Note: some sub-modules are intentionally excluded as they require hardware/local-only setup

export { useEEGStore } from '../../stores/eegStore'
export type { EEGMetrics, EEGStreamState } from '../../stores/eegStore'
export { EEGMetricsDisplay } from '../../components/EEG/EEGMetricsDisplay'
export { EEGWaveformDisplay } from '../../components/EEG/EEGWaveformDisplay'
export { EEGMonitoringPage } from '../../components/page/EEGMonitoringPage'
