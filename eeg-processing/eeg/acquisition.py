"""
acquisition.py
================
Module for EEG data acquisition from Muse 2 / Muse S (Athena) via BrainFlow.
Purpose : Acquire real-time EEG data for simulator-based cognitive analysis.

Migrasi: sebelumnya menggunakan muselsl + LSL (pylsl). Kini memakai BrainFlow
yang berbicara langsung ke Muse melalui native BLE Windows, tanpa perlu
menjalankan `muselsl stream` di terminal terpisah.

Kontrak publik kelas ini SAMA PERSIS dengan versi LSL sebelumnya, sehingga
modul preprocessing / feature extraction / server tidak perlu diubah:
    - connect()                  -> menyiapkan & memulai streaming
    - pull_chunk(duration)       -> (data[samples, channels], timestamps[samples])
    - get_latest_sample()        -> (sample[channels], timestamp)
    - close()                    -> melepas koneksi
    - .sampling_rate, .channel_labels
"""

import time
import numpy as np
from typing import List, Tuple, Optional

from brainflow.board_shim import (
    BoardShim,
    BrainFlowInputParams,
    BoardIds,
    BrainFlowError,
)

import config


class EEGAcquisition:
    """
    EEG Acquisition handler using BrainFlow (native BLE).
    """

    def __init__(
        self,
        stream_type: str = "EEG",
        timeout: int = config.STREAM_TIMEOUT,
        max_chunklen: int = config.MAX_CHUNK_LENGTH,
        board_id_candidates: Optional[List[int]] = None,
        mac_address: str = config.MUSE_MAC_ADDRESS,
    ):
        """
        Initialize EEG acquisition.

        Parameters
        ----------
        stream_type : str
            Dipertahankan untuk kompatibilitas API (tidak dipakai BrainFlow).
        timeout : int
            Waktu (detik) untuk proses discovery/koneksi BLE.
        max_chunklen : int
            Dipertahankan untuk kompatibilitas API.
        board_id_candidates : list[int], optional
            Urutan BrainFlow board id yang dicoba saat auto-deteksi.
            Default mengikuti config.BOARD_ID_CANDIDATES (Muse S Athena,
            Muse S, lalu Muse 2).
        mac_address : str
            MAC address Muse. Kosong = auto-discover via native BLE.
        """
        self.stream_type = stream_type
        self.timeout = timeout
        self.max_chunklen = max_chunklen
        self.board_id_candidates = (
            list(board_id_candidates)
            if board_id_candidates is not None
            else list(config.BOARD_ID_CANDIDATES)
        )
        self.mac_address = mac_address

        self.board: Optional[BoardShim] = None
        self.board_id: Optional[int] = None
        self.eeg_channels: List[int] = []
        self.timestamp_channel: Optional[int] = None

        self.channel_labels: List[str] = []
        self.sampling_rate: Optional[float] = None

    # ------------------------------------------------------------------ #
    # Connection
    # ------------------------------------------------------------------ #
    @staticmethod
    def _board_name(board_id: int) -> str:
        try:
            return BoardIds(board_id).name
        except ValueError:
            return f"BOARD_{board_id}"

    def connect(self) -> None:
        """
        Discover, connect, and start streaming from a Muse headband.

        Mencoba setiap board id pada `board_id_candidates` secara berurutan
        dan memakai yang pertama berhasil terhubung. Untuk Muse S (Athena)
        pastikan perangkat dalam keadaan menyala / berkedip (belum dipair
        ke Windows) agar bisa ditemukan native BLE.
        """
        # BrainFlow internal logger -> bantu diagnosa koneksi BLE.
        try:
            BoardShim.enable_dev_board_logger()
        except BrainFlowError:
            pass

        print("[INFO] Scanning for Muse via BrainFlow (native BLE)...")
        print(f"[DEBUG] BLE discovery timeout: {self.timeout}s")

        last_error: Optional[Exception] = None

        for board_id in self.board_id_candidates:
            name = self._board_name(board_id)
            print(f"[DEBUG] Trying {name} (board id {board_id})...")

            params = BrainFlowInputParams()
            params.timeout = self.timeout
            if self.mac_address:
                params.mac_address = self.mac_address
            other_info = config.BOARD_OTHER_INFO.get(board_id)
            if other_info:
                params.other_info = other_info

            board = BoardShim(board_id, params)
            try:
                board.prepare_session()
                board.start_stream()
            except BrainFlowError as exc:
                print(f"[DEBUG] {name} not connected: {exc}")
                last_error = exc
                try:
                    board.release_session()
                except BrainFlowError:
                    pass
                continue

            # Berhasil terhubung.
            self.board = board
            self.board_id = board_id
            self.sampling_rate = float(BoardShim.get_sampling_rate(board_id))
            self.eeg_channels = BoardShim.get_eeg_channels(board_id)
            self.timestamp_channel = BoardShim.get_timestamp_channel(board_id)

            try:
                self.channel_labels = list(BoardShim.get_eeg_names(board_id))
            except BrainFlowError:
                self.channel_labels = config.CHANNEL_LABELS[: len(self.eeg_channels)]

            # Beri waktu ringbuffer terisi sebelum pull pertama.
            time.sleep(1.0)

            print(f"[SUCCESS] Connected to {name} (Board {board_id})")
            print(f"          Sampling rate : {self.sampling_rate} Hz")
            print(f"          EEG channels  : {self.channel_labels}")
            return

        raise RuntimeError(
            "No Muse headband found via BrainFlow. "
            "Pastikan Muse menyala/berkedip, Bluetooth aktif, dan perangkat "
            "tidak sedang dipakai aplikasi lain. "
            f"(last error: {last_error})"
        )

    # ------------------------------------------------------------------ #
    # Data pulling
    # ------------------------------------------------------------------ #
    def _format(self, raw: np.ndarray) -> Tuple[np.ndarray, np.ndarray]:
        """
        Konversi array BrainFlow (rows=channels, cols=samples) menjadi
        format yang dipakai pipeline: data (samples, channels) + timestamps.
        """
        if raw.size == 0:
            return np.empty((0, 0)), np.empty((0,))

        # raw shape: (num_rows, num_samples). Ambil baris EEG, transpose.
        data = raw[self.eeg_channels, :].T  # -> (samples, channels)

        if self.timestamp_channel is not None:
            timestamps = raw[self.timestamp_channel, :]
        else:
            timestamps = np.arange(data.shape[0], dtype=float)

        return np.ascontiguousarray(data), np.ascontiguousarray(timestamps)

    def pull_chunk(self, duration: float = 1.0) -> Tuple[np.ndarray, np.ndarray]:
        """
        Pull EEG data for a specific duration.

        Parameters
        ----------
        duration : float
            Duration in seconds.

        Returns
        -------
        data : np.ndarray
            EEG data array with shape (samples, channels).
        timestamps : np.ndarray
            Corresponding timestamps (samples,).
        """
        if self.board is None:
            raise RuntimeError("EEG stream not connected. Call connect() first.")

        # Akumulasi data dari ringbuffer internal BrainFlow selama `duration`.
        # get_board_data() mengosongkan buffer setiap dipanggil, jadi kita
        # cukup tidur selama durasi lalu menarik seluruh sampel yang masuk.
        time.sleep(max(0.0, duration))
        raw = self.board.get_board_data()  # (rows, samples), pops the buffer

        return self._format(raw)

    def get_latest_sample(self) -> Tuple[np.ndarray, float]:
        """
        Pull a single (most recent) EEG sample.

        Returns
        -------
        sample : np.ndarray
            EEG sample (channels,).
        timestamp : float
            Sample timestamp.
        """
        if self.board is None:
            raise RuntimeError("EEG stream not connected. Call connect() first.")

        # Intip 1 sampel terbaru tanpa mengosongkan buffer.
        raw = self.board.get_current_board_data(1)
        if raw.size == 0:
            raise RuntimeError("Failed to retrieve EEG sample.")

        sample = raw[self.eeg_channels, -1]
        if self.timestamp_channel is not None:
            timestamp = float(raw[self.timestamp_channel, -1])
        else:
            timestamp = time.time()

        return np.array(sample), timestamp

    # ------------------------------------------------------------------ #
    # Teardown
    # ------------------------------------------------------------------ #
    def close(self) -> None:
        """
        Safely stop streaming and release the BrainFlow session.
        """
        print("[INFO] Closing EEG stream...")
        if self.board is not None:
            try:
                if self.board.is_prepared():
                    self.board.stop_stream()
                    self.board.release_session()
            except BrainFlowError as exc:
                print(f"[WARN] Error while closing BrainFlow session: {exc}")
            finally:
                self.board = None
