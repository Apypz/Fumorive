import { create } from 'zustand'
import type { RadioStation, RadioStationInfo } from '../game/systems/RadioSystem'
import { RADIO_STATIONS } from '../game/systems/RadioSystem'

interface RadioStoreState {
  currentStation: RadioStation
  stationInfo: RadioStationInfo
  isVisible: boolean  // HUD visibility (auto-hides after a few seconds)

  setStation: (station: RadioStation) => void
  showHUD: () => void
  hideHUD: () => void
}

export const useRadioStore = create<RadioStoreState>((set) => ({
  currentStation: 'off',
  stationInfo: RADIO_STATIONS[0],
  isVisible: false,

  setStation: (station) =>
    set({
      currentStation: station,
      stationInfo: RADIO_STATIONS.find(s => s.id === station) ?? RADIO_STATIONS[0],
    }),

  showHUD: () => set({ isVisible: true }),
  hideHUD: () => set({ isVisible: false }),
}))
