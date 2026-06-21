# Seam Audit — Bintang Journey backgrounds

Audit visual sambungan (seam) antar full-scene background. Hanya audit + preview.
Tidak ada perubahan asset asli, kode gameplay, atau sistem segment.

## Asset diaudit (semua 1672×941, seragam)

City loop:
- `public/assets/backgrounds/day/bg_city_day_loop.png`
- `public/assets/backgrounds/sunset/bg_city_sunset_loop.png`
- `public/assets/backgrounds/night/bg_city_night_loop.png`

Landmark day:
- `day/upnvj_day.png`, `day/lenteng_day.png`, `day/ps_gacor_day.png`, `day/blok_m_landmark.png`

Landmark sunset:
- `sunset/upnvj_sunset.png`, `sunset/lenteng_sunset.png`, `sunset/ps_gacor_sunset.png`, `sunset/blok_m_sunset_landmark.png`

Landmark night:
- `night/upnvj_night.png`, `night/lenteng_night.png`, `night/ps_gacor_night.png`, `night/blok_m_night_landmark.png`

Celestial (bukan seam, dicatat): `day/sun.png` (120×119), `night/moon.png` (166×166).

Catatan file lain di folder (tidak dipakai pasangan seam): `public/assets/backgrounds/ps_gacor_night.png` (duplikat di root, di luar struktur theme).

## Preview dibuat (27 file) di art/workbench/seam-previews/

Pola `theme__kiri__kanan.png`, garis seam merah di titik sambung, label nama asset di atas.

Per theme (day, sunset, night), 9 pasang:
city|city, city|upnvj, upnvj|city, city|lenteng, lenteng|city,
city|ps_gacor, ps_gacor|city, city|blok_m, blok_m|city.

Generator: `gen.html` (Chrome canvas; ImageMagick tidak tersedia, `convert` = Windows convert.exe).

## Audit teknis

1. **Jalan/marka sejajar di seam** — YA. Semua asset memakai template ground (aspal + marka + trotoar) di tinggi Y yang sama. Marka putus-putus lanjut wajar antar gambar.
2. **Horizon & skyline selevel** — Horizon/garis aspal: YA selevel. Skyline gedung: tinggi gedung beda-beda (wajar, beda bangunan) tapi base gedung selevel.
3. **Rumput, tanah, trotoar, pagar tersambung** — Rumput/tanah/trotoar: YA, sambung rata di semua seam. Pagar pembatas jalan: lanjut konsisten.
4. **Gedung utama menyentuh sisi kiri/kanan asset** — `blok_m` (gedung utama besar) mepet ke sisi kanan asset → saat masuk/keluar terlihat agak mendadak. Landmark lain (upnvj/lenteng/ps_gacor) gedung utama lebih ke tengah, tepi relatif kosong → masuk/keluar lebih halus.
5. **City loop loopable kiri↔kanan** — Ground/road/horizon: YA loopable. **Pengecualian sunset**: matahari ter-bake di gambar city → pada loop city|city muncul DUA matahari.

## Prioritas temuan

### P0 — potongan sangat terlihat saat gameplay
- (tidak ada) — Tidak ditemukan seam yang benar-benar patah (ground/horizon putus). Setelah ghosting dihapus, sambungan keras tapi rata.

### P1 — terlihat, masih bisa ditoleransi
- **P1-A Sunset double-sun saat city loop.** `bg_city_sunset_loop.png` punya matahari baked-in. Saat city loop berulang, dua matahari tampak di layar lebar. (Celestial layer sudah di-disable untuk sunset, tapi loop tetap menggandakan matahari yang ter-bake.)
- **P1-B Blok M masuk/keluar mendadak.** Gedung Blok M mepet tepi kanan asset → transisi city↔blok_m terasa lebih tiba-tiba dibanding landmark lain.
- **P1-C Skyline tidak menyambung di seam.** City berakhir dengan gedung, landmark mulai dengan komposisi beda → garis langit "loncat" di seam. Inheren karena dua gambar berbeda; bukan patahan ground.

### P2 — minor
- **P2-A Warna langit/saturasi** sedikit beda antar city dan landmark dalam theme sama (paling terasa di sunset). Tidak mengganggu, ground tetap rata.
- **P2-B File `ps_gacor_night.png` duplikat** di root `backgrounds/` (di luar struktur day/sunset/night). Tidak dipakai; berpotensi membingungkan. Tidak dihapus (aturan: jangan ubah asset).

## Mana yang bisa diperbaiki dengan edit teknis sederhana (tanpa redraw)

- **P1-A double-sun**: hapus/crop matahari dari `bg_city_sunset_loop.png` lalu pakai celestial layer (enable sunset). TAPI ini = edit gambar asset → di luar izin sekarang. Alternatif kode-saja: tidak ada; selama matahari ter-bake, loop akan menggandakannya.
- **P1-B Blok M abrupt**: bisa diatur dari `route.ts` (`width`/posisi segment) atau beri jarak city sebelum/sesudah blok_m lebih lebar → tepi kosong city menutup transisi. Murni config, tanpa sentuh asset/JourneyScene.
- **P2-B duplikat**: cukup abaikan; kalau mau bersih, pindahkan file root (perlu izin ubah asset).

## Mana yang butuh edit gambar artistik/manual

- **P1-C skyline loncat di seam** & **P2-A beda warna langit**: butuh redraw/penyelarasan artistik — bikin tepi kiri/kanan tiap asset punya skyline + langit yang nyambung (idealnya city base tileable + landmark overlay transparan). Tidak bisa diselesaikan via kode atau crop sederhana.
- **P1-A** (cara terbaik): redraw city sunset tanpa matahari baked-in, supaya celestial layer jadi satu sumber matahari.

## Kesimpulan jujur

Ground (aspal/marka/rumput/tanah/trotoar) sudah loopable dan rata di semua seam — itu kekuatan utama. Yang tersisa murni masalah **skyline/langit/komposisi gedung** antar dua gambar berbeda, plus matahari sunset baked-in. Tak ada P0. Perbaikan tanpa redraw hanya bisa menutupi (atur jarak segment), bukan menghilangkan seam. Seamless sejati butuh asset tileable + overlay transparan.
