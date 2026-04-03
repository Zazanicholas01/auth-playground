import { createHmac } from "node:crypto";

const port = Number(process.env.UI_PORT || 8080);
const apiBase = process.env.IOT_API_BASE || process.env.API_BASE || "http://iot-api:8080";
const simulatorBase = process.env.IOT_SIMULATOR_BASE || "http://iot-simulator:8080";
const grafanaBase = process.env.IOT_GRAFANA_BASE || "http://grafana:3000";
const dbgateBase = process.env.IOT_DBGATE_BASE || "http://dbgate:3000";
const authBase = process.env.IOT_AUTH_BASE || "http://iot-jwt-auth-service";
const jwtSecret = process.env.JWT_SECRET || "change-me-super-secret-jwt-key";
const jwtIssuer = process.env.JWT_ISSUER || "iot.local";
const jwtAudience = process.env.JWT_AUDIENCE || "iot-ui";

const PAGE_ACCESS = {
  map: ["guest", "technician", "admin"],
  twin: ["guest", "technician", "admin"],
  operations: ["technician", "admin"],
  observability: ["guest", "technician", "admin"],
  dbgate: ["admin"],
};

const PROXY_TARGETS = [
  {
    prefix: "/api",
    upstream: apiBase,
    stripPrefix: true,
    allowedRoles: ["guest", "technician", "admin"],
  },
  {
    prefix: "/simulator",
    upstream: simulatorBase,
    stripPrefix: true,
    allowedRoles: ["guest", "technician", "admin"],
  },
  {
    prefix: "/grafana",
    upstream: grafanaBase,
    stripPrefix: false,
    allowedRoles: ["guest", "technician", "admin"],
  },
  {
    prefix: "/dbgate",
    upstream: dbgateBase,
    stripPrefix: true,
    allowedRoles: ["admin"],
  },
];

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".png": "image/png",
};

function normalizeRole(role) {
  if (["guest", "technician", "admin"].includes(role)) return role;
  return "guest";
}

function allowedPagesForRole(role) {
  const normalized = normalizeRole(role);
  return Object.entries(PAGE_ACCESS)
    .filter(([, allowedRoles]) => allowedRoles.includes(normalized))
    .map(([page]) => page);
}

function defaultPageForRole(role) {
  const pages = allowedPagesForRole(role);
  if (pages.includes("map")) return "/map";
  return `/${pages[0] || "map"}`;
}

function hasRequiredRole(user, allowedRoles) {
  if (!user) return false;
  const roles = new Set([normalizeRole(user.role), ...(user.roles || []).map(normalizeRole)]);
  return allowedRoles.some((role) => roles.has(role));
}

function parseCookies(request) {
  const cookieHeader = request.headers.get("cookie") || "";
  return Object.fromEntries(
    cookieHeader
      .split(";")
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const separator = part.indexOf("=");
        if (separator === -1) return [part, ""];
        return [part.slice(0, separator), decodeURIComponent(part.slice(separator + 1))];
      }),
  );
}

function toBase64Url(buffer) {
  return Buffer.from(buffer)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function fromBase64Url(value) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padding = "=".repeat((4 - (normalized.length % 4 || 4)) % 4);
  return Buffer.from(normalized + padding, "base64");
}

function verifyJwt(token) {
  const parts = token.split(".");
  if (parts.length !== 3) return null;

  const [headerPart, payloadPart, signaturePart] = parts;
  const expectedSignature = toBase64Url(
    createHmac("sha256", jwtSecret).update(`${headerPart}.${payloadPart}`).digest(),
  );

  if (expectedSignature !== signaturePart) return null;

  try {
    const header = JSON.parse(fromBase64Url(headerPart).toString("utf8"));
    const payload = JSON.parse(fromBase64Url(payloadPart).toString("utf8"));
    if (header.alg !== "HS256") return null;

    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && Number(payload.exp) <= now) return null;
    if (payload.nbf && Number(payload.nbf) > now) return null;
    if (jwtIssuer && payload.iss !== jwtIssuer) return null;

    const audience = payload.aud;
    const validAudience = Array.isArray(audience)
      ? audience.includes(jwtAudience)
      : audience === jwtAudience;
    if (jwtAudience && !validAudience) return null;

    const role = normalizeRole(payload.role || payload.roles?.[0] || "guest");
    const roles = Array.isArray(payload.roles) && payload.roles.length > 0
      ? payload.roles.map(normalizeRole)
      : [role];

    return {
      userId: String(payload.sub || ""),
      username: payload.username || null,
      email: payload.email || null,
      role,
      roles,
      token,
    };
  } catch {
    return null;
  }
}

function buildCookie(name, value, options = {}) {
  const parts = [`${name}=${encodeURIComponent(value)}`];
  parts.push(`Path=${options.path || "/"}`);
  parts.push(`SameSite=${options.sameSite || "Lax"}`);
  if (options.httpOnly !== false) parts.push("HttpOnly");
  if (options.secure) parts.push("Secure");
  if (typeof options.maxAge === "number") parts.push(`Max-Age=${options.maxAge}`);
  return parts.join("; ");
}

function appendSessionCookies(headers, accessToken, refreshToken) {
  headers.append("set-cookie", buildCookie("iot_access_token", accessToken, { maxAge: 900 }));
  headers.append("set-cookie", buildCookie("iot_refresh_token", refreshToken, { maxAge: 604800 }));
}

function clearSessionCookies(headers) {
  headers.append("set-cookie", buildCookie("iot_access_token", "", { maxAge: 0 }));
  headers.append("set-cookie", buildCookie("iot_refresh_token", "", { maxAge: 0 }));
}

async function authServiceRequest(path, payload) {
  const response = await fetch(`${authBase}${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify(payload),
  });

  const body = await response.json().catch(() => ({}));
  return { response, body };
}

async function hydrateSession(request) {
  const cookies = parseCookies(request);
  const accessToken = cookies.iot_access_token;
  const refreshToken = cookies.iot_refresh_token;
  const user = accessToken ? verifyJwt(accessToken) : null;
  if (user) {
    return { user, accessToken, refreshToken, refreshed: null };
  }

  if (!refreshToken) {
    return { user: null, accessToken: null, refreshToken: null, refreshed: null };
  }

  const { response, body } = await authServiceRequest("/api/auth/jwt/refresh", { refresh_token: refreshToken });
  if (!response.ok || !body?.data?.access_token || !body?.data?.refresh_token) {
    return { user: null, accessToken: null, refreshToken: null, refreshed: "clear" };
  }

  const refreshedUser = verifyJwt(body.data.access_token);
  if (!refreshedUser) {
    return { user: null, accessToken: null, refreshToken: null, refreshed: "clear" };
  }

  return {
    user: refreshedUser,
    accessToken: body.data.access_token,
    refreshToken: body.data.refresh_token,
    refreshed: "set",
  };
}

function applySessionHeaders(headers, session) {
  if (session?.refreshed === "set") {
    appendSessionCookies(headers, session.accessToken, session.refreshToken);
  }
  if (session?.refreshed === "clear") {
    clearSessionCookies(headers);
  }
}

function jsonResponse(payload, status = 200, headers = new Headers()) {
  if (!headers.has("content-type")) {
    headers.set("content-type", "application/json; charset=utf-8");
  }
  return new Response(JSON.stringify(payload), { status, headers });
}

function pageNameFromPath(pathname) {
  if (pathname === "/" || pathname === "/map") return "map";
  if (pathname === "/twin") return "twin";
  if (pathname === "/operations") return "operations";
  if (pathname === "/observability") return "observability";
  if (pathname === "/dbgate") return "dbgate";
  return "map";
}

function getProxyTarget(pathname) {
  return PROXY_TARGETS.find(({ prefix }) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

async function proxyRequest(request, session, target) {
  if (!hasRequiredRole(session.user, target.allowedRoles)) {
    return new Response("Forbidden", { status: 403 });
  }

  let upstreamPath = new URL(request.url).pathname;
  if (target.stripPrefix) {
    upstreamPath = upstreamPath.slice(target.prefix.length) || "/";
  }

  const upstreamUrl = new URL(upstreamPath + new URL(request.url).search, target.upstream);
  const headers = new Headers(request.headers);
  headers.delete("host");
  headers.set("x-iot-user-role", session.user.role);
  headers.set("x-iot-user-name", session.user.username || "");
  if (session.accessToken) {
    headers.set("authorization", `Bearer ${session.accessToken}`);
  }

  const upstream = await fetch(upstreamUrl, {
    method: request.method,
    headers,
    body: request.method === "GET" || request.method === "HEAD" ? undefined : request.body,
    redirect: "manual",
  });

  const responseHeaders = new Headers(upstream.headers);
  [
    "content-encoding",
    "content-length",
    "transfer-encoding",
    "connection",
    "keep-alive",
    "proxy-authenticate",
    "proxy-authorization",
    "te",
    "trailers",
    "upgrade",
  ].forEach((header) => responseHeaders.delete(header));
  responseHeaders.set("cache-control", "no-store");
  applySessionHeaders(responseHeaders, session);

  return new Response(upstream.body, {
    status: upstream.status,
    headers: responseHeaders,
  });
}

async function serveIndex(pathname, session) {
  if (session.user) {
    const pageName = pageNameFromPath(pathname);
    if (!hasRequiredRole(session.user, PAGE_ACCESS[pageName] || PAGE_ACCESS.map)) {
      const headers = new Headers({ location: defaultPageForRole(session.user.role) });
      applySessionHeaders(headers, session);
      return new Response(null, { status: 302, headers });
    }
  }

  const file = Bun.file("/src/index.html");
  const headers = new Headers({ "content-type": mimeTypes[".html"], "cache-control": "no-store" });
  applySessionHeaders(headers, session);
  return new Response(file, { headers });
}

const server = Bun?.serve
  ? Bun.serve({
      port,
      async fetch(request) {
        const url = new URL(request.url);
        const pathname = url.pathname;

        if (pathname === "/auth/session") {
          const session = await hydrateSession(request);
          const headers = new Headers();
          applySessionHeaders(headers, session);
          if (!session.user) {
            return jsonResponse({ ok: false, error: "unauthenticated" }, 401, headers);
          }
          return jsonResponse({
            ok: true,
            user: {
              userId: session.user.userId,
              username: session.user.username,
              email: session.user.email,
              role: session.user.role,
              roles: session.user.roles,
            },
          }, 200, headers);
        }

        if (pathname === "/auth/login" || pathname === "/auth/register") {
          const body = await request.json().catch(() => ({}));
          const authPath = pathname === "/auth/login" ? "/api/auth/jwt/login" : "/api/auth/jwt/register";
          const { response, body: authBody } = await authServiceRequest(authPath, body);
          const headers = new Headers();

          if (!response.ok || !authBody?.data?.access_token || !authBody?.data?.refresh_token) {
            return jsonResponse(authBody || { ok: false, error: "auth-failed" }, response.status || 401, headers);
          }

          appendSessionCookies(headers, authBody.data.access_token, authBody.data.refresh_token);
          const user = verifyJwt(authBody.data.access_token);
          return jsonResponse({ ok: true, user }, 200, headers);
        }

        if (pathname === "/auth/refresh") {
          const session = await hydrateSession(request);
          const headers = new Headers();
          applySessionHeaders(headers, session);
          if (!session.user) {
            return jsonResponse({ ok: false, error: "refresh-failed" }, 401, headers);
          }
          return jsonResponse({ ok: true, user: session.user }, 200, headers);
        }

        if (pathname === "/auth/logout") {
          const cookies = parseCookies(request);
          const refreshToken = cookies.iot_refresh_token;
          if (refreshToken) {
            await authServiceRequest("/api/auth/jwt/logout", { refresh_token: refreshToken }).catch(() => null);
          }
          const headers = new Headers();
          clearSessionCookies(headers);
          return jsonResponse({ ok: true }, 200, headers);
        }

        const proxyTarget = getProxyTarget(pathname);
        if (proxyTarget) {
          const session = await hydrateSession(request);
          const headers = new Headers();
          applySessionHeaders(headers, session);
          if (!session.user) {
            return jsonResponse({ ok: false, error: "unauthenticated" }, 401, headers);
          }
          return proxyRequest(request, session, proxyTarget);
        }

        if (pathname === "/" || !pathname.includes(".")) {
          const session = await hydrateSession(request);
          return serveIndex(pathname, session);
        }

        const file = Bun.file("/src" + pathname);
        if (!(await file.exists())) {
          return new Response("Not found", { status: 404 });
        }

        const ext = pathname.slice(pathname.lastIndexOf("."));
        const headers = new Headers({ "cache-control": "no-store" });
        if (mimeTypes[ext]) headers.set("content-type", mimeTypes[ext]);
        return new Response(file, { headers });
      }
    })
  : null;

if (!server) {
  console.error("This server entrypoint is intended for Bun in-cluster use.");
}

