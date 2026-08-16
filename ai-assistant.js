"use strict";

(() => {
  const CONFIG = {
    endpoint: window.PLANSIP_AI_ENDPOINT || "",
    cacheHours: 24,
    maxContextChars: 12000
  };

  const TOOLS = {
    find: { label: "Find Funds", resultId: "recommendationResults" },
    sipcalc: { label: "SIP Calculator", resultId: "sipCalcResults" },
    salary: { label: "Salary Planner", resultId: "salaryResults" },
    loan: { label: "Loan Freedom", resultId: "loanResults" },
    freedom: { label: "Freedom Goals", resultId: "freedomResults" },
    corpus: { label: "Corpus", resultId: "corpusResults" },
    metals: { label: "Gold / Silver", resultId: "metalResults" },
    sip: { label: "SIP Replay", resultId: "sipResults" },
    compare: { label: "Compare Funds", resultId: "compareResults" },
    popular: { label: "Popular Funds", resultId: "popularResults" }
  };

  const CACHE_PREFIX = "plansip_ai_v2:";

  function initAI() {
    injectStyles();
    injectGlobalAIIdentity();
    Object.entries(TOOLS).forEach(([toolId, meta]) => setupTool(toolId, meta));
  }

  function injectGlobalAIIdentity() {
    const hero = document.querySelector(".hero");
    if (!hero || document.querySelector(".plansip-ai-global-chip")) return;

    const chip = document.createElement("div");
    chip.className = "plansip-ai-global-chip";
    chip.innerHTML = `
      <span class="plansip-ai-spark">✦</span>
      <span><strong>AI-assisted analysis</strong> with PlanSIP formula fallback</span>
    `;
    hero.insertAdjacentElement("afterend", chip);
  }

  function setupTool(toolId, meta) {
    const section = document.getElementById(toolId);
    const result = document.getElementById(meta.resultId);

    if (!section || !result || document.querySelector(`[data-ai-tool="${toolId}"]`)) {
      return;
    }

    const host = document.createElement("div");
    host.className = "plansip-ai-host";
    host.dataset.aiTool = toolId;

    host.innerHTML = `
      <div class="plansip-ai-card">
        <div class="plansip-ai-glow"></div>

        <div class="plansip-ai-head">
          <div>
            <div class="plansip-ai-kicker">
              <span>✦</span> AI-ASSISTED
            </div>

            <div class="plansip-ai-title">
              AI Suggest for ${escapeHTML(meta.label)}
            </div>

            <div class="plansip-ai-sub">
              PlanSIP calculates first. AI then explains the calculated result.
            </div>
          </div>

          <button class="btn btn-primary plansip-ai-btn" type="button">
            <span>✦</span> Ask AI
          </button>
        </div>

        <div class="plansip-ai-status">
          <span class="plansip-ai-dot"></span>
          <span>
            If AI quota is reached, PlanSIP automatically uses the formula result.
          </span>
        </div>

        <div class="plansip-ai-output" aria-live="polite"></div>
      </div>
    `;

    result.insertAdjacentElement("afterend", host);

    const button = host.querySelector(".plansip-ai-btn");
    const output = host.querySelector(".plansip-ai-output");

    button.addEventListener("click", () => {
      runAI(toolId, meta, section, result, button, output);
    });
  }

  async function runAI(toolId, meta, section, result, button, output) {
    const resultText = cleanText(result.innerText);

    if (!resultText || resultText.length < 20) {
      setResultMode(result, "formula");

      show(
        output,
        "formula",
        "Run the PlanSIP calculation first. AI Suggest uses the calculated result."
      );

      return;
    }

    const payload = {
      tool: toolId,
      toolLabel: meta.label,
      inputs: collectInputs(section),
      results: resultText.slice(0, CONFIG.maxContextChars)
    };

    const cacheKey = await makeCacheKey(payload);
    const cached = readCache(cacheKey);

    if (cached) {
      setResultMode(result, "ai");
      show(output, "ai", cached + "\n\n✦ AI-assisted result");
      return;
    }

    if (!CONFIG.endpoint) {
      setResultMode(result, "formula");
      showFormulaFallback(
        output,
        resultText,
        "Cloudflare Workers AI endpoint is not configured."
      );
      return;
    }

    button.disabled = true;
    button.innerHTML = "<span>✦</span> AI analysing…";

    setResultMode(result, "pending");

    show(
      output,
      "loading",
      "AI is analysing your PlanSIP formula result…"
    );

    try {
      const response = await fetch(CONFIG.endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      if ([402, 429, 503].includes(response.status)) {
        throw new Error("AI_LIMIT");
      }

      if (!response.ok) {
        throw new Error(`AI_HTTP_${response.status}`);
      }

      const data = await response.json();

      const analysis = cleanText(
        data.analysis || data.output || ""
      );

      if (!analysis) {
        throw new Error("AI_EMPTY");
      }

      writeCache(cacheKey, analysis);

      setResultMode(result, "ai");

      show(output, "ai", analysis);

    } catch (error) {

      setResultMode(result, "formula");

      const reason =
        error?.message === "AI_LIMIT"
          ? "Cloudflare Workers AI free quota / rate limit is reached."
          : "Cloudflare Workers AI is temporarily unavailable.";

      showFormulaFallback(output, resultText, reason);

    } finally {

      button.disabled = false;

      button.innerHTML =
        "<span>✦</span> Ask AI";
    }
  }

  function collectInputs(section) {
    const data = {};

    section
      .querySelectorAll("input, select")
      .forEach((el) => {

        if (
          !el.id ||
          ["hidden", "button", "submit"].includes(el.type)
        ) {
          return;
        }

        if (
          (el.type === "checkbox" ||
            el.type === "radio") &&
          !el.checked
        ) {
          return;
        }

        const label =
          section.querySelector(
            `label[for="${cssEscape(el.id)}"]`
          )?.innerText?.trim() || el.id;

        data[label] =
          el.type === "checkbox"
            ? Boolean(el.checked)
            : String(el.value ?? "").slice(0, 200);
      });

    return data;
  }

  function setResultMode(result, mode) {
    result.classList.remove(
      "plansip-result-ai-assisted",
      "plansip-result-ai-pending",
      "plansip-result-formula"
    );

    const oldBadge =
      result.querySelector(
        ":scope > .plansip-result-mode-badge"
      );

    if (oldBadge) {
      oldBadge.remove();
    }

    const badge =
      document.createElement("div");

    badge.className =
      "plansip-result-mode-badge";

    if (mode === "ai") {

      result.classList.add(
        "plansip-result-ai-assisted"
      );

      badge.innerHTML =
        "<span>✦</span> AI-assisted result";

    } else if (mode === "pending") {

      result.classList.add(
        "plansip-result-ai-pending"
      );

      badge.innerHTML =
        "<span>✦</span> AI analysing formula result";

    } else {

      result.classList.add(
        "plansip-result-formula"
      );

      badge.innerHTML =
        "<span>ƒx</span> PlanSIP formula result";
    }

    if (result.children.length) {
      result.insertAdjacentElement(
        "afterbegin",
        badge
      );
    }
  }

  function showFormulaFallback(
    output,
    resultText,
    reason
  ) {

    const summary =
      resultText.length > 1800
        ? resultText.slice(0, 1800) + "…"
        : resultText;

    show(
      output,
      "formula",
      `${reason}

PlanSIP Formula Fallback

${summary}

AI will be tried again the next time you press Ask AI.`
    );
  }

  function show(output, mode, text) {
    output.className =
      `plansip-ai-output is-${mode}`;

    output.textContent = text;
  }

  function cleanText(value) {
    return String(value || "")
      .replace(/\u00a0/g, " ")
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  function escapeHTML(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }

  function readCache(key) {
    try {

      const item =
        JSON.parse(
          localStorage.getItem(
            CACHE_PREFIX + key
          ) || "null"
        );

      if (
        !item ||
        Date.now() - item.time >
          CONFIG.cacheHours * 3600000
      ) {
        return "";
      }

      return item.value || "";

    } catch {
      return "";
    }
  }

  function writeCache(key, value) {
    try {

      localStorage.setItem(
        CACHE_PREFIX + key,
        JSON.stringify({
          time: Date.now(),
          value
        })
      );

    } catch {}
  }

  async function makeCacheKey(payload) {

    const text =
      JSON.stringify(payload);

    if (window.crypto?.subtle) {

      const hash =
        await crypto.subtle.digest(
          "SHA-256",
          new TextEncoder().encode(text)
        );

      return Array
        .from(new Uint8Array(hash))
        .map(
          b =>
            b
              .toString(16)
              .padStart(2, "0")
        )
        .join("");
    }

    let h = 2166136261;

    for (
      let i = 0;
      i < text.length;
      i++
    ) {

      h =
        Math.imul(
          h ^ text.charCodeAt(i),
          16777619
        );
    }

    return (h >>> 0).toString(16);
  }

  function cssEscape(value) {

    return window.CSS?.escape
      ? CSS.escape(value)
      : String(value)
          .replace(
            /[^a-zA-Z0-9_-]/g,
            "\\$&"
          );
  }

  function injectStyles() {

    const style =
      document.createElement("style");

    style.textContent = `

      .plansip-ai-global-chip {
        width: min(1180px, calc(100% - 32px));
        margin: 12px auto 0;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        padding: 10px 14px;
        border-radius: 999px;
        border: 1px solid rgba(124,58,237,.20);
        background:
          linear-gradient(
            90deg,
            rgba(124,58,237,.08),
            rgba(14,165,233,.08),
            rgba(16,185,129,.08)
          );
        font-size: .88rem;
      }

      .plansip-ai-host {
        margin: 18px 0 30px;
      }

      .plansip-ai-card {
        position: relative;
        overflow: hidden;
        border:
          1px solid
          rgba(124,58,237,.24);
        border-radius: 20px;
        padding: 20px;

        background:
          radial-gradient(
            circle at 100% 0,
            rgba(14,165,233,.10),
            transparent 35%
          ),
          radial-gradient(
            circle at 0 100%,
            rgba(124,58,237,.10),
            transparent 38%
          ),
          var(--panel,#fff);

        box-shadow:
          0 16px 40px
          rgba(30,41,59,.08);
      }

      .plansip-ai-glow {
        position: absolute;
        width: 140px;
        height: 140px;
        right: -55px;
        top: -65px;
        border-radius: 50%;
        background:
          rgba(124,58,237,.12);
        filter: blur(18px);
      }

      .plansip-ai-head {
        position: relative;
        display: flex;
        gap: 16px;
        align-items: center;
        justify-content:
          space-between;
      }

      .plansip-ai-kicker {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        font-size: .72rem;
        font-weight: 900;
        letter-spacing: .13em;
        padding: 6px 9px;
        border-radius: 999px;
        background:
          linear-gradient(
            90deg,
            rgba(124,58,237,.14),
            rgba(14,165,233,.13)
          );
      }

      .plansip-ai-title {
        margin-top: 9px;
        font-weight: 850;
        font-size: 1.16rem;
      }

      .plansip-ai-sub {
        margin-top: 5px;
        font-size: .91rem;
        opacity: .74;
      }

      .plansip-ai-btn {
        min-width: 118px;
      }

      .plansip-ai-status {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-top: 14px;
        padding-top: 13px;
        border-top:
          1px dashed
          rgba(124,58,237,.18);
        font-size: .82rem;
        opacity: .74;
      }

      .plansip-ai-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: #22c55e;
      }

      .plansip-ai-output {
        display: none;
        margin-top: 15px;
        padding: 16px;
        border-radius: 15px;
        white-space: pre-wrap;
        line-height: 1.58;
        font-size: .95rem;
      }

      .plansip-ai-output:not(:empty) {
        display: block;
      }

      .plansip-ai-output.is-ai {
        border:
          1px solid
          rgba(124,58,237,.22);

        background:
          linear-gradient(
            135deg,
            rgba(124,58,237,.09),
            rgba(14,165,233,.07)
          );
      }

      .plansip-ai-output.is-formula {
        border:
          1px solid
          rgba(245,158,11,.26);

        background:
          rgba(245,158,11,.08);
      }

      .plansip-ai-output.is-loading {
        border:
          1px solid
          rgba(14,165,233,.22);

        background:
          rgba(14,165,233,.07);
      }

      .plansip-result-mode-badge {
        width: max-content;
        max-width: 100%;
        display: flex;
        align-items: center;
        gap: 6px;
        margin: 0 0 12px;
        padding: 6px 10px;
        border-radius: 999px;
        font-size: .72rem;
        font-weight: 850;
      }

      .plansip-result-ai-assisted {
        position: relative;
        border-radius: 18px;
        outline:
          2px solid
          rgba(124,58,237,.20);

        box-shadow:
          0 0 0 5px
          rgba(124,58,237,.05),
          0 16px 36px
          rgba(124,58,237,.07);
      }

      .plansip-result-ai-assisted
      > .plansip-result-mode-badge {
        color: #5b21b6;

        background:
          linear-gradient(
            90deg,
            rgba(124,58,237,.14),
            rgba(14,165,233,.12)
          );
      }

      .plansip-result-ai-pending {
        border-radius: 18px;
        outline:
          2px dashed
          rgba(14,165,233,.22);
      }

      .plansip-result-formula
      > .plansip-result-mode-badge {
        background:
          rgba(245,158,11,.10);
      }

      @media(max-width:640px) {

        .plansip-ai-head {
          align-items: stretch;
          flex-direction: column;
        }

        .plansip-ai-btn {
          width: 100%;
        }

        .plansip-ai-global-chip {
          border-radius: 16px;
          text-align: center;
        }
      }
    `;

    document.head.appendChild(style);
  }

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      initAI
    );
  } else {
    initAI();
  }
})();
