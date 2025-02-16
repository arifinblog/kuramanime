const express = require('express');
const puppeteer = require('puppeteer');

const app = express();
// Gunakan environment variable PORT atau default ke 3000
const port = process.env.PORT || 3000;

app.get('/', async (req, res) => {
  const videoPageUrl = req.query.getVidUrl;

  if (!videoPageUrl) {
    return res.status(400).send('Parameter getVidUrl tidak ada.');
  }

  try {
    const browser = await puppeteer.launch({
      headless: 'new', // Gunakan 'new' untuk mode headless yang lebih baru
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'], // Tambahkan --disable-dev-shm-usage
    });
    const page = await browser.newPage();

    await page.goto(videoPageUrl, { waitUntil: 'networkidle0' });

    // Tunggu div dengan class plyr__video-wrapper
    await page.waitForSelector('div.plyr__video-wrapper');

    // Ambil URL sumber video dari elemen video di dalam div tersebut.
    const videoSrc = await page.evaluate(() => {
      const videoElement = document.querySelector('div.plyr__video-wrapper > video#player');
      return videoElement ? videoElement.src : null;
    });

    await browser.close();

    if (videoSrc) {
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Video Player</title>
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
      res.status(404).send('Video tidak ditemukan.');
    }

  } catch (error) {
    console.error('Terjadi kesalahan:', error);
    res.status(500).send('Terjadi kesalahan saat memproses permintaan.');
  }
});

app.listen(port, () => {
  console.log(`Server berjalan di http://localhost:${port}`);
});