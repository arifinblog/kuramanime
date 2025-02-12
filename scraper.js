const express = require('express');
const puppeteer = require('puppeteer');
const app = express();

// Fungsi untuk scraping URL video
async function scrapeVideoUrl(url) {
    let browser = null;
    try {
        browser = await puppeteer.launch({
            headless: "new",
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-web-security',
                '--disable-features=IsolateOrigins',
                '--disable-site-isolation-trials'
            ]
        });

        const page = await browser.newPage();
        
        // Set timeout dan headers
        await page.setDefaultNavigationTimeout(30000);
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/91.0.4472.124 Safari/537.36');

        // Monitor network requests untuk video
        const videoUrls = new Set();
        await page.setRequestInterception(true);
        
        page.on('request', request => {
            const url = request.url();
            // Cek jika URL adalah video
            if (url.includes('.m3u8') || url.includes('.mp4')) {
                console.log('Found video URL in request:', url);
                videoUrls.add(url);
            }
            request.continue();
        });

        // Navigasi ke halaman
        await page.goto(url, { waitUntil: 'networkidle0' });

        // Tunggu video player
        await page.waitForSelector('video#player', { timeout: 10000 });

        // Coba dapatkan URL video dengan berbagai metode
        const videoUrl = await page.evaluate(() => {
            const video = document.querySelector('video#player');
            if (!video) return null;

            // Cek berbagai kemungkinan sumber video
            return video.src || 
                   video.currentSrc || 
                   (video.querySelector('source') ? video.querySelector('source').src : null) ||
                   video.getAttribute('data-src');
        });

        // Jika menemukan URL dari evaluasi halaman
        if (videoUrl) {
            console.log('Found video URL from player:', videoUrl);
            return videoUrl;
        }

        // Jika menemukan URL dari network requests
        if (videoUrls.size > 0) {
            const url = Array.from(videoUrls)[0];
            console.log('Found video URL from network:', url);
            return url;
        }

        throw new Error('Video URL tidak ditemukan');

    } catch (error) {
        console.error('Error saat scraping:', error);
        return null;
    } finally {
        if (browser) {
            await browser.close().catch(() => {});
        }
    }
}

// Setup Express server
app.get('/', async (req, res) => {
    const targetUrl = req.query.getvideo;

    if (!targetUrl) {
        return res.status(400).send('Parameter getvideo yang berisi URL dibutuhkan.');
    }

    try {
        console.log('Scraping URL:', targetUrl);
        const videoUrl = await scrapeVideoUrl(targetUrl);

        if (!videoUrl) {
            return res.status(404).send('Video tidak ditemukan di halaman tersebut.');
        }

        // Buat HTML response dengan tambahan fitur
        const html = `
        <!DOCTYPE html>
        <html lang="id">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Video Player</title>
            <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body { 
                    background-color: #000;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    min-height: 100vh;
                }
                .video-container {
                    width: 100%;
                    height: 100vh;
                    position: fixed;
                    top: 0;
                    left: 0;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                }
                video {
                    width: 100%;
                    height: 100%;
                    object-fit: contain;
                }
                .controls {
                    position: fixed;
                    bottom: 20px;
                    left: 50%;
                    transform: translateX(-50%);
                    z-index: 1000;
                    background: rgba(0,0,0,0.7);
                    padding: 10px;
                    border-radius: 5px;
                    display: flex;
                    gap: 10px;
                }
                button {
                    background: #fff;
                    border: none;
                    padding: 5px 15px;
                    border-radius: 3px;
                    cursor: pointer;
                }
                button:hover { background: #ddd; }
            </style>
        </head>
        <body>
            <div class="video-container">
                <video id="player" controls autoplay playsinline>
                    <source src="${videoUrl}" type="video/mp4">
                    Browser Anda tidak mendukung tag video.
                </video>
            </div>
            <div class="controls">
                <button onclick="toggleFullscreen()">Fullscreen</button>
                <button onclick="window.location.href='${videoUrl}'">Download</button>
            </div>
            <script>
                const video = document.getElementById('player');
                
                // Autoplay
                video.play().catch(e => console.log('Autoplay prevented:', e));
                
                // Fullscreen function
                function toggleFullscreen() {
                    if (!document.fullscreenElement) {
                        video.requestFullscreen().catch(e => console.log(e));
                    } else {
                        document.exitFullscreen();
                    }
                }
                
                // Keyboard controls
                document.addEventListener('keydown', (e) => {
                    switch(e.key.toLowerCase()) {
                        case 'f': toggleFullscreen(); break;
                        case ' ': video.paused ? video.play() : video.pause(); break;
                        case 'arrowright': video.currentTime += 10; break;
                        case 'arrowleft': video.currentTime -= 10; break;
                    }
                });
            </script>
        </body>
        </html>`;

        res.send(html);

    } catch (error) {
        console.error('Server error:', error);
        res.status(500).send('Terjadi kesalahan saat scraping atau menampilkan video.');
    }
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
}); 