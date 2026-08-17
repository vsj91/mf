"use strict";

(() => {
  const STOCK_LIST_URL = "https://dev.indianapi.in/static/all_stocks.json";
  const DIRECT_API_BASE = "https://stock.indianapi.in";
  const PROXY_ENDPOINT = window.PLANSIP_STOCK_API_ENDPOINT || "";
  const KEY_STORAGE = "plansip_indianapi_key";
  let allStocks = [];
  let listPromise = null;

  document.addEventListener("DOMContentLoaded", initStocks);

  function initStocks() {
    injectStockStyles();
    const search = document.getElementById("stockSearch");
    const button = document.getElementById("findStockBtn");
    const keyInput = document.getElementById("stockApiKey");
    const saveKey = document.getElementById("saveStockApiKey");

    if (!search || !button) return;

    const existingKey = sessionStorage.getItem(KEY_STORAGE) || "";
    if (keyInput && existingKey) keyInput.value = existingKey;

    search.addEventListener("input", debounce(() => renderMatches(search.value), 180));
    search.addEventListener("keydown", event => {
      if (event.key === "Enter") {
        event.preventDefault();
        studyStock(search.value);
      }
    });

    button.addEventListener("click", () => studyStock(search.value));

    saveKey?.addEventListener("click", () => {
      const key = keyInput?.value.trim() || "";
      if (key) {
        sessionStorage.setItem(KEY_STORAGE, key);
        showSetupMessage("API key saved only for this browser session.", "success");
      } else {
        sessionStorage.removeItem(KEY_STORAGE);
        showSetupMessage("API key cleared.", "success");
      }
    });

    document.getElementById("clearStockApiKey")?.addEventListener("click", () => {
      sessionStorage.removeItem(KEY_STORAGE);
      if (keyInput) keyInput.value = "";
      showSetupMessage("API key cleared.", "success");
    });

    loadStockList().catch(() => {});
  }

  async function loadStockList() {
    if (allStocks.length) return allStocks;
    if (listPromise) return listPromise;

    listPromise = fetch(STOCK_LIST_URL, { headers: { Accept: "application/json" } })
      .then(response => {
        if (!response.ok) throw new Error("Stock list unavailable");
        return response.json();
      })
      .then(data => {
        allStocks = Array.isArray(data) ? data : [];
        return allStocks;
      })
      .finally(() => { listPromise = null; });

    return listPromise;
  }

  async function renderMatches(query) {
    const host = document.getElementById("stockSearchResults");
    if (!host) return;
    const value = String(query || "").trim().toLowerCase();

    if (value.length < 2) {
      host.innerHTML = "";
      return;
    }

    try {
      const stocks = await loadStockList();
      const matches = stocks.filter(stock => {
        const name = String(stock.name || "").toLowerCase();
        const nse = String(stock["nse-code"] || "").toLowerCase();
        const bse = String(stock["bse-code"] || "").toLowerCase();
        return name.includes(value) || nse.includes(value) || bse.includes(value);
      }).slice(0, 8);

      host.innerHTML = matches.length ? matches.map(stock => `
        <button class="stock-search-item" type="button" data-stock-name="${escapeAttr(stock.name || stock["nse-code"] || "")}">
          <span>
            <strong>${escapeHTML(stock.name || "Unknown company")}</strong>
            <small>${escapeHTML(stock["nse-code"] || "NSE —")} • BSE ${escapeHTML(stock["bse-code"] || "—")}</small>
          </span>
          <span class="stock-arrow">›</span>
        </button>
      `).join("") : '<div class="empty stock-mini-empty">No matching NSE/BSE stock found.</div>';

      host.querySelectorAll("[data-stock-name]").forEach(item => {
        item.addEventListener("click", () => {
          const name = item.dataset.stockName || "";
          document.getElementById("stockSearch").value = name;
          host.innerHTML = "";
          studyStock(name);
        });
      });
    } catch (error) {
      host.innerHTML = '<div class="empty stock-mini-empty">Could not load the IndianAPI stock directory.</div>';
    }
  }

  async function studyStock(rawQuery) {
    const query = String(rawQuery || "").trim();
    const errorHost = document.getElementById("stockError");
    const resultHost = document.getElementById("stockResults");
    const status = document.getElementById("stockStatus");

    if (!query || !resultHost) {
      showError(errorHost, "Enter a company name or NSE symbol, for example Reliance, TCS, INFY, or HDFCBANK.");
      return;
    }

    showError(errorHost, "");
    status?.classList.add("show");
    resultHost.innerHTML = '<div class="empty">Loading stock data from IndianAPI...</div>';

    try {
      const data = await fetchStockDetails(query);
      renderStock(data, query);
    } catch (error) {
      resultHost.innerHTML = '<div class="empty">Stock details could not be loaded.</div>';
      showError(errorHost, error.message || "Unable to fetch stock data.");
    } finally {
      status?.classList.remove("show");
    }
  }

  async function fetchStockDetails(query) {
    if (PROXY_ENDPOINT) {
      try {
        const url = new URL(PROXY_ENDPOINT, window.location.href);
        url.searchParams.set("name", query);
        const response = await fetch(url.toString(), { headers: { Accept: "application/json" } });

        if (response.ok) return await response.json();
        if (response.status !== 404) throw apiError(response.status);
      } catch (error) {
        if (sessionStorage.getItem(KEY_STORAGE)) return fetchDirect(query);
        throw new Error("Stock API proxy is not ready. Add the IndianAPI key to the Cloudflare Worker, or use your own key in Advanced API setup below.");
      }
    }

    return fetchDirect(query);
  }

  async function fetchDirect(query) {
    const key = sessionStorage.getItem(KEY_STORAGE) || "";

    if (!key) {
      document.getElementById("stockApiSetup")?.setAttribute("open", "");
      throw new Error("IndianAPI requires an API key. For production, keep the key in your Cloudflare Worker. For testing, enter your own key in Advanced API setup.");
    }

    const url = new URL(DIRECT_API_BASE + "/stock");
    url.searchParams.set("name", query);

    const response = await fetch(url.toString(), {
      headers: {
        Accept: "application/json",
        "X-API-Key": key
      }
    });

    if (!response.ok) throw apiError(response.status);
    return response.json();
  }

  function apiError(status) {
    if (status === 401 || status === 403) {
      return new Error("IndianAPI rejected the API key or the endpoint is not available on your plan.");
    }
    if (status === 429) {
      return new Error("IndianAPI rate limit or API credits have been reached. Try again after your credits reset.");
    }
    return new Error(`IndianAPI request failed (HTTP ${status}).`);
  }

  function renderStock(data, query) {
    const host = document.getElementById("stockResults");
    if (!host) return;

    const company = pick(data, ["companyName", "commonName", "name"]) || query;
    const industry = pick(data, ["industry", "companyProfile.mgIndustry", "mgIndustry"]) || "—";
    const sector = pick(data, ["companyProfile.mgSector", "mgSector", "sector"]) || "";
    const nse = pick(data, ["stockDetailsReusableData.nseCode", "nseCode", "nse-code", "tickerId"]) || "—";
    const bse = pick(data, ["stockDetailsReusableData.bseCode", "bseCode", "bse-code"]) || "—";

    const nsePrice = numberOrNull(pick(data, ["currentPrice.NSE", "currentPrice.nse", "currentPrice", "price"]));
    const bsePrice = numberOrNull(pick(data, ["currentPrice.BSE", "currentPrice.bse"]));
    const change = numberOrNull(pick(data, ["percentChange", "percentageChange", "percent_change"]));
    const yearHigh = numberOrNull(pick(data, ["yearHigh", "stockTechnicalData.yearHigh", "stockTechnicalData.52WeekHigh", "high52Week"]));
    const yearLow = numberOrNull(pick(data, ["yearLow", "stockTechnicalData.yearLow", "stockTechnicalData.52WeekLow", "low52Week"]));

    const pe = pickMetric(data, ["pe", "pE", "peRatio", "priceToEarnings", "stockPE"]);
    const eps = pickMetric(data, ["eps", "EPS", "earningsPerShare"]);
    const marketCap = pickMetric(data, ["marketCap", "marketCapitalization", "mcap"]);
    const bookValue = pickMetric(data, ["bookValue", "bookValuePerShare"]);
    const description = pick(data, ["companyProfile.companyDescription", "companyDescription", "description"]);
    const analyst = analystSummary(data);

    host.innerHTML = `
      <div class="stock-card panel">
        <div class="stock-card-head">
          <div>
            <div class="eyebrow">Indian stock • IndianAPI</div>
            <h3>${escapeHTML(company)}</h3>
            <p>${escapeHTML([sector, industry].filter(Boolean).join(" • ") || "Indian listed company")}</p>
          </div>
          <div class="stock-price-block">
            <strong>${formatMoney(nsePrice ?? bsePrice)}</strong>
            ${change === null ? "" : `<span class="stock-change ${change >= 0 ? "up" : "down"}">${change >= 0 ? "+" : ""}${formatNumber(change)}%</span>`}
          </div>
        </div>

        <div class="stock-symbols">
          <span>NSE: <strong>${escapeHTML(String(nse))}</strong></span>
          <span>BSE: <strong>${escapeHTML(String(bse))}</strong></span>
          ${nsePrice !== null && bsePrice !== null ? `<span>BSE price: <strong>${formatMoney(bsePrice)}</strong></span>` : ""}
        </div>

        <div class="stock-metrics">
          ${metricCard("52W High", formatMoney(yearHigh))}
          ${metricCard("52W Low", formatMoney(yearLow))}
          ${metricCard("P/E", formatMetric(pe))}
          ${metricCard("EPS", formatMetric(eps, "₹"))}
          ${metricCard("Market Cap", formatMarketCap(marketCap))}
          ${metricCard("Book Value", formatMetric(bookValue, "₹"))}
        </div>

        ${analyst ? `<div class="stock-insight"><strong>Analyst view</strong><span>${escapeHTML(analyst)}</span></div>` : ""}
        ${description ? `<p class="stock-description">${escapeHTML(String(description)).slice(0, 700)}</p>` : ""}
        <div class="notice">
          Educational stock research only. Market prices can be delayed and may be stale when exchanges are closed.
          Verify data before making any investment decision.
        </div>
      </div>
    `;
  }

  function analystSummary(data) {
    const view = pick(data, ["analystView", "recosBar", "stockTechnicalData.overallRating"]);
    if (!view) return "";
    if (typeof view === "string" || typeof view === "number") return String(view);

    if (Array.isArray(view)) {
      return view.slice(0, 4).map(item => typeof item === "string" ? item : JSON.stringify(item)).join(" • ");
    }

    const preferred = ["rating", "recommendation", "consensus", "overallRating", "buy", "hold", "sell"];
    const bits = [];
    preferred.forEach(key => {
      if (view[key] !== undefined && view[key] !== null && typeof view[key] !== "object") {
        bits.push(`${prettyKey(key)}: ${view[key]}`);
      }
    });
    return bits.slice(0, 4).join(" • ");
  }

  function pickMetric(data, keys) {
    const containers = [data?.keyMetrics, data?.stockTechnicalData, data?.initialStockFinancialData, data];

    for (const container of containers) {
      if (!container || typeof container !== "object") continue;
      for (const key of keys) {
        if (container[key] !== undefined && container[key] !== null && container[key] !== "") {
          return container[key];
        }
      }
    }
    return null;
  }

  function pick(obj, paths) {
    for (const path of paths) {
      const value = path.split(".").reduce((acc, key) => acc == null ? undefined : acc[key], obj);
      if (value !== undefined && value !== null && value !== "") return value;
    }
    return null;
  }

  function metricCard(label, value) {
    return `<div class="stock-metric"><span>${escapeHTML(label)}</span><strong>${escapeHTML(value || "—")}</strong></div>`;
  }

  function formatMoney(value) {
    if (value === null || value === undefined || value === "") return "—";
    const number = Number(value);
    if (!Number.isFinite(number)) return String(value);
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2
    }).format(number);
  }

  function formatNumber(value) {
    const number = Number(value);
    return Number.isFinite(number)
      ? number.toLocaleString("en-IN", { maximumFractionDigits: 2 })
      : "—";
  }

  function formatMetric(value, prefix = "") {
    if (value === null || value === undefined || value === "") return "—";
    if (typeof value === "object") return "—";
    const number = Number(String(value).replace(/,/g, ""));
    if (!Number.isFinite(number)) return String(value);
    return prefix + number.toLocaleString("en-IN", { maximumFractionDigits: 2 });
  }

  function formatMarketCap(value) {
    if (value === null || value === undefined || value === "") return "—";
    if (typeof value === "object") return "—";
    const number = Number(String(value).replace(/,/g, ""));
    if (!Number.isFinite(number)) return String(value);
    if (number >= 10000000) {
      return `₹${(number / 10000000).toLocaleString("en-IN", { maximumFractionDigits: 2 })} Cr`;
    }
    return `₹${number.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
  }

  function numberOrNull(value) {
    if (value === null || value === undefined || value === "") return null;
    if (typeof value === "object") return null;
    const number = Number(String(value).replace(/[₹,%\s]/g, ""));
    return Number.isFinite(number) ? number : null;
  }

  function showError(host, message) {
    if (!host) return;
    host.innerHTML = message ? `<div class="notice stock-error">${escapeHTML(message)}</div>` : "";
  }

  function showSetupMessage(message, type) {
    const host = document.getElementById("stockApiSetupMessage");
    if (!host) return;
    host.textContent = message;
    host.dataset.type = type || "";
  }

  function prettyKey(value) {
    return String(value).replace(/([A-Z])/g, " $1").replace(/^./, c => c.toUpperCase());
  }

  function debounce(fn, wait) {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), wait);
    };
  }

  function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    })[char]);
  }

  function escapeAttr(value) {
    return escapeHTML(value).replace(/`/g, "&#096;");
  }

  function injectStockStyles() {
    if (document.getElementById("plansipStockStyles")) return;

    const style = document.createElement("style");
    style.id = "plansipStockStyles";
    style.textContent = `
      .stock-search-shell{max-width:820px}
      .stock-search-results{display:grid;gap:8px;margin-top:8px}
      .stock-search-item{width:100%;border:1px solid var(--border,#dbe4df);background:var(--surface,#fff);border-radius:14px;padding:12px 14px;display:flex;align-items:center;justify-content:space-between;text-align:left;cursor:pointer;font:inherit}
      .stock-search-item:hover{transform:translateY(-1px);box-shadow:0 8px 24px rgba(0,0,0,.06)}
      .stock-search-item span:first-child{display:grid;gap:3px}
      .stock-search-item small{opacity:.68}
      .stock-arrow{font-size:26px;opacity:.5}
      .stock-mini-empty{padding:12px}
      .stock-card{margin-top:18px}
      .stock-card-head{display:flex;justify-content:space-between;gap:18px;align-items:flex-start}
      .stock-card-head h3{font-size:clamp(1.35rem,2vw,1.8rem);margin:4px 0}
      .stock-card-head p{margin:0;opacity:.72}
      .stock-price-block{text-align:right;display:grid;gap:4px}
      .stock-price-block>strong{font-size:clamp(1.45rem,2.8vw,2.2rem)}
      .stock-change{font-weight:800}
      .stock-change.up{color:#087a55}
      .stock-change.down{color:#b42318}
      .stock-symbols{display:flex;flex-wrap:wrap;gap:8px;margin:18px 0}
      .stock-symbols span{padding:7px 10px;border-radius:999px;background:rgba(0,122,90,.08)}
      .stock-metrics{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}
      .stock-metric{border:1px solid var(--border,#dbe4df);border-radius:14px;padding:14px;display:grid;gap:6px}
      .stock-metric span{font-size:.82rem;opacity:.66}
      .stock-metric strong{font-size:1.08rem}
      .stock-insight{margin-top:14px;padding:14px;border-radius:14px;background:rgba(0,122,90,.08);display:grid;gap:5px}
      .stock-description{line-height:1.65;opacity:.86}
      .stock-error{border-color:rgba(180,35,24,.2)}
      .stock-api-setup{margin-top:16px}
      .stock-api-setup summary{cursor:pointer;font-weight:700}
      .stock-api-row{display:grid;grid-template-columns:minmax(0,1fr) auto auto;gap:8px;margin-top:12px}
      .stock-api-note{font-size:.86rem;opacity:.7;line-height:1.5;margin-top:8px}
      #stockApiSetupMessage[data-type="success"]{color:#087a55}
      @media(max-width:720px){
        .stock-card-head{display:grid}
        .stock-price-block{text-align:left}
        .stock-metrics{grid-template-columns:repeat(2,minmax(0,1fr))}
        .stock-api-row{grid-template-columns:1fr}
        .stock-api-row .btn{width:100%}
      }
    `;
    document.head.appendChild(style);
  }
})();
