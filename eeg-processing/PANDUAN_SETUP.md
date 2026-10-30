# 🧠 Fumorive EEG Server — Panduan Setup

Package ini digunakan untuk mengirimkan data EEG dari headband **Muse S (Athena)** atau **Muse 2** ke backend Fumorive secara real-time.

> Koneksi ke Muse kini memakai **BrainFlow** (native Bluetooth Windows). Kamu **tidak perlu lagi** menjalankan `muselsl stream` di terminal terpisah — server akan memindai & terhubung ke Muse secara otomatis.

---

## ✅ Persyaratan

- Windows 10 / 11
- Python **3.8 – 3.12** (disarankan 3.10 atau 3.11)
- Headband **Muse S (Athena)** atau **Muse 2** + Bluetooth aktif
- Koneksi internet

**Download Python:** https://www.python.org/downloads/
> Saat install, centang ✅ **"Add Python to PATH"**

---

## 🚀 Cara Penggunaan

### Langkah 1 — Setup (Hanya pertama kali)

Buka **PowerShell** di folder ini, lalu jalankan:

```powershell
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
.\setup_venv.ps1
```

Script ini akan membuat virtual environment dan menginstall semua dependensi (termasuk **BrainFlow**) secara otomatis.

---

### Langkah 2 — Nyalakan Muse

1. Nyalakan headband Muse.
2. Pastikan lampu indikator **berkedip** (mode pairing / belum terhubung ke perangkat lain).
3. Pastikan **Bluetooth** di laptop sudah aktif.

> Tidak perlu mem-pair Muse secara manual lewat Settings Windows — BrainFlow akan menemukannya langsung.

---

### Langkah 3 — Jalankan EEG Server

Cukup double-click file:

```
start_eeg.bat
```

Server akan:
1. Memindai & terhubung otomatis ke Muse via Bluetooth (BrainFlow)
2. Meminta kamu memasukkan **Session ID** dari web Fumorive
3. Mulai mengirim data EEG secara real-time

Saat berhasil, terminal akan menampilkan log seperti:

```
[SUCCESS] Connected to MUSE_S_ATHENA_BOARD (Board 67)
          Sampling rate : 256.0 Hz
```

---

### Langkah 4 — Dapatkan Session ID

1. Buka [fumorive.app](https://fumorive.app)
2. Login dengan akun kamu
3. Klik **"Mulai Sesi Baru"**
4. Salin **Session ID** yang muncul
5. Paste ke terminal EEG Server

---

## ❓ Troubleshooting

| Masalah | Solusi |
|---------|--------|
| `venv tidak ditemukan` | Jalankan `setup_venv.ps1` terlebih dahulu |
| `No Muse headband found` | Pastikan Muse menyala & lampu **berkedip**, Bluetooth aktif, dan Muse tidak sedang dipakai aplikasi lain (mis. Muse app di HP) |
| Koneksi lambat / gagal pertama kali | Matikan lalu nyalakan ulang Muse, jalankan ulang `start_eeg.bat` |
| `Connection refused` | Pastikan koneksi internet aktif |
| `Session ID invalid` | Salin ulang Session ID dari web Fumorive |

---

## 📦 Verifikasi Koneksi Muse

Untuk mengecek apakah Muse sudah bisa terdeteksi sebelum menjalankan server:

```powershell
.\venv310\Scripts\python.exe check_stream.py
```

Jika berhasil akan muncul, misalnya:

```
✅ Found MUSE_S_ATHENA_BOARD (board id 67)
   EEG channels: 4
   Rate: 256 Hz
```
