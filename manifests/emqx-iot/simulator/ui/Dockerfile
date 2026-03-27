FROM oven/bun:1

WORKDIR /src

COPY index.html /src/index.html
COPY index.js /src/index.js
COPY server.js /src/server.js
COPY styles.css /src/styles.css
COPY styles/ /src/styles/
COPY workspace-data.js /src/workspace-data.js
COPY workspace-edge.js /src/workspace-edge.js
COPY workspace-helpers.js /src/workspace-helpers.js
COPY workspace-pages.js /src/workspace-pages.js
COPY workspace-shell.js /src/workspace-shell.js
COPY dev-assets/greenhouse-twin.png /src/dev-assets/greenhouse-twin.png
COPY dev-assets/map.png /src/dev-assets/map.png

EXPOSE 8080

CMD ["bun", "/src/server.js"]
