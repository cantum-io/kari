// usage: node q.mjs <endpoint> [key=value ...] ; for eval/iso the code is read from stdin
const [,, ep, ...rest] = process.argv;
let body = {};
for (const kv of rest) { const i = kv.indexOf("="); body[kv.slice(0, i)] = kv.slice(i + 1); }
const isGet = ep === "console" || ep === "pages" || ep === "sw" || ep.startsWith("shot");
if (ep === "eval" || ep === "iso") body.code = await new Promise(r => { let s = ""; process.stdin.on("data", c => s += c); process.stdin.on("end", () => r(s)); });
const r = await fetch("http://127.0.0.1:9777/" + ep, { method: isGet ? "GET" : "POST", body: isGet ? undefined : JSON.stringify(body) });
const t = await r.text();
try { const j = JSON.parse(t); console.log(typeof j.value === "string" ? j.value : JSON.stringify(j, null, 1)); } catch { console.log(t); }
