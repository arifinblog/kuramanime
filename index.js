const express = require('express');
const puppeteer = require('puppeteer');

const app = express();
const port = 3000;

app.get('/', async (req, res) => {
  const videoPageUrl = req.query.getVidUrl;
  if (!videoPageUrl) {
    return res.status(400).send('Parameter getVidUrl tidak ada.');
  }

  let browser; // Deklarasikan di luar try
  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    const page = await browser.newPage();
    await page.goto(videoPageUrl, { waitUntil: 'networkidle0' });
    await page.waitForSelector('div.plyr__video-wrapper', { timeout: 10000 }); // Tambahkan timeout!

    const videoSrc = await page.evaluate(() => {
      const videoElement = document.querySelector('div.plyr__video-wrapper > video#player');
      return videoElement ? videoElement.src : null;
    });

    if (videoSrc) {
      const html = `<!DOCTYPE html>...`; // HTML Anda
      res.status(200).send(html);
    } else {
      res.status(404).send('Video tidak ditemukan.');
    }
  } catch (error) {
    console.error('Terjadi kesalahan:', error);
    res.status(500).send('Terjadi kesalahan saat memproses permintaan.');
  } finally {
    if (browser) {
      await browser.close(); // SELALU tutup browser, bahkan jika error
    }
  }
});

app.listen(port, () => {
  console.log(`Server berjalan di http://localhost:${port}`);
});