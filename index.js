const express = require('express');
const fetch = require('node-fetch'); // Instal: npm install node-fetch

const app = express();
const port = 3000;

app.get('/', async (req, res) => {
  const videoPageUrl = req.query.getVidUrl;
  if (!videoPageUrl) {
    return res.status(400).send('Parameter getVidUrl tidak ada.');
  }

  try {
    // Panggil Netlify Function!
    const response = await fetch(`/.netlify/functions/getVideo?getVidUrl=${encodeURIComponent(videoPageUrl)}`);
    if (response.ok) {
      const html = await response.text(); // Dapat HTML dari fungsi
      res.status(200).send(html);
    } else {
      res.status(response.status).send(await response.text());
    }
  } catch (error) {
    console.error('Terjadi kesalahan:', error);
    res.status(500).send('Terjadi kesalahan saat memproses permintaan.');
  }
});

app.listen(port, () => {
  console.log(`Server berjalan di http://localhost:${port}`);
});