import express from 'express';
import { launch } from 'puppeteer-core'; // Mengimpor pustaka puppeteer-core
import validator from 'validator'; // Mengimpor pustaka validator untuk validasi URL
import fetch from 'node-fetch'; // Mengimpor pustaka fetch untuk melakukan permintaan jaringan

const app = express(); // Membuat instance aplikasi express
const port = process.env.PORT || 3000; // Menentukan port, menggunakan port dari variabel lingkungan jika ada, jika tidak, menggunakan port 3000

const chromeOptions = {
  executablePath: '/opt/google/chrome/google-chrome', // Menentukan path ke eksekusi Chrome
  args: [
    "--no-sandbox",
    "--disable-setuid-sandbox",
    "--disable-dev-shm-usage",
    "--single-process",
  ],
  headless: "new", // Menjalankan Chrome tanpa tampilan antarmuka
  ignoreHTTPSErrors: true, // Mengabaikan kesalahan HTTP
};

app.get('/', async (req, res) => { // Menangani permintaan GET ke root URL ('/')
  const videoPageUrl = req.query.getVidUrl; // Mendapatkan URL video dari parameter query

  if (!videoPageUrl) {
    return res.status(400).send('Parameter getVidUrl tidak ada.'); // Mengembalikan kesalahan jika parameter tidak ada
  }

  if (!validator.isURL(videoPageUrl)) {
    return res.status(400).send('URL tidak valid.'); // Mengembalikan kesalahan jika URL tidak valid
  }

  let browser;
  try {
    browser = await launch(chromeOptions); // Meluncurkan browser Chrome
    const page = await browser.newPage(); // Membuat halaman baru
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36'); // Mengatur User Agent

    await page.setRequestInterception(true); // Mengaktifkan intercept request
    page.on('request', request => { // Menangani setiap permintaan
      if (['image', 'stylesheet', 'font'].includes(request.resourceType())) { // Memblokir permintaan gambar, stylesheet, dan font
        request.abort();
      } else {
        request.continue(); // Melanjutkan permintaan lainnya
      }
    });

    console.log("URL yang digunakan:", videoPageUrl); // Menampilkan URL yang digunakan
    let networkVideoUrl = null;

    page.on('response', response => { // Menangani setiap respon
      const url = response.url();
      if (url.endsWith('.mp4') || url.endsWith('.webm') || url.endsWith('.m3u8') || url.endsWith('.ts')) { // Mencari URL video
        console.log('>> Ditemukan URL video di jaringan:', url);
        networkVideoUrl = url;
      }
    });

    await page.goto(videoPageUrl, { waitUntil: 'networkidle0', timeout: 60000 }); // Membuka URL video

    const videoSelector = 'div.plyr__video-wrapper > video#player'; // Selektor untuk elemen video

    const debugInfo = await page.evaluate((selector) => { // Mengevaluasi kode di dalam browser
      const videoElement = document.querySelector(selector);
      let src = null;
      let sourceSrc = null;

      if (videoElement) {
        src = videoElement.src || null;
        const sourceElement = videoElement.querySelector('source');
        if (sourceElement) sourceSrc = sourceElement.src || null;
      }
      return { src, sourceSrc, videoElementFound: !!videoElement };
    }, videoSelector);

    console.log("Informasi Debug:", debugInfo); // Menampilkan informasi debug
    const videoSrc = debugInfo.src || debugInfo.sourceSrc || networkVideoUrl || null; // Mendapatkan URL video

    if (videoSrc) {
        const html = `<!DOCTYPE html>
          <html>
          <head>
            <title>Video Player</title>
            <style>
              body {
                margin: 0;
                overflow: hidden;
                background-color: #000;
              }
              video {
                position: fixed;
                top: 0;
                left: 0;
                min-width: 100%;
                min-height: 100%;
                width: auto;
                height: auto;
                z-index: 1;
              }
            </style>
          </head>
          <body>
            <video controls autoplay>
              <source src="${videoSrc}" type="video/mp4">
              Your browser does not support the video tag.
            </video>
          </body>
          </html>`;

        res.status(200).send(html); // Mengembalikan HTML yang berisi player video
    } else {
      res.status(404).send('Video tidak ditemukan.'); // Mengembalikan kesalahan jika video tidak ditemukan
    }
  } catch (error) {
    console.error('Terjadi kesalahan:', error); // Menampilkan pesan kesalahan
    res.status(500).send('Terjadi kesalahan saat memproses permintaan.'); // Mengembalikan kesalahan server
  } finally {
    if (browser) await browser.close(); // Menutup browser
  }
});

// Memulai server dan menangani penghentian yang baik
const server = app.listen(port, () => {
  console.log(`Server berjalan di http://localhost:${port}`);
});

process.on('SIGINT', () => {
  server.close(() => {
    console.log('Server closed gracefully.');
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  server.close(() => {
    console.log('Server closed gracefully.');
    process.exit(0);
  });
});
