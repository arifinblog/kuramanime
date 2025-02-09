// functions/get-video.js
const puppeteer = require('puppeteer');

exports.handler = async (event, context) => {
  console.log("0. Function dimulai!"); // Log paling awal

  const videoPageUrl = event.queryStringParameters.getVidUrl;
  console.log("1. videoPageUrl:", videoPageUrl);

  if (!videoPageUrl) {
    console.log("1a. videoPageUrl tidak ada!");
    return {
      statusCode: 400,
      body: 'Parameter getVidUrl tidak ada.',
    };
  }

  try {
    const browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    const page = await browser.newPage();

    // Tambahkan user-agent (opsional, tetapi sering membantu)
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/99.0.4844.51 Safari/537.36');


    console.log("2. Membuka halaman:", videoPageUrl);
    await page.goto(videoPageUrl, { waitUntil: 'networkidle0' });
    console.log("3. Halaman terbuka (atau timeout).");

    // waitForSelector dengan timeout
    await page.waitForSelector('div.plyr__video-wrapper', { timeout: 15000 }); // Timeout 15 detik
    console.log("4. div.plyr__video-wrapper ditemukan (atau timeout).");

    const videoSrc = await page.evaluate(() => {
      const videoElement = document.querySelector('div.plyr__video-wrapper > video#player');
      console.log("5. videoElement:", videoElement); // Log elemen video
      return videoElement ? videoElement.src : null;
    });

    console.log("6. videoSrc:", videoSrc);

    await browser.close();
    console.log("7. Browser ditutup.");

    if (videoSrc) {
      const html = `<!DOCTYPE html><html><head><title>Video Player</title></head><body><video width="640" height="360" controls><source src="${videoSrc}" type="video/mp4">Browser Anda tidak mendukung tag video.</video></body></html>`;
      console.log("8. HTML dibuat.");
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'text/html' },
        body: html,
      };
    } else {
      console.log("8a. videoSrc kosong!");
      return {
        statusCode: 404,
        body: 'Video tidak ditemukan.',
      };
    }

  } catch (error) {
    console.error('9. Terjadi kesalahan:', error); // Log error *lengkap*
    return {
      statusCode: 500,
      body: `Terjadi kesalahan: ${error.message}`, // Tampilkan pesan error
    };
  }
};