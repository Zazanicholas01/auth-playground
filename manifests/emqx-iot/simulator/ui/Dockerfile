FROM oven/bun:1 AS build

WORKDIR /src

COPY package.json /src/package.json
COPY tailwind.config.js /src/tailwind.config.js
COPY tailwind.css /src/tailwind.css
COPY index.html /src/index.html
COPY index.js /src/index.js
COPY server.js /src/server.js
COPY workspace-data.js /src/workspace-data.js
COPY workspace-edge.js /src/workspace-edge.js
COPY workspace-helpers.js /src/workspace-helpers.js
COPY workspace-pages.js /src/workspace-pages.js
COPY workspace-shell.js /src/workspace-shell.js
COPY dev-assets/greenhouse-twin.png /src/dev-assets/greenhouse-twin.png
COPY dev-assets/map.png /src/dev-assets/map.png

RUN bun install
RUN bun run build:css

FROM oven/bun:1

WORKDIR /src

COPY --from=build /src/index.html /src/index.html
COPY --from=build /src/index.js /src/index.js
COPY --from=build /src/server.js /src/server.js
COPY --from=build /src/styles.css /src/styles.css
COPY --from=build /src/workspace-data.js /src/workspace-data.js
COPY --from=build /src/workspace-edge.js /src/workspace-edge.js
COPY --from=build /src/workspace-helpers.js /src/workspace-helpers.js
COPY --from=build /src/workspace-pages.js /src/workspace-pages.js
COPY --from=build /src/workspace-shell.js /src/workspace-shell.js
COPY --from=build /src/dev-assets/greenhouse-twin.png /src/dev-assets/greenhouse-twin.png
COPY --from=build /src/dev-assets/map.png /src/dev-assets/map.png

EXPOSE 8080

CMD ["bun", "/src/server.js"]
