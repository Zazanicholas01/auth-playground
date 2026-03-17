FROM oven/bun:1 AS build

WORKDIR /src

COPY package.json /src/package.json
COPY tailwind.config.js /src/tailwind.config.js
COPY tailwind.css /src/tailwind.css
COPY styles.legacy.css /src/styles.legacy.css
COPY index.html /src/index.html
COPY index.js /src/index.js
COPY server.js /src/server.js
COPY dev-assets/greenhouse-twin.png /src/dev-assets/greenhouse-twin.png
COPY dev-assets/map.png /src/dev-assets/map.png

RUN bun install
RUN bunx tailwindcss -c /src/tailwind.config.js -i /src/tailwind.css -o /src/styles.css --minify

FROM oven/bun:1

WORKDIR /src

COPY --from=build /src/index.html /src/index.html
COPY --from=build /src/styles.css /src/styles.css
COPY --from=build /src/styles.legacy.css /src/styles.legacy.css
COPY --from=build /src/index.js /src/index.js
COPY --from=build /src/server.js /src/server.js
COPY --from=build /src/dev-assets/greenhouse-twin.png /src/dev-assets/greenhouse-twin.png
COPY --from=build /src/dev-assets/map.png /src/dev-assets/map.png

CMD ["bun", "/src/server.js"]
