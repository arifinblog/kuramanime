const puppeteer = require('puppeteer');

exports.handler = async (event, context) => {
  const videoPageUrl = event.queryStringParameters.getVidUrl;

  if (!videoPageUrl) {
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

    await page.goto(videoPageUrl, { waitUntil: 'networkidle0' });
    await page.waitForSelector('div.plyr__video-wrapper');

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
          <video width="640" height="360" controls>
            <source src="${videoSrc}" type="video/mp4">
            Browser Anda tidak mendukung tag video.
          </video>
        </body>
        </html>
      `;
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'text/html', // Penting: Beri tahu browser bahwa ini HTML
        },
        body: html,
      };
    } else {
      return {
        statusCode: 404,
        body: 'Video tidak ditemukan.',
      };
    }

  } catch (error) {
    console.error('Terjadi kesalahan:', error);
    return {
      statusCode: 500,
      body: 'Terjadi kesalahan saat memproses permintaan.',
    };
  }
};