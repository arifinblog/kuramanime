FROM node:18

WORKDIR /app

COPY package*.json ./

RUN npm install

# Membuat file .dockerignore
RUN echo ".git" > .dockerignore
RUN echo "node_modules" >> .dockerignore


COPY . .

RUN set -ex; \
    apt-get update -y; \
    apt-get install -y --no-install-recommends wget gnupg2; \
    wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add -; \
    echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google-chrome.list; \
    apt-get update -y; \
    apt-get install -y google-chrome-stable; \
    rm -rf /var/lib/apt/lists/*; \
    if ! command -v google-chrome-stable &> /dev/null; then echo "ERROR: google-chrome-stable tidak ditemukan!"; exit 1; fi;
    # Memeriksa apakah Chrome ada di direktori yang diharapkan
    if [ ! -f "/opt/google/chrome/google-chrome" ]; then echo "ERROR: Google Chrome tidak ditemukan di /opt/google/chrome/google-chrome"; exit 1; fi;

ENV CHROME_PATH="/opt/google/chrome/google-chrome"

CMD ["node", "index.js"]
