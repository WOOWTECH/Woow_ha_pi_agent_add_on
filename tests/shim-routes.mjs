// Regression test for the HA Ingress URL shim in rootfs/etc/nginx/nginx.conf.
//
// WHY THIS EXISTS
//
// Under HA Ingress the app is served at /api/hassio_ingress/<token>/, but
// pi-web emits absolute paths (/api/..., /_next/..., /favicon...). The shim
// monkey-patches fetch / EventSource / XMLHttpRequest so those paths get the
// ingress prefix prepended before they leave the browser. A route the shim
// fails to match does not error — it escapes the iframe and lands on HA Core,
// which answers with its own 404 or login page. The symptom is "one panel in
// the UI is permanently broken", which is expensive to trace back to here.
//
// pi-web is pinned in the Dockerfile precisely because upstream can add routes
// without warning. When bumping PI_WEB_VERSION, add that release's new routes
// to ROUTES below and run:
//
//     node tests/shim-routes.mjs
//
// The shim source is not duplicated here — it is extracted from nginx.conf at
// run time, so this test cannot drift from what is actually served.
//
// Verified against pi-web 0.9.0: 19/19.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const NGINX_CONF = join(HERE, "..", "rootfs", "etc", "nginx", "nginx.conf");
const PREFIX = "/api/hassio_ingress/abcdefghijklmnop1234";

function extractShim() {
  const conf = readFileSync(NGINX_CONF, "utf8");
  const m = conf.match(/sub_filter '<\/head>' '(<script>[\s\S]*?<\/script>)<\/head>';/);
  if (!m) throw new Error(`could not find the </head> shim in ${NGINX_CONF}`);
  return m[1].replace(/^<script>/, "").replace(/<\/script>$/, "");
}

const calls = { fetch: [], eventsource: [], xhr: [] };
const g = globalThis;
g.location = { origin: "http://homeassistant.local:8123" };
g.window = g;
g.fetch = (u) => { calls.fetch.push(String(u)); return Promise.resolve(); };
function ES(u){ calls.eventsource.push(String(u)); }
g.EventSource = ES;
g.XMLHttpRequest = function(){}; 
g.XMLHttpRequest.prototype.open = function(m,u){ calls.xhr.push(String(u)); };
g.Request = class { constructor(u,i){ this.url=u; Object.assign(this,i);} };
g.URL = URL;
g.history = { pushState(){}, replaceState(){} };
g.Element = { prototype: { setAttribute(){} } };
g.HTMLLinkElement = undefined; g.HTMLScriptElement = undefined; g.HTMLImageElement = undefined;
Object.defineProperty(g, "navigator", { value: {}, configurable: true, writable: true });

// nginx substitutes $safe_ingress_path at serve time; do the same here.
const js = extractShim().replace(
  'window.__INGRESS_PATH__="$safe_ingress_path"',
  `window.__INGRESS_PATH__=${JSON.stringify(PREFIX)}`,
);
new Function(js)();

// Routes pi-web 0.9.0 actually calls from the browser, incl. everything new.
const ROUTES = [
  ["/api/home",                          true,  "0.8.4 baseline"],
  ["/api/sessions",                      true,  "0.8.4 baseline"],
  ["/api/models-config",                 true,  "0.8.4 baseline"],
  ["/api/terminal",                      true,  "0.9.0 NEW — terminal create"],
  ["/api/terminal/abc123/events",        true,  "0.9.0 NEW — terminal SSE"],
  ["/api/subagents/profiles",            true,  "0.9.0 NEW"],
  ["/api/sessions/search",               true,  "0.9.0 NEW"],
  ["/api/tools/settings",                true,  "0.9.0 NEW"],
  ["/api/push/subscribe",                true,  "0.9.0 NEW — web-push"],
  ["/api/app-update",                    true,  "0.9.0 NEW"],
  ["/_next/static/chunks/main.js",       true,  "asset"],
  ["/favicon.ico",                       true,  "asset"],
  ["/manifest.webmanifest",              true,  "asset"],
  ["/icons/icon-192.png",                true,  "asset"],
  ["/?_rsc=1a2b3",                       true,  "RSC prefetch"],
  [`${PREFIX}/api/home`,                 false, "already prefixed — must NOT double-prefix"],
  ["https://api.openai.com/v1/models",   false, "absolute external — must not touch"],
];

let pass = 0, fail = 0;
console.log("=== fetch() ===");
for (const [url, shouldPrefix, note] of ROUTES) {
  calls.fetch.length = 0;
  g.fetch(url);
  const got = calls.fetch[0];
  const expected = shouldPrefix ? PREFIX + url : url;
  const ok = got === expected;
  ok ? pass++ : fail++;
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${url}`);
  if (!ok) console.log(`        expected ${expected}\n        got      ${got}   (${note})`);
}

console.log("\n=== EventSource() — this is how 0.9.0 streams terminal output ===");
for (const url of ["/api/terminal/abc123/events", "/api/sessions/x/events"]) {
  calls.eventsource.length = 0;
  new g.EventSource(url);
  const got = calls.eventsource[0];
  const ok = got === PREFIX + url;
  ok ? pass++ : fail++;
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${url} -> ${got}`);
}

console.log("\n=== XMLHttpRequest ===");
calls.xhr.length = 0;
const x = new g.XMLHttpRequest(); g.XMLHttpRequest.prototype.open.call(x, "POST", "/api/terminal");
console.log(`  (open called with) ${calls.xhr[0] ?? "<none>"}`);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
