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

  let panel = null;
  let launcher = null;
  let body = null;
  let input = null;
  let form = null;

  function init() {
    injectStyles();
    mountChat();
    bindViewport();
  }

  function mountChat() {
    if (document.getElementById("plansip-chat-launcher")) return;

    launcher = document.createElement("button");
    launcher.id = "plansip-chat-launcher";
    launcher.className = "plansip-chat-launcher";
    launcher.type = "button";
    launcher.setAttribute("aria-label", "Open PlanSIP AI chat");
    launcher.innerHTML = `
      <div class="plansip-dog-wrap">
        <div class="plansip-dog" aria-hidden="true">
          <div class="plansip-dog-ear left"></div>
          <div class="plansip-dog-ear right"></div>
          <div class="plansip-dog-head">
            <div class="plansip-dog-eye left"></div>
            <div class="plansip-dog-eye right"></div>
            <div class="plansip-dog-nose"></div>
            <div class="plansip-dog-mouth"></div>
          </div>
          <div class="plansip-dog-body"><div class="plansip-dog-shirt">AI</div></div>
          <div class="plansip-dog-leg left"></div>
          <div class="plansip-dog-leg right"></div>
          <div class="plansip-dog-tail"></div>
          <div class="plansip-dog-ball"></div>
        </div>
        <div class="plansip-chat-label">Ask PlanSIP AI</div>
      </div>
    `;

    panel = document.createElement("section");
    panel.id = "plansip-chat-panel";
    panel.className = "plansip-chat-panel";
    panel.setAttribute("aria-hidden", "true");

    panel.innerHTML = `
      <div class="plansip-chat-header">
        <div class="plansip-chat-header-main">
          <div class="plansip-chat-avatar" aria-hidden="true">
            <div class="plansip-mini-dog">
              <div class="plansip-mini-dog-head"></div>
              <div class="plansip-mini-dog-body">AI</div>
            </div>
          </div>
          <div class="plansip-chat-heading">
            <div class="plansip-chat-title">PlanSIP AI</div>
            <div class="plansip-chat-subtitle">Ask about SIPs, mutual funds and your PlanSIP result.</div>
          </div>
        </div>
        <div class="plansip-chat-header-actions">
          <button type="button" class="plansip-chat-clear" aria-label="Clear chat" title="Clear chat">↺</button>
          <button type="button" class="plansip-chat-close" aria-label="Close chat" title="Close">×</button>
        </div>
      </div>

      <div class="plansip-chat-body" aria-live="polite">
        <div class="plansip-chat-welcome">
          <strong>Hi! I’m your PlanSIP AI helper.</strong>
          <span>Ask me about SIP, NAV, CAGR, mutual funds, fund categories, corpus planning, loan vs SIP, volatility or drawdown.</span>
        </div>
      </div>

      <div class="plansip-chat-suggestions">
        <button type="button">What is SIP?</button>
        <button type="button">Explain CAGR</button>
        <button type="button">What is drawdown?</button>
      </div>

      <div class="plansip-chat-composer">
        <form class="plansip-chat-form">
          <textarea
            class="plansip-chat-input"
            rows="1"
            maxlength="${CONFIG.maxMessageChars}"
            placeholder="Ask PlanSIP AI..."
            aria-label="Ask PlanSIP AI"
          ></textarea>
          <button type="submit" class="plansip-chat-send" aria-label="Send message">➤</button>
        </form>
        <div class="plansip-chat-note">Educational information only — not investment advice.</div>
      </div>
    `;

    document.body.appendChild(launcher);
    document.body.appendChild(panel);

    body = panel.querySelector(".plansip-chat-body");
    input = panel.querySelector(".plansip-chat-input");
    form = panel.querySelector(".plansip-chat-form");

    launcher.addEventListener("click", () => setOpen(!state.open));
    panel.querySelector(".plansip-chat-close").addEventListener("click", () => setOpen(false));
    panel.querySelector(".plansip-chat-clear").addEventListener("click", clearChat);

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const message = input.value.trim();
      if (!message) return;

      input.value = "";
      resizeInput(input);
      panel.classList.add("has-chat");
      await sendMessage(message);

      requestAnimationFrame(() => {
        input.focus({ preventScroll: true });
        keepComposerVisible();
      });
    });

    input.addEventListener("input", () => {
      resizeInput(input);
      keepComposerVisible();
    });

    input.addEventListener("focus", () => {
      panel.classList.add("keyboard-active");
      setViewportHeight();
      setTimeout(keepComposerVisible, 80);
      setTimeout(keepComposerVisible, 280);
    });

    input.addEventListener("blur", () => {
      panel.classList.remove("keyboard-active");
      setViewportHeight();
    });

    input.addEventListener("keydown", (event) => {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        form.requestSubmit();
      }
    });

    panel.querySelectorAll(".plansip-chat-suggestions button").forEach((button) => {
      button.addEventListener("click", async () => {
        panel.classList.add("has-chat");
        await sendMessage(button.textContent.trim());
      });
    });
  }

  function bindViewport() {
    setViewportHeight();

    window.addEventListener("resize", setViewportHeight, { passive: true });
    window.addEventListener("orientationchange", () => {
      setTimeout(setViewportHeight, 80);
      setTimeout(keepComposerVisible, 180);
    });

    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", () => {
        setViewportHeight();
        keepComposerVisible();
      }, { passive: true });

      window.visualViewport.addEventListener("scroll", () => {
        setViewportHeight();
        keepComposerVisible();
      }, { passive: true });
    }
  }

  function setViewportHeight() {
    const vv = window.visualViewport;
    const height = vv ? vv.height : window.innerHeight;
    const offsetTop = vv ? vv.offsetTop : 0;

    document.documentElement.style.setProperty("--plansip-chat-visible-height", `${Math.round(height)}px`);
    document.documentElement.style.setProperty("--plansip-chat-visible-top", `${Math.round(offsetTop)}px`);
  }

  function keepComposerVisible() {
    if (!state.open || !panel) return;

    setViewportHeight();

    requestAnimationFrame(() => {
      if (body) body.scrollTop = body.scrollHeight;
      if (window.matchMedia("(max-width: 640px)").matches && window.visualViewport) {
        panel.style.top = `${Math.max(0, Math.round(window.visualViewport.offsetTop))}px`;
      } else {
        panel.style.top = "";
      }
    });
  }

  function setOpen(open) {
    state.open = open;

    panel.classList.toggle("is-open", open);
    panel.setAttribute("aria-hidden", open ? "false" : "true");
    launcher.classList.toggle("is-hidden", open);
    document.documentElement.classList.toggle("plansip-chat-open", open);
    document.body.classList.toggle("plansip-chat-open", open);

    if (open) {
      setViewportHeight();
      setTimeout(() => {
        input?.focus({ preventScroll: true });
        keepComposerVisible();
      }, 80);
    } else {
      panel.style.top = "";
      input?.blur();
    }
  }

  function clearChat() {
    state.messages = [];
    panel.classList.remove("has-chat");

    body.innerHTML = `
      <div class="plansip-chat-welcome">
        <strong>Chat cleared.</strong>
        <span>Ask me a PlanSIP, SIP or mutual-fund question.</span>
      </div>
    `;

    input?.focus({ preventScroll: true });
    keepComposerVisible();
  }

  async function sendMessage(message) {
    if (!CONFIG.endpoint) {
      appendMessage("assistant", "PlanSIP AI is temporarily unavailable.");
      return;
    }

    const cleanMessage = String(message).slice(0, CONFIG.maxMessageChars);

    appendMessage("user", cleanMessage);
    state.messages.push({ role: "user", content: cleanMessage });
    trimHistory();

    const typing = appendTyping();

    try {
      const response = await fetch(CONFIG.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
        appendMessage("assistant", data.error || "PlanSIP AI is temporarily unavailable.");
        return;
      }

      const reply = String(data.reply || "").trim();

      if (!reply) {
        appendMessage("assistant", "I could not generate a useful answer. Please try again.");
        return;
      }

      state.messages.push({ role: "assistant", content: reply });
      trimHistory();
      appendMessage("assistant", reply);
    } catch (_) {
      typing.remove();
      appendMessage("assistant", "I could not reach PlanSIP AI right now. Please try again.");
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
      visibleResult: "",
      inputs: {}
    };

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

    const resultId = resultIds[context.activeTool];
    const result = resultId ? document.getElementById(resultId) : null;

    if (result) {
      const clone = result.cloneNode(true);
      clone.querySelectorAll(".plansip-ai-inline").forEach((el) => el.remove());
      context.visibleResult = cleanText(clone.innerText).slice(0, 7000);
    }

    const section = context.activeTool ? document.getElementById(context.activeTool) : null;

    section?.querySelectorAll("input, select").forEach((el) => {
      if (!el.id) return;
      if (["hidden", "button", "submit", "password"].includes(el.type)) return;
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
    const tabs = ["find", "sipcalc", "salary", "loan", "freedom", "corpus", "metals", "sip", "compare", "popular"];

    for (const id of tabs) {
      const section = document.getElementById(id);
      if (!section) continue;

      const style = getComputedStyle(section);
      if (style.display !== "none" && style.visibility !== "hidden" && section.getClientRects().length > 0) {
        return id;
      }
    }

    return "";
  }

  function appendMessage(role, text) {
    panel.classList.add("has-chat");

    const row = document.createElement("div");
    row.className = `plansip-chat-message ${role === "user" ? "is-user" : "is-assistant"}`;

    const bubble = document.createElement("div");
    bubble.className = "plansip-chat-bubble";
    bubble.textContent = text;

    row.appendChild(bubble);
    body.appendChild(row);

    requestAnimationFrame(() => {
      body.scrollTop = body.scrollHeight;
      keepComposerVisible();
    });

    return row;
  }

  function appendTyping() {
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

  function resizeInput(el) {
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 112) + "px";
  }

  function cleanText(value) {
    return String(value || "")
      .replace(/\u00a0/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function injectStyles() {
    const old = document.getElementById("plansip-chat-styles-v2");
    if (old) old.remove();

    const style = document.createElement("style");
    style.id = "plansip-chat-styles-v3";
    style.textContent = `
      :root {
        --plansip-chat-visible-height: 100dvh;
        --plansip-chat-visible-top: 0px;
      }

      html.plansip-chat-open,
      body.plansip-chat-open {
        overscroll-behavior: none;
      }

      .plansip-chat-launcher {
        position: fixed;
        right: 18px;
        bottom: calc(18px + env(safe-area-inset-bottom, 0px));
        z-index: 9998;
        border: 0;
        background: transparent;
        padding: 0;
        cursor: pointer;
      }

      .plansip-chat-launcher.is-hidden { display: none; }

      .plansip-dog-wrap {
        position: relative;
        display: flex;
        flex-direction: column;
        align-items: center;
        min-width: 118px;
      }

      .plansip-dog {
        position: relative;
        width: 82px;
        height: 92px;
        animation: plansipDogBounce 1.6s ease-in-out infinite;
      }

      .plansip-dog-head {
        position: absolute;
        top: 6px;
        left: 17px;
        width: 50px;
        height: 46px;
        border-radius: 48% 48% 45% 45%;
        background: #c98b52;
        border: 2px solid rgba(0,0,0,.15);
        z-index: 4;
      }

      .plansip-dog-ear {
        position: absolute;
        top: 4px;
        width: 20px;
        height: 34px;
        background: #8d5d35;
        border-radius: 60% 60% 70% 70%;
        z-index: 2;
      }

      .plansip-dog-ear.left { left: 9px; transform: rotate(25deg); }
      .plansip-dog-ear.right { right: 7px; transform: rotate(-25deg); }

      .plansip-dog-eye {
        position: absolute;
        top: 15px;
        width: 5px;
        height: 6px;
        border-radius: 50%;
        background: #1d1d1f;
      }

      .plansip-dog-eye.left { left: 13px; }
      .plansip-dog-eye.right { right: 13px; }

      .plansip-dog-nose {
        position: absolute;
        left: 20px;
        top: 25px;
        width: 10px;
        height: 7px;
        border-radius: 60%;
        background: #1d1d1f;
      }

      .plansip-dog-mouth {
        position: absolute;
        left: 18px;
        top: 31px;
        width: 14px;
        height: 7px;
        border-bottom: 2px solid #1d1d1f;
        border-radius: 0 0 50% 50%;
      }

      .plansip-dog-body {
        position: absolute;
        top: 43px;
        left: 17px;
        width: 49px;
        height: 42px;
        border-radius: 15px 15px 18px 18px;
        background: #fff;
        border: 2px solid rgba(0,0,0,.15);
        z-index: 3;
      }

      .plansip-dog-shirt {
        position: absolute;
        left: 6px;
        top: 8px;
        width: 35px;
        height: 23px;
        border-radius: 8px;
        background: var(--brand, #007a5a);
        color: #fff;
        font-size: 15px;
        font-weight: 950;
        line-height: 23px;
        text-align: center;
      }

      .plansip-dog-leg {
        position: absolute;
        top: 77px;
        width: 12px;
        height: 14px;
        border-radius: 7px;
        background: #c98b52;
        z-index: 1;
      }

      .plansip-dog-leg.left { left: 22px; }
      .plansip-dog-leg.right { right: 20px; }

      .plansip-dog-tail {
        position: absolute;
        top: 55px;
        right: 2px;
        width: 29px;
        height: 10px;
        border-radius: 12px;
        background: #8d5d35;
        transform-origin: left center;
        animation: plansipDogTail .5s ease-in-out infinite alternate;
        z-index: 1;
      }

      .plansip-dog-ball {
        position: absolute;
        width: 20px;
        height: 20px;
        right: -7px;
        bottom: 1px;
        border-radius: 50%;
        background: #ff9f0a;
        border: 2px solid rgba(0,0,0,.14);
        animation: plansipDogBall 1.2s ease-in-out infinite;
      }

      .plansip-chat-label {
        margin-top: 2px;
        padding: 7px 12px;
        border-radius: 999px;
        background: var(--brand, #007a5a);
        color: #fff;
        font-size: 12px;
        font-weight: 850;
        white-space: nowrap;
        box-shadow: 0 10px 25px rgba(0,0,0,.18);
      }

      @keyframes plansipDogBounce {
        0%,100% { transform: translateY(0) rotate(-1deg); }
        50% { transform: translateY(-7px) rotate(2deg); }
      }

      @keyframes plansipDogTail {
        from { transform: rotate(-20deg); }
        to { transform: rotate(25deg); }
      }

      @keyframes plansipDogBall {
        0%,100% { transform: translateY(0) rotate(0deg); }
        50% { transform: translateY(-8px) rotate(20deg); }
      }

      .plansip-chat-panel {
        --chat-bg: #fff;
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
        height: min(620px, calc(100dvh - 40px));
        max-height: calc(100dvh - 40px);
        min-height: 0;

        display: none;
        grid-template-rows: auto minmax(0, 1fr) auto auto;

        background: var(--chat-bg);
        color: var(--chat-text);
        border: 1px solid var(--chat-border);
        border-radius: 24px;
        overflow: hidden;
        box-shadow: 0 24px 70px rgba(0,0,0,.24);
        box-sizing: border-box;
        contain: layout paint;
      }

      .plansip-chat-panel.is-open { display: grid; }

      .plansip-chat-header {
        display: flex;
        justify-content: space-between;
        gap: 10px;
        align-items: flex-start;
        padding: 14px 14px 12px;
        border-bottom: 1px solid var(--chat-border);
        background: var(--chat-bg);
        min-width: 0;
      }

      .plansip-chat-header-main {
        display: flex;
        gap: 9px;
        align-items: center;
        min-width: 0;
      }

      .plansip-chat-heading { min-width: 0; }

      .plansip-chat-avatar {
        flex: 0 0 auto;
        width: 42px;
        height: 42px;
        border-radius: 14px;
        display: grid;
        place-items: center;
        background: var(--chat-card);
        border: 1px solid var(--chat-border);
      }

      .plansip-mini-dog {
        position: relative;
        width: 30px;
        height: 32px;
      }

      .plansip-mini-dog-head {
        position: absolute;
        top: 0;
        left: 6px;
        width: 18px;
        height: 16px;
        border-radius: 50%;
        background: #c98b52;
      }

      .plansip-mini-dog-body {
        position: absolute;
        left: 5px;
        bottom: 0;
        width: 20px;
        height: 16px;
        border-radius: 6px;
        background: var(--brand, #007a5a);
        color: #fff;
        font-size: 8px;
        font-weight: 900;
        display: grid;
        place-items: center;
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
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .plansip-chat-header-actions {
        display: flex;
        gap: 6px;
        flex: 0 0 auto;
      }

      .plansip-chat-clear,
      .plansip-chat-close {
        width: 34px;
        height: 34px;
        border: 1px solid var(--chat-border);
        border-radius: 10px;
        background: var(--chat-card);
        color: var(--chat-text);
        cursor: pointer;
        font-size: 18px;
      }

      .plansip-chat-body {
        min-height: 0;
        overflow-y: auto;
        overscroll-behavior: contain;
        -webkit-overflow-scrolling: touch;
        padding: 14px;
        background: var(--chat-bg);
        scroll-padding-bottom: 16px;
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

      .plansip-chat-welcome span { color: var(--chat-muted); }

      .plansip-chat-message {
        display: flex;
        margin-top: 10px;
      }

      .plansip-chat-message.is-user { justify-content: flex-end; }
      .plansip-chat-message.is-assistant { justify-content: flex-start; }

      .plansip-chat-bubble {
        max-width: 82%;
        padding: 10px 12px;
        border-radius: 16px;
        font-size: 13px;
        line-height: 1.5;
        white-space: pre-wrap;
        overflow-wrap: anywhere;
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
        scrollbar-width: none;
        border-top: 1px solid var(--chat-border);
        background: var(--chat-bg);
      }

      .plansip-chat-suggestions::-webkit-scrollbar { display: none; }

      .plansip-chat-panel.has-chat .plansip-chat-suggestions {
        display: none;
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

      .plansip-chat-composer {
        position: relative;
        z-index: 3;
        background: var(--chat-bg);
        border-top: 1px solid var(--chat-border);
        padding-bottom: env(safe-area-inset-bottom, 0px);
      }

      .plansip-chat-form {
        display: grid;
        grid-template-columns: minmax(0, 1fr) 46px;
        align-items: end;
        gap: 8px;
        padding: 10px 12px 7px;
        margin: 0;
        min-width: 0;
      }

      .plansip-chat-input {
        display: block;
        box-sizing: border-box;
        width: 100%;
        min-width: 0;
        min-height: 44px;
        max-height: 112px;
        resize: none;
        padding: 11px 12px;
        border: 1px solid var(--chat-border);
        border-radius: 14px;
        outline: none;
        background: var(--chat-card);
        color: var(--chat-text);
        font: inherit;
        font-size: 16px;
        line-height: 1.35;
      }

      .plansip-chat-input:focus {
        border-color: var(--brand, #007a5a);
        box-shadow: 0 0 0 2px color-mix(in srgb, var(--brand, #007a5a) 18%, transparent);
      }

      .plansip-chat-input::placeholder { color: var(--chat-muted); }

      .plansip-chat-send {
        box-sizing: border-box;
        width: 46px;
        min-width: 46px;
        height: 44px;
        min-height: 44px;
        padding: 0;
        border: 0;
        border-radius: 14px;
        background: var(--brand, #007a5a);
        color: #fff;
        font-size: 18px;
        display: grid;
        place-items: center;
        cursor: pointer;
        touch-action: manipulation;
      }

      .plansip-chat-note {
        padding: 0 12px 8px;
        background: var(--chat-bg);
        color: var(--chat-muted);
        font-size: 10px;
        line-height: 1.25;
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

      .plansip-chat-typing span:nth-child(2) { animation-delay: .15s; }
      .plansip-chat-typing span:nth-child(3) { animation-delay: .30s; }

      @keyframes plansipChatDot {
        0%,80%,100% { transform: scale(.7); opacity: .5; }
        40% { transform: scale(1); opacity: 1; }
      }

      @media (prefers-color-scheme: dark) {
        .plansip-chat-panel {
          --chat-bg: #1c1c1e;
          --chat-card: #2c2c2e;
          --chat-text: #f5f5f7;
          --chat-muted: #aeaeb2;
          --chat-border: rgba(255,255,255,.14);
        }

        .plansip-dog-body { background: #f5f5f7; }
      }

      @media (max-width: 640px) {
        .plansip-chat-launcher {
          right: 6px;
          bottom: calc(8px + env(safe-area-inset-bottom, 0px));
        }

        .plansip-dog-wrap {
          transform: scale(.88);
          transform-origin: bottom right;
        }

        html.plansip-chat-open,
        body.plansip-chat-open {
          overflow: hidden !important;
          height: 100%;
          width: 100%;
        }

        .plansip-chat-panel,
        .plansip-chat-panel.is-open {
          top: var(--plansip-chat-visible-top, 0px);
          right: 0;
          bottom: auto;
          left: 0;

          width: 100vw;
          max-width: 100vw;
          height: var(--plansip-chat-visible-height, 100dvh);
          max-height: var(--plansip-chat-visible-height, 100dvh);
          min-height: 0;

          border: 0;
          border-radius: 0;
          box-shadow: none;
        }

        .plansip-chat-header {
          padding-top: calc(10px + env(safe-area-inset-top, 0px));
          padding-right: calc(10px + env(safe-area-inset-right, 0px));
          padding-left: calc(10px + env(safe-area-inset-left, 0px));
          padding-bottom: 9px;
          align-items: center;
        }

        .plansip-chat-avatar {
          width: 36px;
          height: 36px;
          border-radius: 11px;
        }

        .plansip-chat-title { font-size: 16px; }

        .plansip-chat-subtitle {
          font-size: 10.5px;
          white-space: nowrap;
          max-width: min(52vw, 240px);
        }

        .plansip-chat-clear,
        .plansip-chat-close {
          width: 38px;
          height: 38px;
          flex: 0 0 38px;
        }

        .plansip-chat-body {
          padding: 11px;
          min-height: 0;
        }

        .plansip-chat-bubble {
          max-width: 88%;
          font-size: 13px;
        }

        .plansip-chat-suggestions {
          padding: 7px 9px;
        }

        .plansip-chat-form {
          grid-template-columns: minmax(0, 1fr) 48px;
          gap: 7px;
          padding: 8px max(9px, env(safe-area-inset-right, 0px)) 5px max(9px, env(safe-area-inset-left, 0px));
        }

        .plansip-chat-input {
          min-height: 46px;
          max-height: 96px;
          border-radius: 13px;
          font-size: 16px;
        }

        .plansip-chat-send {
          width: 48px;
          min-width: 48px;
          height: 46px;
          min-height: 46px;
          border-radius: 13px;
        }

        .plansip-chat-note {
          padding: 0 max(10px, env(safe-area-inset-right, 0px)) 5px max(10px, env(safe-area-inset-left, 0px));
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .plansip-chat-panel.keyboard-active .plansip-chat-suggestions {
          display: none;
        }

        .plansip-chat-panel.keyboard-active .plansip-chat-header {
          padding-top: 7px;
          padding-bottom: 7px;
        }

        .plansip-chat-panel.keyboard-active .plansip-chat-avatar {
          width: 32px;
          height: 32px;
        }

        .plansip-chat-panel.keyboard-active .plansip-chat-note {
          display: none;
        }
      }

      @media (max-width: 360px) {
        .plansip-chat-subtitle { display: none; }
        .plansip-chat-bubble { max-width: 92%; }
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
