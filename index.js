import express from 'express';
import { launch } from 'puppeteer-core';
import validator from 'validator';
import fetch from 'node-fetch';
import { executablePath } from 'puppeteer-core';

const app = express();
const port = process.env.PORT || 3000;

app.get('/', async (req, res) => {
    const videoPageUrl = req.query.getVidUrl;

    if (!videoPageUrl) {
        return res.status(400).send('Parameter getVidUrl tidak ada.');
    }

    if (!validator.isURL(videoPageUrl)) {
        return res.status(400).send('URL tidak valid.');
    }

    let browser;
    try {
        // This is CRUCIAL for puppeteer-core. Set the path to your Chromium installation.
        const chromiumPath = process.env.CHROMIUM_PATH || executablePath();

        browser = await launch({
            args: [
                "--no-sandbox",
                "--disable-setuid-sandbox",
                "--disable-dev-shm-usage",
                "--single-process",
            ],
            executablePath: chromiumPath, // Point to your Chromium installation
            headless: "new",
            ignoreHTTPSErrors: true,
            timeout: 60000, // Add timeout for launch
        });
        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36');

        await page.setRequestInterception(true);
        page.on('request', request => {
            if (['image', 'stylesheet', 'font'].includes(request.resourceType())) {
                request.abort();
            } else {
                request.continue();
            }
        });

        console.log("URL yang digunakan:", videoPageUrl);
        let networkVideoUrl = null;

        page.on('response', response => {
            const url = response.url();
            if (url.endsWith('.mp4') || url.endsWith('.webm') || url.endsWith('.m3u8') || url.endsWith('.ts')) {
                console.log('>> Ditemukan URL video di jaringan:', url);
                networkVideoUrl = url;
            }
        });

        await page.goto(videoPageUrl, { waitUntil: 'networkidle0', timeout: 60000 });

        const videoSelector = 'div.plyr__video-wrapper > video#player'; // Adjust this selector as needed

        const debugInfo = await page.evaluate((selector) => {
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

        console.log("Informasi Debug:", debugInfo);
        const videoSrc = debugInfo.src || debugInfo.sourceSrc || networkVideoUrl || null;


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

            res.status(200).send(html);
        } else {
            res.status(404).send('Video tidak ditemukan.');
        }
    } catch (error) {
        console.error('Terjadi kesalahan:', error);
        res.status(500).send('Terjadi kesalahan saat memproses permintaan.');
    } finally {
        if (browser) await browser.close();
    }
});

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

