# Pin to the exact Playwright version used in package.json so the bundled
# Chromium build matches what the code was written/tested against.
FROM mcr.microsoft.com/playwright:v1.60.0-jammy

# Some automation flows (Naukri anti-bot-detection) deliberately launch
# Chromium headed (headless: false), which needs a real X display. Xvfb
# provides a virtual one so that works on a headless EC2 box.
RUN apt-get update && apt-get install -y --no-install-recommends xvfb \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

RUN mkdir -p logs uploads browser-profiles \
    && chmod +x docker-entrypoint.sh

EXPOSE 5000

ENTRYPOINT ["./docker-entrypoint.sh"]
