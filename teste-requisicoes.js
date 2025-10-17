(async () => {
  // CONFIGURAÇÃO
  const url = window.location.href; // URL Atual
  const totalRequests = 60; // total de requisições
  const concurrency = 10; // quantas requisições em paralelo
  const waitBetweenMs = 0; // espera entre requisições sequenciais por worker
  const readBody = false; // true lê o body; false só verifica status (mais rápido)
  const timeoutMs = 20000; // timeout para cada fetch

  function sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
  }

  function parseCookies() {
    const out = {};
    document.cookie
      .split(";")
      .map((s) => s.trim())
      .forEach((pair) => {
        if (!pair) return;
        const idx = pair.indexOf("=");
        if (idx === -1) out[pair] = "";
        else
          out[pair.substring(0, idx)] = decodeURIComponent(
            pair.substring(idx + 1),
          );
      });
    return out;
  }

  function tryParseJSON(s) {
    try {
      return JSON.parse(s);
    } catch {
      return null;
    }
  }

  // ---------- detectar o token automaticamente ----------
  function findTokenCandidates() {
    const candidates = [];

    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        const val = localStorage.getItem(key);
        if (!val) continue;
        candidates.push({ where: `localStorage:${key}`, key, val });
        const j = tryParseJSON(val);
        if (j && typeof j === "object") {
          for (const sub of [
            "token",
            "accessToken",
            "access_token",
            "authToken",
            "id_token",
            "jwt",
          ]) {
            if (j[sub])
              candidates.push({
                where: `localStorage:${key}.${sub}`,
                key: `${key}.${sub}`,
                val: j[sub],
              });
          }
        }
      }
    } catch (e) {
      /* blocked */
    }

    try {
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        const val = sessionStorage.getItem(key);
        if (!val) continue;
        candidates.push({ where: `sessionStorage:${key}`, key, val });
        const j = tryParseJSON(val);
        if (j && typeof j === "object") {
          for (const sub of [
            "token",
            "accessToken",
            "access_token",
            "authToken",
            "id_token",
            "jwt",
          ]) {
            if (j[sub])
              candidates.push({
                where: `sessionStorage:${key}.${sub}`,
                key: `${key}.${sub}`,
                val: j[sub],
              });
          }
        }
      }
    } catch (e) {
      /* blocked */
    }

    try {
      const cookies = parseCookies();
      for (const k in cookies) {
        const v = cookies[k];
        if (!v) continue;
        candidates.push({ where: `cookie:${k}`, key: k, val: v });
      }
    } catch (e) {}

    try {
      document.querySelectorAll("meta").forEach((m) => {
        const name = m.getAttribute("name") || m.getAttribute("property");
        const content = m.getAttribute("content");
        if (content)
          candidates.push({ where: `meta:${name}`, key: name, val: content });
      });
    } catch (e) {}

    try {
      const globals = [
        "__INITIAL_STATE__",
        "INITIAL_STATE",
        "APP_STATE",
        "__APP_STATE__",
        "__USER__",
        "user",
        "Auth",
      ];
      globals.forEach((g) => {
        try {
          const v = window[g];
          if (v) {
            const s = typeof v === "string" ? v : JSON.stringify(v);
            candidates.push({ where: `window:${g}`, key: g, val: s });
            if (typeof v === "object") {
              for (const sub of [
                "token",
                "accessToken",
                "access_token",
                "id_token",
                "jwt",
                "authToken",
              ]) {
                if (v[sub])
                  candidates.push({
                    where: `window:${g}.${sub}`,
                    key: `${g}.${sub}`,
                    val: v[sub],
                  });
              }
            }
          }
        } catch (e) {}
      });
    } catch (e) {}

    const uniq = [];
    const seen = new Set();
    for (const c of candidates) {
      const val = ("" + c.val).trim();
      if (!val) continue;
      if (val.length < 10) continue; // too short to be token
      if (seen.has(val)) continue;
      seen.add(val);
      uniq.push(c);
    }

    return uniq;
  }

  function pickBestToken(candidates) {
    if (!candidates || !candidates.length) return null;
    const jwt = candidates.find((c) =>
      /^\s*([A-Za-z0-9_-]+\.){2}[A-Za-z0-9_-]+(\..*)?\s*$/.test(c.val),
    );
    if (jwt) return jwt;
    const prefer = candidates.find((c) =>
      /access[_-]?token|id_token|auth|jwt|access_token|authorization/i.test(
        c.where + " " + c.key,
      ),
    );
    if (prefer) return prefer;
    return candidates.sort((a, b) => b.val.length - a.val.length)[0];
  }

  // ---------- main ----------
  console.log(
    "Detectando tokens em localStorage/sessionStorage/cookies/meta/window...",
  );
  const cand = findTokenCandidates();
  console.log(
    "Candidates encontrados:",
    cand.map((c) => c.where),
  );
  const picked = pickBestToken(cand);

  if (picked) {
    console.log("Token escolhido:", picked.where);
  } else {
    console.log(
      "Nenhum token automático detectado. O script seguirá sem header Authorization.",
    );
  }

  const token = picked ? String(picked.val).trim() : null;
  const authHeader = token ? `Bearer ${token}` : null;

  function fetchWithTimeout(resource, options = {}) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);
    return fetch(resource, { ...options, signal: controller.signal }).finally(
      () => clearTimeout(id),
    );
  }

  const results = [];

  async function worker(workerId) {
    while (true) {
      const i = getNextIndex();
      if (i === null) return;
      const seq = i + 1;
      const start = performance.now();
      try {
        const headers = { "Cache-Control": "no-cache" };
        if (authHeader) headers["Authorization"] = authHeader;
        const method = readBody ? "GET" : "HEAD";
        const resp = await fetchWithTimeout(url, {
          method,
          headers,
          credentials: "same-origin",
        });
        const time = Math.round(performance.now() - start);
        let bytes = null;
        if (readBody && resp && resp.ok) {
          const text = await resp.text().catch(() => "");
          bytes = text.length;
        }
        results.push({
          seq,
          workerId,
          status: resp ? resp.status : null,
          ok: resp ? resp.ok : false,
          time,
          bytes,
          url: resp ? resp.url : url,
        });
      } catch (err) {
        const time = Math.round(performance.now() - start);
        results.push({
          seq,
          workerId,
          status: null,
          ok: false,
          time,
          bytes: null,
          url,
          error: String(err),
        });
      }
      if (waitBetweenMs) await sleep(waitBetweenMs);
    }
  }

  let nextIndex = 0;
  function getNextIndex() {
    if (nextIndex >= totalRequests) return null;
    return nextIndex++;
  }

  console.log(
    `Iniciando ${totalRequests} requisições para ${url} (concurrency=${concurrency}) ...`,
  );
  const workers = Array.from(
    { length: Math.min(concurrency, totalRequests) },
    (_, idx) => worker(idx + 1),
  );
  const t0 = performance.now();
  await Promise.all(workers);
  const totalTime = Math.round(performance.now() - t0);

  results.sort((a, b) => a.seq - b.seq);
  const succeeded = results.filter((r) => r.ok).length;
  const failed = results.length - succeeded;
  const times = results
    .filter((r) => typeof r.time === "number")
    .map((r) => r.time);
  const avg = times.length
    ? Math.round(times.reduce((a, b) => a + b, 0) / times.length)
    : 0;
  const min = times.length ? Math.min(...times) : 0;
  const max = times.length ? Math.max(...times) : 0;

  const summary = {
    url,
    totalRequests: results.length,
    succeeded,
    failed,
    totalTimeMs: totalTime,
    avgMs: avg,
    minMs: min,
    maxMs: max,
    concurrency,
  };

  console.log("--- RESULTADO ---");
  console.table(summary);
  console.log("Detalhes (primeiros 200 registros):", results.slice(0, 200));

  window.__f5_test_summary = summary;
  window.__f5_test_results = results;

  console.log(
    "Variáveis window.__f5_test_summary e window.__f5_test_results disponíveis para inspeção.",
  );
})();


