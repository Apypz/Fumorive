import { create } from 'zustand'
import type { RadioStation, RadioStationInfo, RadioTrackInfo } from '../game/systems/RadioSystem'
import { RADIO_STATIONS } from '../game/systems/RadioSystem'

interface RadioStoreState {
  currentStation: RadioStation
  stationInfo: RadioStationInfo
  isVisible: boolean
  currentTrack: RadioTrackInfo | null  // null = no track info (procedural / off)

  setStation: (station: RadioStation) => void
  setCurrentTrack: (track: RadioTrackInfo | null) => void
  showHUD: () => void
  hideHUD: () => void
}

export const useRadioStore = create<RadioStoreState>((set) => ({
  currentStation: 'off',
  stationInfo: RADIO_STATIONS[0],
  isVisible: false,
  currentTrack: null,

  setStation: (station) =>
    set({
      currentStation: station,
      stationInfo: RADIO_STATIONS.find(s => s.id === station) ?? RADIO_STATIONS[0],
    }),

  setCurrentTrack: (track) => set({ currentTrack: track }),

  showHUD: () => set({ isVisible: true }),
  hideHUD: () => set({ isVisible: false }),
}))
