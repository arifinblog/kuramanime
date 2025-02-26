FROM node:20

# Instal dependensi sistem
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgtk-4-1 \
    libgraphene-1.0-0 \
    libgstreamer1.0-gl \
    libgstreamer-plugins-base1.0-0 \
    libavif15 \
    libenchant-2-2 \
    libsecret-1-0 \
    libmanette-0.2-0 \
    libgles2-mesa

# Atur direktori kerja
WORKDIR /app

# Salin file package.json dan package-lock.json
COPY package*.json ./

# Instal dependensi Node.js
RUN npm install

# Salin kode aplikasi
COPY . .

# Atur variabel lingkungan Playwright (penting untuk Docker)
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright

# Unduh browser Playwright DAN dependensi sistemnya
RUN npx playwright install --with-deps

# Perintah untuk menjalankan aplikasi
CMD ["node", "index.js"]