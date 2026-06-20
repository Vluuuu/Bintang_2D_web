# Bintang Journey - Prototype v1

Prototype gameplay interaktif 2D pixel-art **Bintang Journey** menggunakan Vite + TypeScript + Phaser. 

## Fitur Utama
1. **Motor Boncengan Terkunci di Tengah**: Motor berada di tengah layar secara horizontal dan menganimasikan rodanya secara dinamis menyesuaikan kecepatan.
2. **Side-Scrolling Progress-Based**: Dunia bergerak ke arah kiri saat pemain maju ke kanan.
3. **Jam Perangkat Lokal**: HUD kanan atas menampilkan jam lokal perangkat secara real-time (misalnya `14:30 WIB`).
4. **Theme Waktu Dinamis**: Latar belakang kota dan landmark otomatis berubah (Day / Sunset / Night) mengikuti jam lokal perangkat.
5. **Transisi Landmark Mulus**: Saat perjalanan mencapai jarak landmark, scene landmark bertema waktu di-fade masuk (durasi 200–350ms) menggantikan background kota secara mulus.
6. **Kontrol Responsif**: Dukungan tombol keyboard untuk Desktop dan tombol sentuh besar yang empuk di bagian bawah layar untuk HP/tablet (mendukung pointer hold).
7. **HUD Interaktif & Toast**: Tampilan lokasi aktif yang dinamis, tombol Mute/Unmute sound, dan prompt interaksi ("Tekan E untuk interaksi") dengan notifikasi toast non-modal.

---

## Struktur Folder Project

```text
src/
  game/
    config/
      route.ts       <-- Konfigurasi urutan dan jarak landmark
      timeTheme.ts   <-- Konfigurasi aturan jam & theme waktu
      assets.ts      <-- Mapping nama & path file asset yang valid
    scenes/
      JourneyScene.ts <-- Logic Phaser utama (movement, render, fading, dll.)
    ui/
      hud.ts         <-- Logic overlay HUD (Clock, Mobile buttons, Toast, dll.)
  main.ts            <-- Bootloader game dan instansiasi HUD
  style.css          <-- Custom styles & pixelated rendering mode
index.html           <-- Wrapper HTML viewport & container HUD
vite.config.ts       <-- Konfigurasi server port & assets base
README.md            <-- Panduan petunjuk penggunaan
```

---

## Asset Yang Digunakan
Semua asset gambar dibaca dari folder `public/assets/` dengan path terverifikasi berikut:
- **Motor**: `public/assets/sprites/vehicle/bike_duo_6frames.png` (frame: 315x234, grid: 2x3).
- **City Loops**:
  - Day: `public/assets/backgrounds/day/bg_city_day_loop.png`
  - Sunset: `public/assets/backgrounds/sunset/bg_city_sunset_loop.png`
  - Night: `public/assets/backgrounds/night/bg_city_night_loop.png`
- **Landmarks**:
  - `upnvj`: `upnvj_day.png`, `upnvj_sunset.png`, `upnvj_night.png` di subfolder masing-masing.
  - `lenteng`: `lenteng_day.png`, `lenteng_sunset.png`, `lenteng_night.png` di subfolder masing-masing.
  - `ps-gacor`: `ps_gacor_day.png`, `ps_gacor_sunset.png`, `ps_gacor_night.png` di subfolder masing-masing.
  - `blok-m`: `blok_m_landmark.png` (day), `blok_m_sunset_landmark.png` (sunset), `blok_m_night_landmark.png` (night) di subfolder masing-masing.

---

## Panduan Kustomisasi

### 1. Cara Mengubah Route Perjalanan
Buka file [route.ts](file:///d:/project/bintang_2d/Bintang_2D_web/src/game/config/route.ts). Anda dapat dengan bebas mengubah urutan, jarak, atau menambahkan landmark baru:
```typescript
export const route = [
  { type: "city", distance: 0 },
  { type: "landmark", id: "upnvj", distance: 1200 },
  { type: "city", distance: 2200 },
  { type: "landmark", id: "lenteng", distance: 3400 },
  ...
];
```
- **Ubah jarak**: Edit nilai `distance` (angka piksel virtual perjalanan).
- **Ubah urutan**: Pindahkan baris array ke posisi yang diinginkan.
- **Nonaktifkan Landmark**: Hapus atau komentari baris landmark dari array `route`.

### 2. Cara Mengubah Batasan Jam (Theme)
Buka file [timeTheme.ts](file:///d:/project/bintang_2d/Bintang_2D_web/src/game/config/timeTheme.ts) untuk mengubah batasan waktu:
```typescript
export const timeRules = [
  { theme: 'day', startHour: 6, endHour: 17 },     // 06:00 - 16:59
  { theme: 'sunset', startHour: 17, endHour: 19 }, // 17:00 - 18:59
  // Jam di luar aturan di atas (19:00 - 05:59) otomatis masuk theme 'night'
];
```

---

## Petunjuk Cara Menjalankan Project

### 1. Cara Menjalankan Secara Lokal (Development)
Jalankan perintah berikut pada terminal Anda:
```bash
# Pastikan berada di folder project
npm install
npm run dev
```
Setelah dev server aktif, buka browser Anda pada alamat `http://localhost:3000`.

### 2. Cara Membangun Produksi (Production Build)
Untuk melakukan compile TypeScript dan build bundle static HTML/CSS/JS:
```bash
npm run build
```
Hasil build yang siap dideploy akan berada di folder `dist/`.

---

## Kontrol Permainan

### Desktop
- **Maju**: Tahan tombol `D` atau `ArrowRight` (Kanan).
- **Mundur/Lambat**: Tahan tombol `A` atau `ArrowLeft` (Kiri).
- **Interaksi**: Tekan tombol `E` atau `Enter` ketika berada dekat landmark.

### Mobile / Touch
- **Maju**: Tahan tombol `▶` di kanan bawah layar.
- **Mundur/Lambat**: Tahan tombol `◀` di kiri bawah layar.
- **Interaksi**: Ketuk prompt overlay `"Tekan E untuk interaksi"` yang muncul di tengah bawah layar ketika dekat landmark.
