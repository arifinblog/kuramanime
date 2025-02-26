const express = require('express');
const { chromium } = require('playwright');
const validator = require('validator');

const app = express();
const port = process.env.PORT || 3000;

app.get('/', async (req, res) => {
  let videoPageUrl = req.query.getVidUrl;

  if (!videoPageUrl) {
    return res.status(400).send('Parameter getVidUrl tidak ada.');
  }

  if (!validator.isURL(videoPageUrl)) {
    return res.status(400).send('URL tidak valid.');
  }

  try {
    const browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    });
    const page = await browser.newPage();

    console.log("URL yang digunakan:", videoPageUrl);

    await page.goto(videoPageUrl, { waitUntil: 'networkidle', timeout: 30000 });

    // Mencoba mendapatkan URL video dengan berbagai cara
    let videoSrc = await page.evaluate(() => {
      const videoElement = document.querySelector('div.plyr__video-wrapper > video#player');

      if (!videoElement) {
        return null; // Video element tidak ditemukan
      }

      // 1. Cek atribut src langsung
      if (videoElement.src) {
        return videoElement.src;
      }

      // 2. Cek atribut data-src
      if (videoElement.dataset.src) {
        return videoElement.dataset.src;
      }

      // 3. Cek elemen <source> di dalam elemen <video>
      const sourceElement = videoElement.querySelector('source');
      if (sourceElement && sourceElement.src) {
        return sourceElement.src;
      }

      return null; // Tidak ada sumber video yang ditemukan
    });


    await browser.close();

    if (videoSrc) {
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Video Player</title>
          <style>
            body {
              margin: 0;
              overflow: hidden;
            }
            video {
              position: fixed;
              top: 0;
              left: 0;
              min-width: 100%;
              min-height: 100%;
              width: auto;
              height: auto;
              z-index: -1;
              object-fit: cover; /* Menambahkan object-fit */
            }
          </style>
        </head>
        <body>
          <video width="100%" height="100%" controls>
            <source src="${videoSrc}" type="video/mp4">
            Browser Anda tidak mendukung tag video.
          </video>
        </body>
        </html>
      `;
      res.status(200).send(html);
    } else {
      res.status(404).send('Video tidak ditemukan: Tidak dapat menemukan sumber video.');
    }

  } catch (error) {
    console.error('Terjadi kesalahan:', error);
    res.status(500).send('Terjadi kesalahan saat memproses permintaan.');
  }
});

app.listen(port, () => {
  console.log(`Server berjalan di http://localhost:${port}`);
});