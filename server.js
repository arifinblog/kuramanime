
const http = require('http');
const url = require('url');
const fs = require('fs');
const validator = require('validator');
const puppeteer = require('puppeteer');

async function getVideoUrl(animeUrl) {
    let browser = null;
    try {
        console.log("Mencoba scraping URL dengan Puppeteer:", animeUrl);
        browser = await puppeteer.launch({ headless: "new" });
        const page = await browser.newPage();

        await page.goto(animeUrl, { waitUntil: 'networkidle2' });

        await page.waitForSelector('video#player', { timeout: 10000 });

        const videoUrl = await page.evaluate(() => {
            let video = document.querySelector('video#player');
            if (video) {
                let videoUrl = video.src;
                if (!videoUrl) {
                    let source = video.querySelector('source:last-child');
                    if (source) {
                        videoUrl = source.src;
                    }
                }
                return videoUrl;
            }
            return null;
        });

        console.log("URL video yang ditemukan (Puppeteer):", videoUrl);

        if (videoUrl) {
            console.log('URL Video berhasil diekstrak (Puppeteer):', videoUrl);
            return videoUrl;
        } else {
            console.log('URL video tidak ditemukan setelah scraping (Puppeteer).');
            return null;
        }

    } catch (error) {
        console.error('Terjadi kesalahan saat scraping dengan Puppeteer:', error);
        return null;
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

const server = http.createServer(async (req, res) => {
    const reqUrl = url.parse(req.url, true);
    let webToScrape = reqUrl.query.getVidUrl;

    console.log("Menerima permintaan dengan getVidUrl:", webToScrape);

    if (webToScrape) {
        if (!validator.isURL(webToScrape, { protocols: ['http', 'https'], require_protocol: true })) {
            webToScrape = null;
            console.log("URL tidak valid:", reqUrl.query.getVidUrl);
        } else {
            console.log("URL valid:", webToScrape);
        }
    }

    if (reqUrl.pathname === '/') {
        fs.readFile('index.html', 'utf8', async (err, html) => {
            if (err) {
                res.writeHead(500);
                res.end('Internal Server Error');
                console.error(err);
                return;
            }

            let videoSource = null;

            if (webToScrape) {
                videoSource = await getVideoUrl(webToScrape);
                console.log("URL video yang didapatkan dari getVideoUrl (Puppeteer):", videoSource);
            }
            const modifiedHtml = html.replace('/*VIDEO_SOURCE*/', videoSource ? `'${videoSource}'` : 'null');


            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(modifiedHtml);
        });
    } else {
        res.writeHead(404);
        res.end('Not Found');
    }
});

const port = 3000;
server.listen(port, () => {
    console.log(`Server berjalan di http://localhost:${port}`);
});