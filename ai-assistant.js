"use strict";

(() => {
  const CONFIG = {
    endpoint: window.PLANSIP_AI_ENDPOINT || "",
    cacheHours: 24,
    maxContextChars: 12000
  };

  const TOOLS = {
    find: {
      label: "Find Funds",
      resultId: "recommendationResults"
    },
    sipcalc: {
      label: "SIP Calculator",
      resultId: "sipCalcResults"
    },
    salary: {
      label: "Salary Planner",
      resultId: "salaryResults"
    },
    loan: {
      label: "Loan Freedom",
      resultId: "loanResults"
    },
    freedom: {
      label: "Freedom Goals",
      resultId: "freedomResults"
    },
    corpus: {
      label: "Corpus",
      resultId: "corpusResults"
    },
    metals: {
      label: "Gold / Silver",
      resultId: "metalResults"
    },
    sip: {
      label: "SIP Replay",
      resultId: "sipResults"
    },
    compare: {
      label: "Compare Funds",
      resultId: "compareResults"
    },
    popular: {
      label: "Popular Funds",
      resultId: "popularResults"
    }
  };

  const CACHE_PREFIX =
    "plansip_ai_perspective_v11:";

  function init() {
    injectStyles();

    Object.entries(TOOLS).forEach(
      ([toolId, meta]) => {
        observeTool(
          toolId,
          meta
        );
      }
    );
  }

  function observeTool(
    toolId,
    meta
  ) {
    const section =
      document.getElementById(
        toolId
      );

    const result =
      document.getElementById(
        meta.resultId
      );

    if (
      !section ||
      !result
    ) {
      return;
    }

    const ensure = () => {
      const text =
        extractResultText(
          result
        );

      if (
        text.length < 20
      ) {
        result
          .querySelectorAll(
            ".plansip-ai-inline"
          )
          .forEach(
            el =>
              el.remove()
          );

        return;
      }

      if (
        !result.querySelector(
          `[data-ai-tool="${toolId}"]`
        )
      ) {
        addAIControl(
          toolId,
          meta,
          section,
          result
        );
      }
    };

    ensure();

    new MutationObserver(
      () => {
        requestAnimationFrame(
          ensure
        );
      }
    ).observe(
      result,
      {
        childList: true,
        subtree: true,
        characterData: true
      }
    );
  }

  function addAIControl(
    toolId,
    meta,
    section,
    result
  ) {
    const host =
      document.createElement(
        "section"
      );

    host.className =
      "plansip-ai-inline";

    host.dataset.aiTool =
      toolId;

    host.innerHTML = `
      <div class="plansip-ai-head">

        <div>
          <h3 class="plansip-ai-title">
            <span>✦</span>
            AI Perspective
          </h3>

          <div class="plansip-ai-sub">
            A second perspective based on your goal, risk and historical data.
          </div>
        </div>

        <button
          class="btn btn-primary plansip-ai-btn"
          type="button"
        >
          <span>✦</span>
          Ask AI
        </button>

      </div>

      <div
        class="plansip-ai-output"
        aria-live="polite"
      ></div>
    `;

    insertAIHost(
      result,
      host
    );

    const button =
      host.querySelector(
        ".plansip-ai-btn"
      );

    const output =
      host.querySelector(
        ".plansip-ai-output"
      );

    button.addEventListener(
      "click",
      () => {
        runAI(
          toolId,
          meta,
          section,
          result,
          button,
          output
        );
      }
    );
  }

  function insertAIHost(
    result,
    host
  ) {
    const analysisHeading =
      Array.from(
        result.querySelectorAll(
          "h2, h3, h4"
        )
      ).find(
        el =>
          cleanText(
            el.textContent
          ).toLowerCase() ===
          "analysis view"
      );

    const analysisCard =
      analysisHeading?.closest(
        ".study-mix"
      );

    if (
      analysisCard
    ) {
      analysisCard
        .insertAdjacentElement(
          "beforebegin",
          host
        );

      return;
    }

    const firstHeading =
      result.querySelector(
        "h2, h3"
      );

    if (
      firstHeading
    ) {
      firstHeading
        .insertAdjacentElement(
          "afterend",
          host
        );

      return;
    }

    result.prepend(
      host
    );
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
      extractResultText(
        result
      );

    if (
      !rawResult ||
      rawResult.length < 20
    ) {
      renderMessage(
        output,
        "Run the PlanSIP calculation first."
      );

      return;
    }

    const payload = {
      tool:
        toolId,

      toolLabel:
        meta.label,

      profile:
        collectInputs(
          section
        ),

      structured:
        buildStructuredPayload(
          toolId,
          section,
          result
        ),

      rawMetrics:
        stripRankingSignals(
          rawResult
        ).slice(
          0,
          CONFIG.maxContextChars
        )
    };

    const cacheKey =
      await makeCacheKey(
        payload
      );

    const cached =
      readCache(
        cacheKey
      );

    if (
      cached
    ) {
      renderPerspective(
        output,
        cached
      );

      return;
    }

    if (
      !CONFIG.endpoint
    ) {
      renderMessage(
        output,
        "AI Perspective is temporarily unavailable."
      );

      return;
    }

    button.disabled =
      true;

    button.innerHTML =
      "<span>✦</span> Analysing…";

    renderLoading(
      output
    );

    try {
      const response =
        await fetch(
          CONFIG.endpoint,
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json"
            },

            body:
              JSON.stringify(
                payload
              )
          }
        );

      let data = {};

      try {
        data =
          await response.json();
      } catch (_) {}

      if (
        !response.ok
      ) {
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

      if (
        !perspective
      ) {
        const error =
          new Error(
            "AI returned invalid response."
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
        perspective
      );

    } catch (error) {
      renderError(
        output,
        error
      );

    } finally {
      button.disabled =
        false;

      button.innerHTML =
        "<span>✦</span> Ask AI";
    }
  }

  function buildStructuredPayload(
    toolId,
    section,
    result
  ) {
    switch (
      toolId
    ) {
      case "find":
      case "compare":
      case "popular":
        return {
          funds:
            extractFundCards(
              result
            )
        };

      case "sipcalc":
        return {
          inputs:
            collectInputs(
              section
            ),

          result:
            extractKeyValuePairs(
              result
            )
        };

      case "salary":
        return {
          inputs:
            collectInputs(
              section
            ),

          result:
            extractKeyValuePairs(
              result
            ),

          funds:
            extractFundCards(
              result
            )
        };

      case "loan":
      case "freedom":
      case "corpus":
        return {
          inputs:
            collectInputs(
              section
            ),

          result:
            extractKeyValuePairs(
              result
            )
        };

      case "metals":
      case "sip":
        return {
          inputs:
            collectInputs(
              section
            ),

          result:
            extractKeyValuePairs(
              result
            ),

          funds:
            extractFundCards(
              result
            )
        };

      default:
        return {
          inputs:
            collectInputs(
              section
            ),

          result:
            extractKeyValuePairs(
              result
            )
        };
    }
  }

  function extractFundCards(
    result
  ) {
    const cards =
      Array.from(
        result.querySelectorAll(
          ".fund-card"
        )
      );

    return cards
      .slice(
        0,
        6
      )
      .map(
        card => {
          const name =
            cleanText(
              card.querySelector(
                ".fund-name"
              )?.textContent ||
              card.querySelector(
                "h3"
              )?.textContent ||
              ""
            );

          const meta =
            cleanText(
              card.querySelector(
                ".meta-line"
              )?.textContent ||
              ""
            );

          const text =
            cleanText(
              card.innerText
            );

          return {
            name,

            category:
              inferCategory(
                `${meta} ${name}`
              ),

            y1:
              metric(
                text,
                /1Y(?:\s+return)?\s*([+-]?\d+(?:\.\d+)?)%/i
              ),

            y3:
              metric(
                text,
                /3Y\s+CAGR\s*([+-]?\d+(?:\.\d+)?)%/i
              ),

            y5:
              metric(
                text,
                /5Y\s+CAGR\s*([+-]?\d+(?:\.\d+)?)%/i
              ),

            y10:
              metric(
                text,
                /10Y\s+CAGR\s*([+-]?\d+(?:\.\d+)?)%/i
              ),

            volatility:
              metric(
                text,
                /Volatility:\s*([+-]?\d+(?:\.\d+)?)%/i
              ),

            maxDrawdown:
              metric(
                text,
                /Maximum drawdown:\s*([+-]?\d+(?:\.\d+)?)%/i
              ),

            consistency:
              metric(
                text,
                /Positive monthly periods:\s*([+-]?\d+(?:\.\d+)?)%/i
              ),

            historyYears:
              numberMetric(
                text,
                /Available NAV history:\s*([+-]?\d+(?:\.\d+)?)\s*years?/i
              ),

            score:
              numberMetric(
                text,
                /Score\s*(\d+(?:\.\d+)?)\s*\/\s*100/i
              )
          };
        }
      )
      .filter(
        fund =>
          fund.name
      );
  }

  function extractKeyValuePairs(
    result
  ) {
    const data = {};

    const text =
      cleanText(
        result.innerText
      );

    const patterns = [
      [
        "investedAmount",
        /Invested(?: amount)?\s*₹?\s*([\d,]+)/i
      ],

      [
        "estimatedCorpus",
        /(?:Estimated )?Corpus(?: today)?\s*₹?\s*([\d,]+)/i
      ],

      [
        "estimatedGain",
        /(?:Estimated )?Gain\s*₹?\s*([\d,]+)/i
      ],

      [
        "monthlySip",
        /(?:Monthly )?SIP\s*₹?\s*([\d,]+)/i
      ],

      [
        "currentValue",
        /Current value\s*₹?\s*([\d,]+)/i
      ],

      [
        "target",
        /Target\s*₹?\s*([\d,]+)/i
      ],

      [
        "emi",
        /\bEMI\s*₹?\s*([\d,]+)/i
      ],

      [
        "loanOutstanding",
        /Outstanding(?: loan)?\s*₹?\s*([\d,]+)/i
      ],

      [
        "years",
        /(\d+(?:\.\d+)?)\s*years?/i
      ],

      [
        "rate",
        /(\d+(?:\.\d+)?)%\s*(?:return|rate|interest)/i
      ]
    ];

    for (
      const [
        key,
        regex
      ] of patterns
    ) {
      const match =
        text.match(
          regex
        );

      if (
        match
      ) {
        data[key] =
          parseNumber(
            match[1]
          );
      }
    }

    data.text =
      text.slice(
        0,
        6000
      );

    return data;
  }

  function inferCategory(
    text
  ) {
    const value =
      cleanText(
        text
      ).toLowerCase();

    if (
      /balanced advantage|dynamic asset allocation/
        .test(
          value
        )
    ) {
      return "Balanced Advantage";
    }

    if (
      /nifty|sensex|index/
        .test(
          value
        )
    ) {
      return "Index";
    }

    if (
      /small cap/
        .test(
          value
        )
    ) {
      return "Small Cap";
    }

    if (
      /large\s*(?:&|and)\s*mid/
        .test(
          value
        )
    ) {
      return "Large & Mid Cap";
    }

    if (
      /mid cap/
        .test(
          value
        )
    ) {
      return "Mid Cap";
    }

    if (
      /large cap/
        .test(
          value
        )
    ) {
      return "Large Cap";
    }

    if (
      /flexi cap/
        .test(
          value
        )
    ) {
      return "Flexi Cap";
    }

    if (
      /multi cap/
        .test(
          value
        )
    ) {
      return "Multi Cap";
    }

    if (
      /hybrid/
        .test(
          value
        )
    ) {
      return "Hybrid";
    }

    if (
      /liquid/
        .test(
          value
        )
    ) {
      return "Liquid";
    }

    if (
      /money market/
        .test(
          value
        )
    ) {
      return "Money Market";
    }

    if (
      /short duration|short term/
        .test(
          value
        )
    ) {
      return "Short Duration";
    }

    if (
      /corporate bond/
        .test(
          value
        )
    ) {
      return "Corporate Bond";
    }

    if (
      /gilt|g-sec/
        .test(
          value
        )
    ) {
      return "Gilt";
    }

    if (
      /gold/
        .test(
          value
        )
    ) {
      return "Gold";
    }

    if (
      /silver/
        .test(
          value
        )
    ) {
      return "Silver";
    }

    return "";
  }

  function metric(
    text,
    regex
  ) {
    const match =
      String(
        text || ""
      ).match(
        regex
      );

    if (
      !match
    ) {
      return null;
    }

    const value =
      Number(
        match[1]
      );

    return Number.isFinite(
      value
    )
      ? value
      : null;
  }

  function numberMetric(
    text,
    regex
  ) {
    const match =
      String(
        text || ""
      ).match(
        regex
      );

    if (
      !match
    ) {
      return null;
    }

    return parseNumber(
      match[1]
    );
  }

  function parseNumber(
    value
  ) {
    const number =
      Number(
        String(
          value || ""
        ).replace(
          /,/g,
          ""
        )
      );

    return Number.isFinite(
      number
    )
      ? number
      : null;
  }

  function validatePerspective(
    value
  ) {
    if (
      !value ||
      typeof value !==
        "object"
    ) {
      return null;
    }

    const items =
      Array.isArray(
        value.items
      )
        ? value.items
            .slice(
              0,
              4
            )
            .map(
              item => ({
                name:
                  cleanText(
                    item?.name ||
                    ""
                  ).slice(
                    0,
                    100
                  ),

                metric:
                  cleanText(
                    item?.metric ||
                    ""
                  ).slice(
                    0,
                    140
                  ),

                note:
                  cleanText(
                    item?.note ||
                    ""
                  ).slice(
                    0,
                    80
                  )
              })
            )
            .filter(
              item =>
                item.name ||
                item.metric
            )
        : [];

    const preference =
      value
        .historicalPreference &&
      typeof value
        .historicalPreference ===
        "object"
        ? {
            fund:
              cleanText(
                value
                  .historicalPreference
                  .fund ||
                ""
              ).slice(
                0,
                120
              ),

            label:
              cleanText(
                value
                  .historicalPreference
                  .label ||
                "Historical edge"
              ).slice(
                0,
                80
              ),

            reason:
              cleanText(
                value
                  .historicalPreference
                  .reason ||
                ""
              ).slice(
                0,
                280
              )
          }
        : null;

    return {
      headline:
        cleanText(
          value.headline ||
          "AI Perspective"
        ),

      summary:
        cleanText(
          value.summary ||
          ""
        ),

      historicalPreference:
        preference,

      items,

      positive:
        cleanText(
          value.positive ||
          ""
        ),

      watch:
        cleanText(
          value.watch ||
          ""
        )
    };
  }

  function renderPerspective(
    output,
    perspective
  ) {
    output.className =
      "plansip-ai-output is-ready";

    const preference =
      perspective
        .historicalPreference;

    const preferenceHTML =
      preference?.fund
        ? `
          <div class="plansip-ai-preference">

            <div class="plansip-ai-preference-label">
              ✦ ${escapeHTML(
                preference.label ||
                "Historical edge"
              )}
            </div>

            <div class="plansip-ai-preference-fund">
              ${escapeHTML(
                preference.fund
              )}
            </div>

            ${
              preference.reason
                ? `
                  <div class="plansip-ai-preference-reason">
                    ${escapeHTML(
                      preference.reason
                    )}
                  </div>
                `
                : ""
            }

            <div class="plansip-ai-preference-note">
              Historical-data comparison only — not a recommendation.
            </div>

          </div>
        `
        : "";

    const itemsHTML =
      perspective.items.length
        ? `
          <div class="plansip-ai-items">

            ${perspective.items
              .map(
                item => `
                  <div class="plansip-ai-item">

                    <div class="plansip-ai-item-main">

                      <div class="plansip-ai-item-name">
                        ${escapeHTML(
                          item.name
                        )}
                      </div>

                      ${
                        item.metric
                          ? `
                            <div class="plansip-ai-item-metric">
                              ${escapeHTML(
                                item.metric
                              )}
                            </div>
                          `
                          : ""
                      }

                    </div>

                    ${
                      item.note
                        ? `
                          <div class="plansip-ai-item-note">
                            ${escapeHTML(
                              item.note
                            )}
                          </div>
                        `
                        : ""
                    }

                  </div>
                `
              )
              .join("")}

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

        ${preferenceHTML}

        ${itemsHTML}

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

  function renderLoading(
    output
  ) {
    output.className =
      "plansip-ai-output is-loading";

    output.innerHTML = `
      <div class="plansip-ai-loading">
        <span class="plansip-ai-spinner"></span>
        <span>Analysing the result…</span>
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
        ${escapeHTML(
          message
        )}
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
      error?.reason ===
      "capacity"
    ) {
      message =
        "AI is busy right now. Please try again shortly.";
    }

    if (
      error?.reason ===
      "rate_limit"
    ) {
      message =
        "Too many AI requests right now. Please try again shortly.";
    }

    if (
      error?.reason ===
      "quota"
    ) {
      message =
        "AI usage is unavailable right now. Your PlanSIP result remains available.";
    }

    renderMessage(
      output,
      message
    );
  }

  function extractResultText(
    result
  ) {
    const clone =
      result.cloneNode(
        true
      );

    clone
      .querySelectorAll(
        ".plansip-ai-inline"
      )
      .forEach(
        el =>
          el.remove()
      );

    return cleanText(
      clone.innerText
    );
  }

  function stripRankingSignals(
    text
  ) {
    return cleanText(
      text
    )
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
      );
  }

  function collectInputs(
    section
  ) {
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
            ].includes(
              el.type
            )
          ) {
            return;
          }

          if (
            (
              el.type ===
                "checkbox" ||
              el.type ===
                "radio"
            ) &&
            !el.checked
          ) {
            return;
          }

          const label =
            section
              .querySelector(
                `label[for="${cssEscape(
                  el.id
                )}"]`
              )
              ?.innerText
              ?.trim() ||
            el.id;

          let value =
            String(
              el.value ??
              ""
            ).slice(
              0,
              200
            );

          if (
            el.tagName ===
              "SELECT" &&
            el.selectedIndex >=
              0
          ) {
            value =
              el.options[
                el.selectedIndex
              ]
                ?.textContent
                ?.trim() ||
              value;
          }

          data[label] =
            value;
        }
      );

    return data;
  }

  function cleanText(
    value
  ) {
    return String(
      value || ""
    )
      .replace(
        /\u00a0/g,
        " "
      )
      .replace(
        /\s+/g,
        " "
      )
      .trim();
  }

  function escapeHTML(
    value
  ) {
    return String(
      value ?? ""
    )
      .replaceAll(
        "&",
        "&amp;"
      )
      .replaceAll(
        "<",
        "&lt;"
      )
      .replaceAll(
        ">",
        "&gt;"
      )
      .replaceAll(
        '"',
        "&quot;"
      )
      .replaceAll(
        "'",
        "&#039;"
      );
  }

  function cssEscape(
    value
  ) {
    return window.CSS?.escape
      ? CSS.escape(
          value
        )
      : String(
          value
        ).replace(
          /[^a-zA-Z0-9_-]/g,
          "\\$&"
        );
  }

  function readCache(
    key
  ) {
    try {
      const item =
        JSON.parse(
          localStorage.getItem(
            CACHE_PREFIX +
            key
          ) ||
          "null"
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

      return item.value;

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
        CACHE_PREFIX +
          key,

        JSON.stringify({
          time:
            Date.now(),

          value
        })
      );

    } catch (_) {}
  }

  async function makeCacheKey(
    payload
  ) {
    const text =
      JSON.stringify(
        payload
      );

    const hash =
      await crypto.subtle.digest(
        "SHA-256",

        new TextEncoder()
          .encode(
            text
          )
      );

    return Array.from(
      new Uint8Array(
        hash
      )
    )
      .map(
        b =>
          b
            .toString(
              16
            )
            .padStart(
              2,
              "0"
            )
      )
      .join("");
  }

  function injectStyles() {
    if (
      document.getElementById(
        "plansip-ai-v11-styles"
      )
    ) {
      return;
    }

    const style =
      document.createElement(
        "style"
      );

    style.id =
      "plansip-ai-v11-styles";

    style.textContent = `

      /*
       * LIGHT MODE DEFAULT
       */
      .plansip-ai-inline {

        --ai-bg:
          #ffffff;

        --ai-card:
          #f7f7f8;

        --ai-text:
          #1d1d1f;

        --ai-muted:
          #6e6e73;

        --ai-border:
          rgba(
            0,
            0,
            0,
            .12
          );

        --ai-shadow:
          rgba(
            0,
            0,
            0,
            .08
          );

        --ai-good-bg:
          rgba(
            31,
            143,
            95,
            .08
          );

        --ai-watch-bg:
          rgba(
            198,
            122,
            0,
            .08
          );

        margin:
          14px 0;

        padding:
          18px;

        border:
          1px solid
          var(--ai-border);

        border-radius:
          24px;

        background:
          var(--ai-bg);

        color:
          var(--ai-text);

        box-shadow:
          0 16px 42px
          var(--ai-shadow);
      }


      /*
       * DEVICE DARK MODE
       */
      @media
      (prefers-color-scheme: dark) {

        .plansip-ai-inline {

          --ai-bg:
            #1c1c1e;

          --ai-card:
            #2c2c2e;

          --ai-text:
            #f5f5f7;

          --ai-muted:
            #aeaeb2;

          --ai-border:
            rgba(
              255,
              255,
              255,
              .14
            );

          --ai-shadow:
            rgba(
              0,
              0,
              0,
              .45
            );

          --ai-good-bg:
            rgba(
              48,
              209,
              88,
              .10
            );

          --ai-watch-bg:
            rgba(
              255,
              159,
              10,
              .10
            );
        }

      }


      .plansip-ai-head {
        display:
          flex;

        align-items:
          center;

        justify-content:
          space-between;

        gap:
          16px;
      }


      .plansip-ai-title {
        margin:
          0;

        color:
          var(--ai-text);

        font-size:
          20px;

        font-weight:
          850;
      }


      .plansip-ai-title span {
        color:
          var(
            --brand,
            #007a5a
          );
      }


      .plansip-ai-sub {
        margin-top:
          5px;

        color:
          var(--ai-muted);

        font-size:
          13px;
      }


      .plansip-ai-output {
        display:
          none;

        margin-top:
          16px;
      }


      .plansip-ai-output:not(:empty) {
        display:
          block;
      }


      .plansip-ai-result {
        display:
          grid;

        gap:
          12px;
      }


      .plansip-ai-result-headline {
        color:
          var(--ai-text);

        font-size:
          17px;

        font-weight:
          850;
      }


      .plansip-ai-result-summary {
        color:
          var(--ai-muted);

        font-size:
          14px;

        line-height:
          1.5;
      }


      .plansip-ai-preference {
        padding:
          14px 15px;

        border:
          1px solid
          var(--ai-border);

        border-radius:
          18px;

        background:
          var(--ai-card);

        color:
          var(--ai-text);
      }


      .plansip-ai-preference-label {
        color:
          var(
            --brand,
            #007a5a
          );

        font-size:
          12px;

        font-weight:
          900;
      }


      .plansip-ai-preference-fund {
        margin-top:
          5px;

        color:
          var(--ai-text);

        font-size:
          17px;

        font-weight:
          900;
      }


      .plansip-ai-preference-reason {
        margin-top:
          5px;

        color:
          var(--ai-muted);

        font-size:
          13px;

        line-height:
          1.45;
      }


      .plansip-ai-preference-note {
        margin-top:
          7px;

        color:
          var(--ai-muted);

        font-size:
          10px;
      }


      .plansip-ai-items {
        display:
          grid;

        gap:
          9px;
      }


      .plansip-ai-item {
        display:
          flex;

        align-items:
          center;

        justify-content:
          space-between;

        gap:
          14px;

        padding:
          12px 14px;

        border:
          1px solid
          var(--ai-border);

        border-radius:
          18px;

        background:
          var(--ai-card);

        color:
          var(--ai-text);
      }


      .plansip-ai-item-name {
        color:
          var(--ai-text);

        font-size:
          14px;

        font-weight:
          800;
      }


      .plansip-ai-item-metric {
        margin-top:
          3px;

        color:
          var(--ai-muted);

        font-size:
          12px;
      }


      .plansip-ai-item-note {
        max-width:
          165px;

        color:
          var(
            --brand,
            #007a5a
          );

        font-size:
          12px;

        font-weight:
          850;

        text-align:
          right;
      }


      .plansip-ai-insights {
        display:
          grid;

        gap:
          8px;
      }


      .plansip-ai-insight {
        display:
          flex;

        gap:
          8px;

        padding:
          10px 12px;

        border:
          1px solid
          var(--ai-border);

        border-radius:
          14px;

        color:
          var(--ai-text);
      }


      .plansip-ai-good {
        background:
          var(--ai-good-bg);

        color:
          var(
            --good,
            #1f8f5f
          );
      }


      .plansip-ai-watch {
        background:
          var(--ai-watch-bg);

        color:
          var(
            --warn,
            #c67a00
          );
      }


      .plansip-ai-disclaimer {
        color:
          var(--ai-muted);

        font-size:
          11px;
      }


      .plansip-ai-loading {
        display:
          flex;

        align-items:
          center;

        gap:
          9px;

        color:
          var(--ai-muted);

        font-size:
          13px;
      }


      .plansip-ai-message {
        color:
          var(--ai-muted);

        font-size:
          13px;
      }


      .plansip-ai-spinner {
        width:
          17px;

        height:
          17px;

        border:
          2px solid
          var(--ai-border);

        border-top-color:
          var(
            --brand,
            #007a5a
          );

        border-radius:
          50%;

        animation:
          plansipAISpin
          .8s linear infinite;
      }


      @keyframes
      plansipAISpin {

        to {
          transform:
            rotate(
              360deg
            );
        }

      }


      @media
      (max-width: 640px) {

        .plansip-ai-inline {
          padding:
            14px;

          border-radius:
            22px;
        }

        .plansip-ai-head {
          flex-direction:
            column;

          align-items:
            stretch;
        }

        .plansip-ai-btn {
          width:
            100%;
        }

      }


      @media
      (max-width: 420px) {

        .plansip-ai-item {
          display:
            grid;

          gap:
            5px;
        }

        .plansip-ai-item-note {
          max-width:
            none;

          text-align:
            left;
        }

      }

    `;

    document.head
      .appendChild(
        style
      );
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
