FROM node:18-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

# Install Chrome (using apt inside Docker - with improved error handling)
RUN set -ex; \
    apt-get update -y; \
    apt-get install -y --no-install-recommends wget gnupg2; \
    wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add -; \
    echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google-chrome.list; \
    apt-get update -y; \
    apt-get install -y google-chrome-stable; \
    rm -rf /var/lib/apt/lists/*; \
    #Verify Chrome is installed
    if ! command -v google-chrome-stable &> /dev/null; then echo "ERROR: google-chrome-stable not found!"; exit 1; fi;

# Set CHROME_PATH (important for puppeteer-core)
ENV CHROME_PATH="/opt/google/chrome/google-chrome"

CMD ["node", "index.js"]
