function compilePath(path) {
  const keys = [];
  const pattern = path.replace(/:([A-Za-z0-9_]+)/g, (_, key) => {
    keys.push(key);
    return "([^/]+)";
  });

  return {
    regex: new RegExp(`^${pattern}$`),
    keys,
  };
}

export function createRouter() {
  const routes = [];

  return {
    add(method, path, handler) {
      const { regex, keys } = compilePath(path);
      routes.push({ method, path, regex, keys, handler });
    },

    get(path, handler) {
      this.add("GET", path, handler);
    },

    post(path, handler) {
      this.add("POST", path, handler);
    },

    async handle(request) {
      const url = new URL(request.url);

      for (const route of routes) {
        if (route.method !== request.method) continue;

        const match = url.pathname.match(route.regex);
        if (!match) continue;

        const params = Object.fromEntries(
          route.keys.map((key, index) => [key, decodeURIComponent(match[index + 1])])
        );

        return route.handler({
          request,
          url,
          params,
        });
      }

      return new Response(JSON.stringify({ error: "not found" }, null, 2), {
        status: 404,
        headers: { "content-type": "application/json" },
      });
    },
  };
}