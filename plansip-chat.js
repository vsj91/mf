"use strict";

(() => {
  const CONFIG = {
    endpoint: window.PLANSIP_AI_ENDPOINT || "",
    maxHistory: 10,
    maxMessageChars: 1200
  };

  const state = {
    open: false,
    messages: []
  };

  function init() {
    injectStyles();
    mountChat();
  }

  function mountChat() {
    if (document.getElementById("plansip-chat-launcher")) return;

    const launcher = document.createElement("button");
    launcher.id = "plansip-chat-launcher";
    launcher.className = "plansip-chat-launcher";
    launcher.type = "button";
    launcher.setAttribute("aria-label", "Open PlanSIP AI chat");
    launcher.innerHTML = "🤖";

    const panel = document.createElement("section");
    panel.id = "plansip-chat-panel";
    panel.className = "plansip-chat-panel";
    panel.setAttribute("aria-hidden", "true");

    panel.innerHTML = `
      <div class="plansip-chat-header">
        <div>
          <div class="plansip-chat-title">🤖 PlanSIP AI</div>
          <div class="plansip-chat-subtitle">
            Ask about SIPs, mutual funds and your PlanSIP result.
          </div>
        </div>

        <div class="plansip-chat-header-actions">
          <button
            type="button"
            class="plansip-chat-clear"
            aria-label="Clear chat"
            title="Clear chat"
          >↺</button>

          <button
            type="button"
            class="plansip-chat-close"
            aria-label="Close chat"
            title="Close"
          >×</button>
        </div>
      </div>

      <div class="plansip-chat-body" aria-live="polite">
        <div class="plansip-chat-welcome">
          <strong>PlanSIP AI</strong>
          <span>
            Ask me about SIP, NAV, CAGR, mutual funds, fund categories,
            corpus planning, loan vs SIP, volatility or drawdown.
          </span>
        </div>
      </div>

      <div class="plansip-chat-suggestions">
        <button type="button">What is SIP?</button>
        <button type="button">Explain CAGR</button>
        <button type="button">What is drawdown?</button>
      </div>

      <form class="plansip-chat-form">
        <textarea
          class="plansip-chat-input"
          rows="1"
          maxlength="${CONFIG.maxMessageChars}"
          placeholder="Ask PlanSIP AI..."
          aria-label="Ask PlanSIP AI"
        ></textarea>

        <button
          type="submit"
          class="plansip-chat-send"
          aria-label="Send message"
        >➤</button>
      </form>

      <div class="plansip-chat-note">
        Educational information only — not investment advice.
      </div>
    `;

    document.body.appendChild(launcher);
    document.body.appendChild(panel);

    launcher.addEventListener("click", () => setOpen(!state.open));
    panel.querySelector(".plansip-chat-close").addEventListener("click", () => setOpen(false));
    panel.querySelector(".plansip-chat-clear").addEventListener("click", clearChat);

    const form = panel.querySelector(".plansip-chat-form");
    const input = panel.querySelector(".plansip-chat-input");

    form.addEventListener("submit", async event => {
      event.preventDefault();
      const message = input.value.trim();
      if (!message) return;

      input.value = "";
      resizeInput(input);

      await sendMessage(message);
    });

    input.addEventListener("input", () => resizeInput(input));
    input.addEventListener("keydown", event => {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        form.requestSubmit();
      }
    });

    panel.querySelectorAll(".plansip-chat-suggestions button").forEach(button => {
      button.addEventListener("click", async () => {
        await sendMessage(button.textContent.trim());
      });
    });
  }

  function setOpen(open) {
    state.open = open;

    const panel = document.getElementById("plansip-chat-panel");
    const launcher = document.getElementById("plansip-chat-launcher");

    panel.classList.toggle("is-open", open);
    panel.setAttribute("aria-hidden", open ? "false" : "true");
    launcher.classList.toggle("is-hidden", open);

    if (open) {
      setTimeout(() => {
        panel.querySelector(".plansip-chat-input")?.focus();
      }, 100);
    }
  }

  function clearChat() {
    state.messages = [];

    const body = document.querySelector(".plansip-chat-body");
    body.innerHTML = `
      <div class="plansip-chat-welcome">
        <strong>PlanSIP AI</strong>
        <span>Chat cleared. Ask me a PlanSIP, SIP or mutual-fund question.</span>
      </div>
    `;
  }

  async function sendMessage(message) {
    if (!CONFIG.endpoint) {
      appendMessage("assistant", "PlanSIP AI is temporarily unavailable.");
      return;
    }

    const cleanMessage = String(message).slice(0, CONFIG.maxMessageChars);

    appendMessage("user", cleanMessage);
    state.messages.push({
      role: "user",
      content: cleanMessage
    });

    trimHistory();

    const typing = appendTyping();

    try {
      const response = await fetch(CONFIG.endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          mode: "chat",
          context: collectPageContext(),
          messages: state.messages
        })
      });

      let data = {};
      try {
        data = await response.json();
      } catch (_) {}

      typing.remove();

      if (!response.ok) {
        appendMessage(
          "assistant",
          data.error || "PlanSIP AI is temporarily unavailable."
        );
        return;
      }

      const reply = String(data.reply || "").trim();

      if (!reply) {
        appendMessage("assistant", "I could not generate a useful answer. Please try again.");
        return;
      }

      state.messages.push({
        role: "assistant",
        content: reply
      });

      trimHistory();
      appendMessage("assistant", reply);

    } catch (_) {
      typing.remove();
      appendMessage(
        "assistant",
        "I could not reach PlanSIP AI right now. Please try again."
      );
    }
  }

  function trimHistory() {
    if (state.messages.length > CONFIG.maxHistory) {
      state.messages = state.messages.slice(-CONFIG.maxHistory);
    }
  }

  function collectPageContext() {
    const context = {
      url: location.href,
      title: document.title,
      activeTool: detectActiveTool(),
      visibleResult: ""
    };

    const activeTool = context.activeTool;
    const resultIds = {
      find: "recommendationResults",
      sipcalc: "sipCalcResults",
      salary: "salaryResults",
      loan: "loanResults",
      freedom: "freedomResults",
      corpus: "corpusResults",
      metals: "metalResults",
      sip: "sipResults",
      compare: "compareResults",
      popular: "popularResults"
    };

    const resultId = resultIds[activeTool];
    const result = resultId ? document.getElementById(resultId) : null;

    if (result) {
      const clone = result.cloneNode(true);
      clone.querySelectorAll(".plansip-ai-inline").forEach(el => el.remove());
      context.visibleResult = cleanText(clone.innerText).slice(0, 7000);
    }

    context.inputs = {};
    const section = activeTool ? document.getElementById(activeTool) : null;

    section?.querySelectorAll("input, select").forEach(el => {
      if (!el.id) return;
      if (["hidden", "button", "submit"].includes(el.type)) return;
      if ((el.type === "checkbox" || el.type === "radio") && !el.checked) return;

      let value = String(el.value ?? "").slice(0, 200);

      if (el.tagName === "SELECT" && el.selectedIndex >= 0) {
        value = el.options[el.selectedIndex]?.textContent?.trim() || value;
      }

      context.inputs[el.id] = value;
    });

    return context;
  }

  function detectActiveTool() {
    const tabs = [
      "find",
      "sipcalc",
      "salary",
      "loan",
      "freedom",
      "corpus",
      "metals",
      "sip",
      "compare",
      "popular"
    ];

    for (const id of tabs) {
      const section = document.getElementById(id);
      if (!section) continue;

      const style = getComputedStyle(section);

      if (
        style.display !== "none" &&
        style.visibility !== "hidden" &&
        section.getClientRects().length > 0
      ) {
        return id;
      }
    }

    return "";
  }

  function appendMessage(role, text) {
    const body = document.querySelector(".plansip-chat-body");

    const row = document.createElement("div");
    row.className = `plansip-chat-message ${role === "user" ? "is-user" : "is-assistant"}`;

    const bubble = document.createElement("div");
    bubble.className = "plansip-chat-bubble";
    bubble.textContent = text;

    row.appendChild(bubble);
    body.appendChild(row);

    body.scrollTop = body.scrollHeight;

    return row;
  }

  function appendTyping() {
    const body = document.querySelector(".plansip-chat-body");

    const row = document.createElement("div");
    row.className = "plansip-chat-message is-assistant plansip-chat-typing-row";

    row.innerHTML = `
      <div class="plansip-chat-bubble plansip-chat-typing">
        <span></span><span></span><span></span>
      </div>
    `;

    body.appendChild(row);
    body.scrollTop = body.scrollHeight;

    return row;
  }

  function resizeInput(input) {
    input.style.height = "auto";
    input.style.height = Math.min(input.scrollHeight, 120) + "px";
  }

  function cleanText(value) {
    return String(value || "")
      .replace(/\u00a0/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function injectStyles() {
    if (document.getElementById("plansip-chat-styles")) return;

    const style = document.createElement("style");
    style.id = "plansip-chat-styles";

    style.textContent = `
      .plansip-chat-launcher {
        --chat-bg: #ffffff;
        --chat-card: #f7f7f8;
        --chat-text: #1d1d1f;
        --chat-muted: #6e6e73;
        --chat-border: rgba(0,0,0,.12);

        position: fixed;
        right: 20px;
        bottom: 20px;
        z-index: 9998;

        width: 56px;
        height: 56px;

        border: 1px solid var(--chat-border);
        border-radius: 50%;

        background: var(--brand, #007a5a);
        color: #fff;

        font-size: 26px;
        cursor: pointer;

        box-shadow: 0 12px 30px rgba(0,0,0,.18);
      }

      .plansip-chat-launcher.is-hidden {
        display: none;
      }

      .plansip-chat-panel {
        --chat-bg: #ffffff;
        --chat-card: #f7f7f8;
        --chat-text: #1d1d1f;
        --chat-muted: #6e6e73;
        --chat-border: rgba(0,0,0,.12);
        --chat-user: var(--brand, #007a5a);

        position: fixed;
        right: 20px;
        bottom: 20px;
        z-index: 9999;

        width: min(390px, calc(100vw - 24px));
        height: min(620px, calc(100vh - 40px));

        display: none;
        grid-template-rows: auto 1fr auto auto auto;

        background: var(--chat-bg);
        color: var(--chat-text);

        border: 1px solid var(--chat-border);
        border-radius: 24px;

        overflow: hidden;

        box-shadow: 0 24px 70px rgba(0,0,0,.24);
      }

      .plansip-chat-panel.is-open {
        display: grid;
      }

      @media (prefers-color-scheme: dark) {
        .plansip-chat-launcher,
        .plansip-chat-panel {
          --chat-bg: #1c1c1e;
          --chat-card: #2c2c2e;
          --chat-text: #f5f5f7;
          --chat-muted: #aeaeb2;
          --chat-border: rgba(255,255,255,.14);
        }
      }

      .plansip-chat-header {
        display: flex;
        justify-content: space-between;
        gap: 12px;
        align-items: flex-start;

        padding: 16px;

        border-bottom: 1px solid var(--chat-border);
        background: var(--chat-bg);
      }

      .plansip-chat-title {
        font-size: 17px;
        font-weight: 900;
        color: var(--chat-text);
      }

      .plansip-chat-subtitle {
        margin-top: 3px;
        font-size: 11px;
        line-height: 1.35;
        color: var(--chat-muted);
      }

      .plansip-chat-header-actions {
        display: flex;
        gap: 6px;
      }

      .plansip-chat-clear,
      .plansip-chat-close {
        width: 32px;
        height: 32px;

        border: 1px solid var(--chat-border);
        border-radius: 10px;

        background: var(--chat-card);
        color: var(--chat-text);

        cursor: pointer;
        font-size: 18px;
      }

      .plansip-chat-body {
        overflow-y: auto;
        padding: 14px;

        background: var(--chat-bg);
      }

      .plansip-chat-welcome {
        display: grid;
        gap: 5px;

        padding: 12px 13px;

        border: 1px solid var(--chat-border);
        border-radius: 16px;

        background: var(--chat-card);
        color: var(--chat-text);

        font-size: 13px;
        line-height: 1.45;
      }

      .plansip-chat-welcome span {
        color: var(--chat-muted);
      }

      .plansip-chat-message {
        display: flex;
        margin-top: 10px;
      }

      .plansip-chat-message.is-user {
        justify-content: flex-end;
      }

      .plansip-chat-message.is-assistant {
        justify-content: flex-start;
      }

      .plansip-chat-bubble {
        max-width: 82%;

        padding: 10px 12px;

        border-radius: 16px;

        font-size: 13px;
        line-height: 1.5;

        white-space: pre-wrap;
        word-break: break-word;
      }

      .plansip-chat-message.is-user .plansip-chat-bubble {
        background: var(--chat-user);
        color: #fff;
        border-bottom-right-radius: 5px;
      }

      .plansip-chat-message.is-assistant .plansip-chat-bubble {
        background: var(--chat-card);
        color: var(--chat-text);

        border: 1px solid var(--chat-border);
        border-bottom-left-radius: 5px;
      }

      .plansip-chat-suggestions {
        display: flex;
        gap: 6px;

        padding: 8px 12px;

        overflow-x: auto;

        border-top: 1px solid var(--chat-border);

        background: var(--chat-bg);
      }

      .plansip-chat-suggestions button {
        flex: 0 0 auto;

        padding: 7px 10px;

        border: 1px solid var(--chat-border);
        border-radius: 999px;

        background: var(--chat-card);
        color: var(--chat-text);

        font-size: 11px;
        cursor: pointer;
      }

      .plansip-chat-form {
        display: grid;
        grid-template-columns: 1fr 42px;
        gap: 8px;

        padding: 10px 12px;

        border-top: 1px solid var(--chat-border);

        background: var(--chat-bg);
      }

      .plansip-chat-input {
        width: 100%;
        min-height: 42px;
        max-height: 120px;

        resize: none;

        padding: 10px 12px;

        border: 1px solid var(--chat-border);
        border-radius: 14px;

        outline: none;

        background: var(--chat-card);
        color: var(--chat-text);

        font: inherit;
        font-size: 13px;
      }

      .plansip-chat-input::placeholder {
        color: var(--chat-muted);
      }

      .plansip-chat-send {
        width: 42px;
        height: 42px;

        border: 0;
        border-radius: 14px;

        background: var(--brand, #007a5a);
        color: #fff;

        font-size: 17px;
        cursor: pointer;
      }

      .plansip-chat-note {
        padding: 0 12px 10px;

        background: var(--chat-bg);
        color: var(--chat-muted);

        font-size: 10px;
      }

      .plansip-chat-typing {
        display: inline-flex;
        gap: 4px;
        align-items: center;
      }

      .plansip-chat-typing span {
        width: 6px;
        height: 6px;

        border-radius: 50%;

        background: var(--chat-muted);

        animation: plansipChatDot 1.2s infinite ease-in-out;
      }

      .plansip-chat-typing span:nth-child(2) {
        animation-delay: .15s;
      }

      .plansip-chat-typing span:nth-child(3) {
        animation-delay: .30s;
      }

      @keyframes plansipChatDot {
        0%, 80%, 100% {
          transform: scale(.7);
          opacity: .5;
        }

        40% {
          transform: scale(1);
          opacity: 1;
        }
      }

      @media (max-width: 640px) {
        .plansip-chat-launcher {
          right: 14px;
          bottom: 14px;
        }

        .plansip-chat-panel {
          right: 8px;
          left: 8px;
          bottom: 8px;

          width: auto;
          height: min(700px, calc(100vh - 16px));

          border-radius: 22px;
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