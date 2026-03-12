FROM oven/bun:1

WORKDIR /src

COPY index.html /src/index.html
COPY styles.css /src/styles.css
COPY index.js /src/index.js
COPY server.js /src/server.js
COPY dev-assets/greenhouse-twin.png /src/dev-assets/greenhouse-twin.png

CMD ["bun", "/src/server.js"]