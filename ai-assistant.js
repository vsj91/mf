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

  const CACHE_PREFIX = "plansip_ai_perspective_v7:";

  function init() {
    injectStyles();

    Object.entries(TOOLS).forEach(([toolId, meta]) => {
      observeTool(toolId, meta);
    });
  }

  function observeTool(toolId, meta) {
    const section = document.getElementById(toolId);
    const result = document.getElementById(meta.resultId);

    if (!section || !result) return;

    const ensure = () => {
      const text = extractResultText(result);

      if (text.length < 20) {
        result
          .querySelectorAll(".plansip-ai-inline")
          .forEach(el => el.remove());

        return;
      }

      if (!result.querySelector(`[data-ai-tool="${toolId}"]`)) {
        addAIControl(toolId, meta, section, result);
      }
    };

    ensure();

    new MutationObserver(() => {
      requestAnimationFrame(ensure);
    }).observe(result, {
      childList: true,
      subtree: true,
      characterData: true
    });
  }

  function addAIControl(toolId, meta, section, result) {
    const host = document.createElement("section");

    host.className = "plansip-ai-inline";
    host.dataset.aiTool = toolId;

    host.innerHTML = `
      <div class="plansip-ai-head">
        <div>
          <h3 class="plansip-ai-title">
            <span>✦</span> AI Perspective
          </h3>

          <div class="plansip-ai-sub">
            A second perspective based on your goal, risk and historical data.
          </div>
        </div>

        <button
          class="btn btn-primary plansip-ai-btn"
          type="button"
        >
          <span>✦</span> Ask AI
        </button>
      </div>

      <div
        class="plansip-ai-output"
        aria-live="polite"
      ></div>
    `;

    insertAIHost(result, host);

    const button =
      host.querySelector(".plansip-ai-btn");

    const output =
      host.querySelector(".plansip-ai-output");

    button.addEventListener("click", () => {
      runAI(
        toolId,
        meta,
        section,
        result,
        button,
        output
      );
    });
  }

  function insertAIHost(result, host) {
    const analysisHeading =
      Array.from(
        result.querySelectorAll("h2, h3, h4")
      ).find(
        el =>
          cleanText(el.textContent)
            .toLowerCase() === "analysis view"
      );

    if (analysisHeading) {
      const analysisCard =
        analysisHeading.closest(".study-mix");

      if (analysisCard) {
        analysisCard.insertAdjacentElement(
          "beforebegin",
          host
        );

        return;
      }
    }

    const firstHeading =
      result.querySelector("h2, h3");

    if (firstHeading) {
      firstHeading.insertAdjacentElement(
        "afterend",
        host
      );

      return;
    }

    result.prepend(host);
  }

  async function runAI(
    toolId,
    meta,
    section,
    result,
    button,
    output
  ) {
    const rawResult =
      extractResultText(result);

    if (!rawResult || rawResult.length < 20) {
      renderMessage(
        output,
        "Run the PlanSIP calculation first."
      );

      return;
    }

    const profile =
      collectInputs(section);

    const deterministicRows =
      toolId === "find"
        ? extractFindFundRows(result)
        : [];

    const payload = {
      tool: toolId,
      toolLabel: meta.label,
      profile,
      rawMetrics:
        stripRankingSignals(rawResult)
          .slice(0, CONFIG.maxContextChars)
    };

    const cacheKey =
      await makeCacheKey({
        payload,
        deterministicRows
      });

    const cached =
      readCache(cacheKey);

    if (cached) {
      renderPerspective(
        output,
        cached,
        deterministicRows
      );

      return;
    }

    if (!CONFIG.endpoint) {
      renderMessage(
        output,
        "AI Perspective is temporarily unavailable."
      );

      return;
    }

    button.disabled = true;
    button.innerHTML =
      "<span>✦</span> Analysing…";

    renderLoading(output);

    try {
      const response =
        await fetch(CONFIG.endpoint, {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json"
          },
          body:
            JSON.stringify(payload)
        });

      let data = {};

      try {
        data =
          await response.json();
      } catch (_) {}

      if (!response.ok) {
        const error =
          new Error(
            data.error ||
            `AI_HTTP_${response.status}`
          );

        error.reason =
          data.reason ||
          "unknown";

        throw error;
      }

      const perspective =
        validatePerspective(
          data?.perspective
        );

      if (!perspective) {
        const error =
          new Error(
            "AI returned invalid response format."
          );

        error.reason =
          "invalid_format";

        throw error;
      }

      writeCache(
        cacheKey,
        perspective
      );

      renderPerspective(
        output,
        perspective,
        deterministicRows
      );

    } catch (error) {
      renderError(
        output,
        error
      );

    } finally {
      button.disabled = false;

      button.innerHTML =
        "<span>✦</span> Ask AI";
    }
  }

  /*
   * FIND FUNDS:
   * Parse fund cards directly from the HTML.
   * AI does NOT decide the labels.
   */
  function extractFindFundRows(result) {
    const cards =
      Array.from(
        result.querySelectorAll(
          ".fund-card"
        )
      );

    const funds = cards
      .map(card => {
        const name =
          cleanText(
            card.querySelector(
              "h3"
            )?.textContent ||
            ""
          );

        const category =
          cleanText(
            card.querySelector(
              ".fund-category"
            )?.textContent ||
            card.querySelector(
              ".meta-line"
            )?.textContent ||
            ""
          );

        const text =
          cleanText(
            card.innerText
          );

        const y3 =
          extractMetric(
            text,
            /3Y CAGR\s*([+-]?\d+(?:\.\d+)?)%/i
          );

        const y5 =
          extractMetric(
            text,
            /5Y CAGR\s*([+-]?\d+(?:\.\d+)?)%/i
          );

        if (!name) return null;

        return {
          name:
            shortenFundName(name),

          fullName:
            name,

          category,

          y3,
          y5
        };
      })
      .filter(Boolean)
      .slice(0, 3);

    if (!funds.length) {
      return [];
    }

    return buildFundLabels(funds);
  }

  function buildFundLabels(funds) {
    const comparable =
      funds.filter(
        fund =>
          Number.isFinite(fund.y3) &&
          Number.isFinite(fund.y5)
      );

    if (!comparable.length) {
      return funds.map(fund => ({
        name: fund.name,
        metric: buildMetric(fund),
        note: "Review history"
      }));
    }

    /*
     * Identify best combined
     * 3Y + 5Y return evidence.
     */
    const sorted =
      [...comparable].sort(
        (a, b) =>
          ((b.y3 + b.y5) / 2) -
          ((a.y3 + a.y5) / 2)
      );

    const leader =
      sorted[0];

    const second =
      sorted[1];

    const categoryGroups =
      funds.map(fund =>
        normalizeCategory(
          fund.category
        )
      );

    const categoryDifferent =
      new Set(
        categoryGroups.filter(Boolean)
      ).size > 1;

    return funds.map(fund => {
      let note =
        "Historical comparison";

      if (
        leader &&
        fund.fullName ===
          leader.fullName
      ) {
        if (
          second &&
          Math.abs(
            leader.y5 -
            second.y5
          ) < 0.5 &&
          Math.abs(
            leader.y3 -
            second.y3
          ) < 0.5
        ) {
          note =
            "Slight historical edge";
        } else {
          note =
            "Historical standout";
        }
      } else if (
        second &&
        fund.fullName ===
          second.fullName &&
        leader &&
        Math.abs(
          leader.y5 -
          second.y5
        ) < 0.5
      ) {
        note =
          "Very close alternative";
      }

      if (
        categoryDifferent &&
        leader &&
        normalizeCategory(
          fund.category
        ) !==
        normalizeCategory(
          leader.category
        )
      ) {
        note =
          "Different fund category";
      }

      return {
        name:
          fund.name,

        metric:
          buildMetric(fund),

        note
      };
    });
  }

  function normalizeCategory(category) {
    const text =
      cleanText(category)
        .toLowerCase();

    if (!text) return "";

    if (
      text.includes("balanced advantage") ||
      text.includes("dynamic asset allocation")
    ) {
      return "balanced-advantage";
    }

    if (
      text.includes("index fund") ||
      text.includes("index funds") ||
      text.includes("nifty")
    ) {
      return "index";
    }

    if (
      text.includes("small cap")
    ) {
      return "small-cap";
    }

    if (
      text.includes("mid cap")
    ) {
      return "mid-cap";
    }

    if (
      text.includes("large cap")
    ) {
      return "large-cap";
    }

    if (
      text.includes("flexi cap")
    ) {
      return "flexi-cap";
    }

    return text
      .split("•")[0]
      .trim()
      .slice(0, 60);
  }

  function buildMetric(fund) {
    const parts = [];

    if (Number.isFinite(fund.y3)) {
      parts.push(
        `3Y ${fund.y3.toFixed(1)}%`
      );
    }

    if (Number.isFinite(fund.y5)) {
      parts.push(
        `5Y ${fund.y5.toFixed(1)}%`
      );
    }

    return parts.length
      ? parts.join(" • ")
      : "Historical data available";
  }

  function extractMetric(
    text,
    regex
  ) {
    const match =
      text.match(regex);

    if (!match) {
      return NaN;
    }

    const value =
      Number(match[1]);

    return Number.isFinite(value)
      ? value
      : NaN;
  }

  function shortenFundName(name) {
    return cleanText(name)
      .replace(
        /\s*-\s*Direct.*$/i,
        ""
      )
      .replace(
        /\s*Direct Plan.*$/i,
        ""
      )
      .replace(
        /\s*Fund\s*$/i,
        ""
      )
      .trim()
      .slice(0, 48);
  }

  function validatePerspective(value) {
    if (
      !value ||
      typeof value !== "object"
    ) {
      return null;
    }

    const headline =
      cleanText(
        value.headline ||
        ""
      );

    const summary =
      cleanText(
        value.summary ||
        ""
      );

    const positive =
      cleanText(
        value.positive ||
        ""
      );

    const watch =
      cleanText(
        value.watch ||
        ""
      );

    if (
      !headline &&
      !summary &&
      !positive &&
      !watch
    ) {
      return null;
    }

    return {
      headline:
        headline ||
        "AI Perspective",

      summary,

      positive,

      watch
    };
  }

  function renderPerspective(
    output,
    perspective,
    rows
  ) {
    output.className =
      "plansip-ai-output is-ready";

    const rowsHTML =
      Array.isArray(rows) &&
      rows.length
        ? `
          <div class="plansip-ai-items">
            ${rows.map(
              item => `
                <div class="plansip-ai-item">
                  <div class="plansip-ai-item-main">
                    <div class="plansip-ai-item-name">
                      ${escapeHTML(
                        item.name
                      )}
                    </div>

                    <div class="plansip-ai-item-metric">
                      ${escapeHTML(
                        item.metric
                      )}
                    </div>
                  </div>

                  <div class="plansip-ai-item-note">
                    ${escapeHTML(
                      item.note
                    )}
                  </div>
                </div>
              `
            ).join("")}
          </div>
        `
        : "";

    output.innerHTML = `
      <div class="plansip-ai-result">

        <div class="plansip-ai-result-headline">
          ${escapeHTML(
            perspective.headline
          )}
        </div>

        ${
          perspective.summary
            ? `
              <div class="plansip-ai-result-summary">
                ${escapeHTML(
                  perspective.summary
                )}
              </div>
            `
            : ""
        }

        ${rowsHTML}

        ${
          perspective.positive ||
          perspective.watch
            ? `
              <div class="plansip-ai-insights">

                ${
                  perspective.positive
                    ? `
                      <div class="plansip-ai-insight plansip-ai-good">
                        <span>✓</span>
                        <span>
                          ${escapeHTML(
                            perspective.positive
                          )}
                        </span>
                      </div>
                    `
                    : ""
                }

                ${
                  perspective.watch
                    ? `
                      <div class="plansip-ai-insight plansip-ai-watch">
                        <span>⚠</span>
                        <span>
                          ${escapeHTML(
                            perspective.watch
                          )}
                        </span>
                      </div>
                    `
                    : ""
                }

              </div>
            `
            : ""
        }

        <div class="plansip-ai-disclaimer">
          Educational analysis only — not investment advice.
        </div>
      </div>
    `;
  }

  function renderLoading(output) {
    output.className =
      "plansip-ai-output is-loading";

    output.innerHTML = `
      <div class="plansip-ai-loading">
        <span class="plansip-ai-spinner"></span>
        <span>
          Creating a short AI perspective…
        </span>
      </div>
    `;
  }

  function renderMessage(
    output,
    message
  ) {
    output.className =
      "plansip-ai-output is-message";

    output.innerHTML = `
      <div class="plansip-ai-message">
        ${escapeHTML(message)}
      </div>
    `;
  }

  function renderError(
    output,
    error
  ) {
    let message =
      "AI is temporarily unavailable. Your PlanSIP result remains available.";

    if (
      error?.reason === "quota"
    ) {
      message =
        "AI usage is unavailable right now. Your PlanSIP result remains available.";
    } else if (
      error?.reason === "capacity"
    ) {
      message =
        "AI is busy right now. Please try again shortly.";
    } else if (
      error?.reason === "rate_limit"
    ) {
      message =
        "Too many AI requests right now. Please try again shortly.";
    } else if (
      error?.reason === "invalid_format"
    ) {
      message =
        "AI returned an invalid perspective. Please try again.";
    }

    renderMessage(
      output,
      message
    );
  }

  function extractResultText(result) {
    const clone =
      result.cloneNode(true);

    clone
      .querySelectorAll(
        ".plansip-ai-inline, .plansip-result-mode-badge"
      )
      .forEach(
        el => el.remove()
      );

    return cleanText(
      clone.innerText
    );
  }

  function stripRankingSignals(text) {
    return cleanText(text)
      .replace(
        /\b(?:Fund\s*)?Score\s*[:\-]?\s*\d+(?:\.\d+)?\s*\/\s*100\b/gi,
        ""
      )
      .replace(
        /\bScore\s*[:\-]?\s*\d+(?:\.\d+)?\b/gi,
        ""
      )
      .replace(
        /\bClosest study match\b/gi,
        ""
      )
      .replace(
        /\n{3,}/g,
        "\n\n"
      );
  }

  function collectInputs(section) {
    const data = {};

    section
      .querySelectorAll(
        "input, select"
      )
      .forEach(
        el => {
          if (
            !el.id ||
            [
              "hidden",
              "button",
              "submit"
            ].includes(el.type)
          ) {
            return;
          }

          if (
            (
              el.type === "checkbox" ||
              el.type === "radio"
            ) &&
            !el.checked
          ) {
            return;
          }

          const label =
            section.querySelector(
              `label[for="${cssEscape(
                el.id
              )}"]`
            )
              ?.innerText
              ?.trim() ||
            el.id;

          let value =
            el.type === "checkbox"
              ? Boolean(el.checked)
              : String(
                  el.value ?? ""
                ).slice(0, 200);

          if (
            el.tagName === "SELECT" &&
            el.selectedIndex >= 0
          ) {
            const selectedText =
              el.options[
                el.selectedIndex
              ]?.textContent
                ?.trim();

            if (selectedText) {
              value =
                selectedText;
            }
          }

          data[label] =
            value;
        }
      );

    section
      .querySelectorAll(
        ".segmented .selected, .segmented .active, .segmented [aria-pressed='true']"
      )
      .forEach(
        (el, index) => {
          const value =
            cleanText(
              el.textContent
            );

          if (value) {
            data[
              `Selected option ${index + 1}`
            ] = value;
          }
        }
      );

    return data;
  }

  function cleanText(value) {
    return String(
      value || ""
    )
      .replace(
        /\u00a0/g,
        " "
      )
      .replace(
        /[ \t]+\n/g,
        "\n"
      )
      .replace(
        /\n{3,}/g,
        "\n\n"
      )
      .trim();
  }

  function escapeHTML(value) {
    return String(
      value ?? ""
    )
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
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
        Date.now() -
          item.time >
          CONFIG.cacheHours *
            3600000
      ) {
        return null;
      }

      return item.value || null;

    } catch (_) {
      return null;
    }
  }

  function writeCache(
    key,
    value
  ) {
    try {
      localStorage.setItem(
        CACHE_PREFIX + key,
        JSON.stringify({
          time:
            Date.now(),
          value
        })
      );
    } catch (_) {}
  }

  async function makeCacheKey(payload) {
    const text =
      JSON.stringify(payload);

    if (
      window.crypto?.subtle
    ) {
      const hash =
        await crypto.subtle.digest(
          "SHA-256",
          new TextEncoder()
            .encode(text)
        );

      return Array
        .from(
          new Uint8Array(hash)
        )
        .map(
          byte =>
            byte
              .toString(16)
              .padStart(2, "0")
        )
        .join("");
    }

    let hash =
      2166136261;

    for (
      let i = 0;
      i < text.length;
      i++
    ) {
      hash =
        Math.imul(
          hash ^
            text.charCodeAt(i),
          16777619
        );
    }

    return (
      hash >>> 0
    ).toString(16);
  }

  function injectStyles() {
    if (
      document.getElementById(
        "plansip-ai-v7-styles"
      )
    ) {
      return;
    }

    const style =
      document.createElement(
        "style"
      );

    style.id =
      "plansip-ai-v7-styles";

    style.textContent = `
      .plansip-ai-inline {
        color-scheme: inherit;
        margin: 14px 0;
        border: 1px solid var(--line);
        border-radius: 24px;
        background: var(--surface-elevated);
        color: var(--ink);
        padding: 18px;
        box-shadow:
          0 16px 42px
          rgba(29,29,31,.06);
      }

      .plansip-ai-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
      }

      .plansip-ai-title {
        margin: 0;
        color: var(--ink);
        font-size: 20px;
        font-weight: 850;
      }

      .plansip-ai-title span {
        color: var(--brand);
        margin-right: 5px;
      }

      .plansip-ai-sub {
        margin-top: 5px;
        color: var(--muted);
        font-size: 13px;
        line-height: 1.4;
      }

      .plansip-ai-btn {
        min-height: 42px;
        padding: 0 16px;
        white-space: nowrap;
      }

      .plansip-ai-output {
        display: none;
        margin-top: 16px;
      }

      .plansip-ai-output:not(:empty) {
        display: block;
      }

      .plansip-ai-result {
        display: grid;
        gap: 12px;
      }

      .plansip-ai-result-headline {
        color: var(--ink);
        font-size: 17px;
        font-weight: 850;
      }

      .plansip-ai-result-summary {
        color: var(--muted);
        font-size: 14px;
        line-height: 1.5;
      }

      .plansip-ai-items {
        display: grid;
        gap: 9px;
      }

      .plansip-ai-item {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 14px;
        padding: 12px 14px;
        border: 1px solid var(--line);
        border-radius: 18px;
        background: var(--paper);
      }

      .plansip-ai-item-main {
        min-width: 0;
      }

      .plansip-ai-item-name {
        color: var(--ink);
        font-size: 14px;
        font-weight: 800;
      }

      .plansip-ai-item-metric {
        margin-top: 3px;
        color: var(--muted);
        font-size: 12px;
      }

      .plansip-ai-item-note {
        color: var(--brand);
        font-size: 12px;
        font-weight: 850;
        text-align: right;
        max-width: 150px;
      }

      .plansip-ai-insights {
        display: grid;
        gap: 8px;
      }

      .plansip-ai-insight {
        display: flex;
        gap: 8px;
        padding: 10px 12px;
        border-radius: 14px;
        font-size: 13px;
        line-height: 1.4;
      }

      .plansip-ai-good {
        color: var(--good);
        background: var(--soft);
      }

      .plansip-ai-watch {
        color: var(--warn);
        background:
          rgba(246,185,68,.12);
      }

      .plansip-ai-disclaimer {
        color: var(--muted);
        font-size: 11px;
      }

      .plansip-ai-loading {
        display: flex;
        align-items: center;
        gap: 10px;
        color: var(--muted);
        font-size: 13px;
      }

      .plansip-ai-spinner {
        width: 17px;
        height: 17px;
        border: 2px solid var(--line);
        border-top-color: var(--brand);
        border-radius: 50%;
        animation:
          plansip-ai-spin
          .8s linear infinite;
      }

      @keyframes plansip-ai-spin {
        to {
          transform:
            rotate(360deg);
        }
      }

      .plansip-ai-message {
        padding: 11px 12px;
        border: 1px solid var(--line);
        border-radius: 14px;
        background: var(--paper);
        color: var(--muted);
        font-size: 13px;
      }

      @media (prefers-color-scheme: dark) {
        .plansip-ai-inline {
          background:
            rgba(28,28,30,.72);
          border-color:
            rgba(255,255,255,.12);
          color: #f5f5f7;
          box-shadow:
            0 16px 42px
            rgba(0,0,0,.24);
        }

        .plansip-ai-title,
        .plansip-ai-result-headline,
        .plansip-ai-item-name {
          color: #f5f5f7;
        }

        .plansip-ai-sub,
        .plansip-ai-result-summary,
        .plansip-ai-item-metric,
        .plansip-ai-disclaimer,
        .plansip-ai-loading {
          color: #a1a1a6;
        }

        .plansip-ai-item,
        .plansip-ai-message {
          background: #1c1c1e;
          border-color:
            rgba(255,255,255,.12);
        }

        .plansip-ai-watch {
          background:
            rgba(154,103,0,.18);
        }
      }

      @media (max-width: 640px) {
        .plansip-ai-inline {
          padding: 14px;
          border-radius: 22px;
        }

        .plansip-ai-head {
          flex-direction: column;
          align-items: stretch;
        }

        .plansip-ai-btn {
          width: 100%;
        }
      }

      @media (max-width: 420px) {
        .plansip-ai-item {
          display: grid;
          gap: 5px;
        }

        .plansip-ai-item-note {
          text-align: left;
          max-width: none;
        }
      }
    `;

    document.head.appendChild(style);
  }

  if (
    document.readyState ===
    "loading"
  ) {
    document.addEventListener(
      "DOMContentLoaded",
      init
    );
  } else {
    init();
  }
})();
