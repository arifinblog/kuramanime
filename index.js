const express = require('express');
const puppeteer = require('puppeteer');

const app = express();
const port = 8888;

app.get('/', async (req, res) => {
    try {
        const videoUrl = req.query.getVidUrl;
        if (!videoUrl) {
            return res.status(400).send('Parameter getVidUrl dibutuhkan.');
        }

        const browser = await puppeteer.launch({
            headless: "new", // Gunakan mode headless baru. Lebih cepat dan direkomendasikan.
            args: ['--no-sandbox', '--disable-setuid-sandbox'] // Sering dibutuhkan di lingkungan server (misalnya, Docker, VPS).
        });
        const page = await browser.newPage();

        // Pergi ke URL video.  'networkidle0' menunggu hingga semua resource (termasuk video) selesai dimuat.
        // Jika terlalu lama, coba ganti dengan 'domcontentloaded' atau 'load'.
        await page.goto(videoUrl, { waitUntil: 'networkidle0' });

        // Tunggu hingga elemen video muncul di DOM.  Ini memastikan bahwa elemen tersebut ada sebelum kita coba interaksi.
        await page.waitForSelector('video#player');

        // Ekstrak URL video.  page.evaluate() menjalankan kode JavaScript *di dalam konteks browser*.
        let extractedUrl = await page.evaluate(() => {
            const videoElement = document.querySelector('video#player');

            // Cek apakah elemen video ada DAN memiliki atribut 'src'.
            if (videoElement && videoElement.src) {
                return videoElement.src;
            }

            // Jika tidak ada di 'src', coba cari di dalam tag <source>.
            const sourceElement = document.querySelector('video#player source');
            if (sourceElement && sourceElement.src) {
                return sourceElement.src;
            }

            return null; // Kembalikan null jika URL tidak ditemukan.
        });

        await browser.close();

        if (!extractedUrl) {
            return res.status(404).send('URL video tidak ditemukan.');
        }

        res.send(extractedUrl);

    } catch (error) {
        console.error("Error:", error);
        res.status(500).send('Terjadi kesalahan: ' + error.message);
    }
});

app.listen(port, () => {
    console.log(`Server berjalan di http://localhost:${port}`);
});