"use strict";

(() => {
  const CONFIG = {
    endpoint: window.PLANSIP_AI_ENDPOINT || "",
    cacheHours: 24,
    maxContextChars: 10000
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

  const CACHE_PREFIX = "plansip_ai_perspective_v3:";

  function init() {
    injectStyles();
    Object.entries(TOOLS).forEach(([toolId, meta]) => observeTool(toolId, meta));
  }

  function observeTool(toolId, meta) {
    const section = document.getElementById(toolId);
    const result = document.getElementById(meta.resultId);
    if (!section || !result) return;

    const ensure = () => {
      const text = cleanText(result.innerText);

      if (text.length < 20) {
        result.querySelectorAll(":scope > .plansip-ai-inline").forEach(el => el.remove());
        return;
      }

      if (!result.querySelector(`:scope > [data-ai-tool="${toolId}"]`)) {
        addControl(toolId, meta, section, result);
      }
    };

    ensure();

    new MutationObserver(() => requestAnimationFrame(ensure)).observe(result, {
      childList: true,
      subtree: true,
      characterData: true
    });
  }

  function addControl(toolId, meta, section, result) {
    const host = document.createElement("div");
    host.className = "plansip-ai-inline";
    host.dataset.aiTool = toolId;

    host.innerHTML = `
      <div class="plansip-ai-inline-head">
        <div>
          <div class="plansip-ai-inline-title"><span>✦</span> AI Perspective</div>
          <div class="plansip-ai-inline-sub">
            Uses your inputs + the raw result metrics. PlanSIP score is not used as the AI decision.
          </div>
        </div>

        <button class="btn btn-primary plansip-ai-btn" type="button">
          <span>✦</span> Ask AI
        </button>
      </div>

      <div class="plansip-ai-output" aria-live="polite"></div>
    `;

    result.insertAdjacentElement("afterbegin", host);

    const button = host.querySelector(".plansip-ai-btn");
    const output = host.querySelector(".plansip-ai-output");

    button.addEventListener("click", () =>
      runAI(toolId, meta, section, result, host, button, output)
    );
  }

  async function runAI(toolId, meta, section, result, host, button, output) {
    const rawResult = extractResultText(result);

    if (!rawResult || rawResult.length < 20) {
      show(output, "formula", "Run the PlanSIP calculation first, then ask for an AI Perspective.");
      return;
    }

    const profile = collectInputs(section);
    const rawMetrics = stripPlanSipRankingSignals(rawResult).slice(0, CONFIG.maxContextChars);

    const payload = {
      tool: toolId,
      toolLabel: meta.label,
      profile,
      rawMetrics
    };

    const cacheKey = await makeCacheKey(payload);
    const cached = readCache(cacheKey);

    if (cached) {
      show(output, "ai", cached);
      return;
    }

    if (!CONFIG.endpoint) {
      show(
        output,
        "formula",
        "AI Perspective is not configured. Your normal PlanSIP result remains available."
      );
      return;
    }

    button.disabled = true;
    button.innerHTML = "<span>✦</span> Analysing…";

    show(
      output,
      "loading",
      "AI is considering your preferences and the supplied result metrics…"
    );

    try {
      const response = await fetch(CONFIG.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      let data = {};

      try {
        data = await response.json();
      } catch (_) {}

      if (!response.ok) {
        const err = new Error(data.error || `AI_HTTP_${response.status}`);
        err.reason =
          data.reason ||
          (response.status === 429 ? "rate_limit" : "unknown");
        throw err;
      }

      const analysis = cleanText(data.analysis || data.output || "");

      if (!analysis) {
        const err = new Error("AI returned no readable answer.");
        err.reason = "empty_response";
        throw err;
      }

      writeCache(cacheKey, analysis);
      show(output, "ai", analysis);

    } catch (error) {
      show(output, "formula", fallbackMessage(error));

    } finally {
      button.disabled = false;
      button.innerHTML = "<span>✦</span> Ask AI";
    }
  }

  function extractResultText(result) {
    const clone = result.cloneNode(true);

    clone
      .querySelectorAll(".plansip-ai-inline, .plansip-result-mode-badge")
      .forEach(el => el.remove());

    return cleanText(clone.innerText);
  }

  function stripPlanSipRankingSignals(text) {
    return cleanText(text)
      .replace(/\b(?:Fund\s*)?Score\s*[:\-]?\s*\d+(?:\.\d+)?\s*\/\s*100\b/gi, "")
      .replace(/\bScore\s*[:\-]?\s*\d+(?:\.\d+)?\b/gi, "")
      .replace(/\bhighest overall score\b/gi, "")
      .replace(/\bclosest study match\b/gi, "")
      .replace(/\n{3,}/g, "\n\n");
  }

  function collectInputs(section) {
    const data = {};

    section.querySelectorAll("input, select").forEach(el => {
      if (!el.id || ["hidden", "button", "submit"].includes(el.type)) return;

      if (
        (el.type === "checkbox" || el.type === "radio") &&
        !el.checked
      ) {
        return;
      }

      const label =
        section.querySelector(`label[for="${cssEscape(el.id)}"]`)
          ?.innerText?.trim() || el.id;

      let value =
        el.type === "checkbox"
          ? Boolean(el.checked)
          : String(el.value ?? "").slice(0, 200);

      if (el.tagName === "SELECT" && el.selectedIndex >= 0) {
        const selectedText =
          el.options[el.selectedIndex]?.textContent?.trim();

        if (selectedText) value = selectedText;
      }

      data[label] = value;
    });

    section
      .querySelectorAll(
        ".segmented .active, .segmented [aria-pressed='true'], .segmented .selected"
      )
      .forEach((el, index) => {
        const value = cleanText(el.innerText || el.textContent);

        if (value) {
          data[`Selected option ${index + 1}`] = value;
        }
      });

    return data;
  }

  function fallbackMessage(error) {
    switch (error?.reason) {
      case "quota":
        return "Today's free AI allocation is finished. Your normal PlanSIP result remains available.";

      case "capacity":
        return "AI is temporarily busy. Your PlanSIP result is unaffected; try Ask AI again shortly.";

      case "rate_limit":
        return "AI is receiving too many requests right now. Your PlanSIP result is unaffected; try again shortly.";

      case "empty_response":
        return "AI did not return a readable perspective this time. Your normal PlanSIP result remains available.";

      default:
        return `${error?.message || "AI is temporarily unavailable."} Your normal PlanSIP result remains available.`;
    }
  }

  function show(output, mode, text) {
    output.className = `plansip-ai-output is-${mode}`;
    output.textContent = text;
  }

  function cleanText(value) {
    return String(value || "")
      .replace(/\u00a0/g, " ")
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  function readCache(key) {
    try {
      const item =
        JSON.parse(localStorage.getItem(CACHE_PREFIX + key) || "null");

      if (
        !item ||
        Date.now() - item.time > CONFIG.cacheHours * 3600000
      ) {
        return "";
      }

      return item.value || "";

    } catch (_) {
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
    } catch (_) {}
  }

  async function makeCacheKey(payload) {
    const text = JSON.stringify(payload);

    if (window.crypto?.subtle) {
      const hash =
        await crypto.subtle.digest(
          "SHA-256",
          new TextEncoder().encode(text)
        );

      return Array
        .from(new Uint8Array(hash))
        .map(b => b.toString(16).padStart(2, "0"))
        .join("");
    }

    let h = 2166136261;

    for (let i = 0; i < text.length; i++) {
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
          .replace(/[^a-zA-Z0-9_-]/g, "\\$&");
  }

  function injectStyles() {
    if (
      document.getElementById(
        "plansip-ai-perspective-styles"
      )
    ) {
      return;
    }

    const style =
      document.createElement("style");

    style.id =
      "plansip-ai-perspective-styles";

    style.textContent = `
      .plansip-ai-inline {
        margin: 0 0 16px;
        padding: 14px 16px;
        border-radius: 16px;
        border: 1px solid rgba(124,58,237,.22);
        background:
          linear-gradient(
            135deg,
            rgba(124,58,237,.07),
            rgba(14,165,233,.05)
          );
      }

      .plansip-ai-inline-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 14px;
      }

      .plansip-ai-inline-title {
        font-weight: 850;
        font-size: 1rem;
      }

      .plansip-ai-inline-title span {
        margin-right: 5px;
      }

      .plansip-ai-inline-sub {
        margin-top: 3px;
        font-size: .82rem;
        opacity: .72;
      }

      .plansip-ai-btn {
        white-space: nowrap;
      }

      .plansip-ai-output {
        display: none;
        margin-top: 12px;
        padding: 13px 14px;
        border-radius: 13px;
        white-space: pre-wrap;
        line-height: 1.55;
        font-size: .93rem;
      }

      .plansip-ai-output:not(:empty) {
        display: block;
      }

      .plansip-ai-output.is-ai {
        border:
          1px solid
          rgba(124,58,237,.20);

        background:
          rgba(124,58,237,.06);
      }

      .plansip-ai-output.is-loading {
        border:
          1px solid
          rgba(14,165,233,.20);

        background:
          rgba(14,165,233,.06);
      }

      .plansip-ai-output.is-formula {
        border:
          1px solid
          rgba(245,158,11,.20);

        background:
          rgba(245,158,11,.06);
      }

      @media (max-width: 640px) {
        .plansip-ai-inline-head {
          align-items: stretch;
          flex-direction: column;
        }

        .plansip-ai-btn {
          width: 100%;
        }
      }
    `;

    document.head.appendChild(style);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
