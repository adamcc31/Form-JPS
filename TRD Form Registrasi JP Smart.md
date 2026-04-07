# TECHNICAL REQUIREMENTS DOCUMENT (TRD) - JPSMART REGISTRATION
* **Project:** JPSmart Registration Form UI/UX & Guided Smart Crop Upgrade
* **Tech Stack:** Next.js (App Router), Tailwind CSS, React-Hook-Form, React-Webcam, Browser-Image-Compression.
* **Backend:** Google Apps Script (`doPost` Endpoint)

## 1. System Architecture & UI/UX Principles
* **State Management:** Menggunakan `react-hook-form` terintegrasi dengan `zod` atau `yup` untuk validasi *schema* tingkat klien.
* **Component Isolation:** Input kondisional (PIC, Input Lainnya) dan modul Kamera harus dipisahkan menjadi komponen *React* independen agar tidak mengganggu performa *rendering* form utama.
* **File Handling:** Menggantikan input `<input type="file">` standar dengan antarmuka **Guided Smart Crop** (Kamera Web + Overlay KTP/Paspor).

## 2. Data Dictionary & Input Specifications

Formulir ini terdiri dari 15 atribut data. Berikut adalah spesifikasi pengikatan (*binding*) dan validasi yang wajib diimplementasikan:

| Field Name | Tipe Input UI | Aturan Validasi / Perilaku (*Behavior*) | Status |
| :--- | :--- | :--- | :--- |
| **Nama Lengkap** | Text Input | Harus dikonversi ke *Uppercase* (Huruf Kapital) secara otomatis (*real-time*). | Wajib |
| **NIK** | Text Input | Murni angka (Regex: `^\d+$`). **Eksak 16 digit**. Tampilkan *error text* merah jika digit kurang/lebih. | Wajib |
| **Nomor Paspor** | Text Input | Format bebas (Alfanumerik). | Opsional |
| **Tanggal Lahir** | Date Picker | Format `YYYY-MM-DD`. | Wajib |
| **Alamat** | Text Area | Multi-baris (minimal 3 baris). | Wajib |
| **Email** | Email Input | Validasi format email standar (`@` dan domain). | Wajib |
| **No WhatsApp** | Tel Input | Murni angka. | Wajib |
| **LPK** | Text Input | Format bebas. | Wajib |
| **Tanggal Berangkat** | Date Picker | Format `YYYY-MM-DD`. | Wajib |
| **Tanggal Aktivasi** | Date Picker | Format `YYYY-MM-DD`. *UI Note:* Tampilkan *helper text* "Tanggal kedatangan di Jepang / tanggal 1 di bulan selanjutnya untuk dapat full kuota free 2 bulan." | Wajib |
| **Pilihan Paket** | Radio Group | Terdiri dari 6 opsi *fixed* (3 Voice+Data, 3 Data Only) harga ¥3300. *UI Note:* Sisipkan Banner Gambar `img/pict-3.png` di atas opsi. | Wajib |
| **Merk & Tipe HP** | Text Input | Format bebas. | Wajib |
| **Sumber Info** | Radio Group | Opsi: Instagram, TikTok, Facebook, Teman/Rekan, Sosialisasi di LPK, Lainnya. | Wajib |
| **PIC** | Radio Group | Opsi: Mba There, Mas Hegar. (Hanya muncul berdasarkan kondisi - lihat sesi 3). | Kondisional |
| **Foto KTP** | Smart Crop UI | Input via Kamera + Kompresi (`maxSizeMB: 0.3`). *UI Note:* Sisipkan Banner Gambar `img/pict-2.jpg`. | Wajib |
| **Foto Paspor** | Smart Crop UI | Input via Kamera + Kompresi (`maxSizeMB: 0.3`). *UI Note:* Sisipkan Banner Gambar `img/pict-1.jpg`. | Opsional |

## 3. Conditional Logic & State Management

Developer wajib mengimplementasikan alur logika (*reactivity*) berikut:

1.  **Logika "Sumber Informasi - Lainnya":**
    * Jika *radio button* "Sumber Informasi" dipilih pada opsi "Lainnya", tampilkan sebuah `<input type="text">`.
    * Nilai dari *text input* ini **harus menimpa** nilai objek "Sumber Informasi" saat *payload* JSON dibuat sebelum dikirim ke *backend*.
2.  **Logika "Sumber Informasi - Sosialisasi di LPK":**
    * Jika *radio button* "Sumber Informasi" bernilai "Sosialisasi di LPK", komponen *Radio Group* **PIC** (Mba There / Mas Hegar) harus di-render (muncul) di DOM dan menjadi *field* Wajib (Required).
    * Jika opsi selain "Sosialisasi di LPK" dipilih, *state* PIC harus di-reset menjadi *null/undefined* dan komponen dihilangkan dari antarmuka.

## 4. Image Processing & Hardware Pipeline

* **Capture Mode:** Tombol *upload* memicu *overlay* kamera. Tidak menggunakan pengunggah *file* bawaan sistem operasi kecuali terjadi *Permission Denied* dari *browser* pengguna.
* **Compression Rules:** Gambar hasil jepretan kanvas wajib dilewatkan ke fungsi kompresi di *client-side* sebelum dirakit menjadi *Base64*.
    * Batas toleransi: `< 350KB`.
    * Resolusi maksimal *Width/Height*: `1024px`.

## 5. Network Request & Payload Schema

Data yang dikirim menggunakan fungsi `fetch()` ke URL Google Apps Script harus dalam format JSON murni. Modifikasi parameter `mode: 'no-cors'` pada HTML lama **harus diganti** menjadi skema CORS yang valid agar status pengiriman dapat dikonfirmasi oleh UI (Success/Error Screen).

Struktur *Payload JSON* eksak yang harus dihasilkan oleh *Frontend Component*:

```json
{
  "Nama Lengkap": "ADAM",
  "NIK": "1234567890123456",
  "Nomor Paspor": "X1234567",
  "Tanggal Lahir": "1990-01-01",
  "Alamat": "Jl. Merdeka No. 17, Jakarta",
  "Email": "adam@contoh.com",
  "No WhatsApp": "08123456789",
  "LPK": "LPK Mandiri",
  "Tanggal Keberangkatan": "2026-05-01",
  "Tanggal Aktivasi": "2026-05-01",
  "Pilihan Paket": "20 GB Call Sim - Sinyal 5G (¥2.178/bulan)",
  "Merk HP": "Samsung / A10",
  "Sumber Informasi": "Sosialisasi di LPK", 
  "PIC": "Mas Hegar", 
  "Foto KTP": {
    "fileName": "ktp_capture.jpg",
    "mimeType": "image/jpeg",
    "data": "[BASE-64 STRING WITHOUT MIME-PREFIX]"
  },
  "Foto Paspor": {
    "fileName": "paspor_capture.jpg",
    "mimeType": "image/jpeg",
    "data": "[BASE-64 STRING WITHOUT MIME-PREFIX]"
  }
}
```
*(Catatan Payload: Kunci/Key JSON disesuaikan dengan `name` attribute dari HTML eksisting agar kompatibel dengan baris kode backend GAS `formData.forEach` sebelumnya, jika data langsung di-mapping ke Google Sheet. "Sumber Informasi" akan berisi nilai string custom jika pengguna memilih "Lainnya").*