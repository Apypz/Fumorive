# 🧠 Fumorive EEG Server — Panduan Setup

Package ini digunakan untuk mengirimkan data EEG dari headset **Muse 2** ke backend Fumorive secara real-time.

---

## ✅ Persyaratan

- Windows 10 / 11
- Python **3.10** (wajib, versi lain mungkin tidak kompatibel)
- Headset **Muse 2** + Bluetooth aktif
- Koneksi internet

**Download Python 3.10:** https://www.python.org/downloads/release/python-3100/
> Saat install, centang ✅ **"Add Python to PATH"**

---

## 🚀 Cara Penggunaan

### Langkah 1 — Setup (Hanya pertama kali)

Buka **PowerShell** di folder ini, lalu jalankan:

```powershell
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
.\setup_venv.ps1
```

Script ini akan menginstall semua dependensi otomatis.

---

### Langkah 2 — Jalankan EEG Server

Cukup double-click file:

```
start_eeg.bat
```

Server akan:
1. Menyalakan Muse 2 LSL stream
2. Meminta kamu memasukkan **Session ID** dari web Fumorive
3. Mulai mengirim data EEG secara real-time

---

### Langkah 3 — Dapatkan Session ID

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
| `Muse 2 tidak terdeteksi` | Pastikan Bluetooth aktif & Muse 2 dinyalakan |
| `Connection refused` | Pastikan koneksi internet aktif |
| `Session ID invalid` | Salin ulang Session ID dari web Fumorive |

---

## 📦 Verifikasi Koneksi EEG Stream

Untuk mengecek apakah Muse 2 sudah terdeteksi sebelum menjalankan server:

```powershell
.\venv310\Scripts\python.exe check_stream.py
```
