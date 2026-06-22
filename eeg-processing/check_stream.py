"""Check Muse connectivity via BrainFlow (native BLE)."""
import config
from brainflow.board_shim import (
    BoardShim,
    BrainFlowInputParams,
    BoardIds,
    BrainFlowError,
)

try:
    BoardShim.enable_dev_board_logger()
except BrainFlowError:
    pass

print("Scanning for Muse via BrainFlow (native BLE)...")

found = False
for board_id in config.BOARD_ID_CANDIDATES:
    try:
        name = BoardIds(board_id).name
    except ValueError:
        name = f"BOARD_{board_id}"

    params = BrainFlowInputParams()
    params.timeout = config.STREAM_TIMEOUT
    if config.MUSE_MAC_ADDRESS:
        params.mac_address = config.MUSE_MAC_ADDRESS

    board = BoardShim(board_id, params)
    try:
        board.prepare_session()
        sr = BoardShim.get_sampling_rate(board_id)
        eeg = BoardShim.get_eeg_channels(board_id)
        board.release_session()

        print(f"\n✅ Found {name} (board id {board_id})")
        print(f"   EEG channels: {len(eeg)}")
        print(f"   Rate: {sr} Hz")
        found = True
        break
    except BrainFlowError as exc:
        print(f"   {name} not connected: {exc}")
        try:
            board.release_session()
        except BrainFlowError:
            pass

if not found:
    print("\n❌ No Muse headband found!")
    print("\nPossible issues:")
    print("1. Muse tidak menyala / tidak dalam mode pairing (berkedip)")
    print("2. Bluetooth tidak aktif")
    print("3. Muse sedang dipakai aplikasi lain")
