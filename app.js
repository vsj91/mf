"use strict";

/* ---------- Constants and state ---------- */
const API_BASE = "https://api.mfapi.in/mf";
const SEARCH_TTL = 1000 * 60 * 60 * 24 * 30;
const DETAIL_TTL = 1000 * 60 * 60 * 24 * 7;
const ANALYSIS_TTL = 1000 * 60 * 60 * 24 * 7;
const INR = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
const PCT = new Intl.NumberFormat("en-IN", { style: "percent", minimumFractionDigits: 1, maximumFractionDigits: 1 });

const goals = [
  { id: "wealth", icon: "🚀", title: "Wealth Creation", hint: "Longer horizon, growth-focused categories." },
  { id: "retirement", icon: "🌅", title: "Retirement", hint: "Long-term compounding with risk control." },
  { id: "house", icon: "🏡", title: "House", hint: "Match risk to when you need the money." },
  { id: "education", icon: "🎓", title: "Child Education", hint: "Balance growth and predictability." },
  { id: "travel", icon: "✈", title: "Travel", hint: "Shorter goals need steadier categories." },
  { id: "emergency", icon: "🛟", title: "Emergency Fund", hint: "Capital stability matters most." }
];
const durations = [
  { id: "1-3", label: "1–3 years", years: 3 },
  { id: "3-5", label: "3–5 years", years: 5 },
  { id: "5-10", label: "5–10 years", years: 10 },
  { id: "10+", label: "10+ years", years: 12 }
];
const risks = ["Low", "Moderate", "High", "Very High"];
const returnPrefs = [
  { id: "stable", label: "Stable" },
  { id: "moderate", label: "Moderate returns" },
  { id: "high", label: "High returns" }
];
const returnPeriods = [
  { id: "m1", label: "1M", months: 1, title: "1M return" },
  { id: "m3", label: "3M", months: 3, title: "3M return" },
  { id: "m6", label: "6M", months: 6, title: "6M return" },
  { id: "y1", label: "1Y", years: 1, title: "1Y annualized" },
  { id: "y2", label: "2Y", years: 2, title: "2Y CAGR" },
  { id: "y3", label: "3Y", years: 3, title: "3Y CAGR" },
  { id: "y5", label: "5Y", years: 5, title: "5Y CAGR" }
];
const languages = [
  ["en", "English"], ["hi", "Hindi"], ["bn", "Bengali"], ["te", "Telugu"], ["mr", "Marathi"], ["ta", "Tamil"], ["ur", "Urdu"], ["gu", "Gujarati"], ["kn", "Kannada"], ["ml", "Malayalam"], ["pa", "Punjabi"], ["or", "Odia"], ["as", "Assamese"], ["ne", "Nepali"], ["sd", "Sindhi"], ["si", "Sinhala"],
  ["ar", "Arabic"], ["zh-CN", "Chinese Simplified"], ["zh-TW", "Chinese Traditional"], ["ja", "Japanese"], ["ko", "Korean"], ["id", "Indonesian"], ["ms", "Malay"], ["th", "Thai"], ["vi", "Vietnamese"], ["fil", "Filipino"], ["fa", "Persian"], ["tr", "Turkish"], ["he", "Hebrew"],
  ["fr", "French"], ["de", "German"], ["es", "Spanish"], ["it", "Italian"], ["pt", "Portuguese"], ["nl", "Dutch"], ["pl", "Polish"], ["ru", "Russian"], ["uk", "Ukrainian"], ["ro", "Romanian"], ["el", "Greek"], ["sv", "Swedish"], ["da", "Danish"], ["fi", "Finnish"], ["no", "Norwegian"], ["cs", "Czech"], ["hu", "Hungarian"], ["bg", "Bulgarian"], ["hr", "Croatian"], ["sk", "Slovak"], ["sl", "Slovenian"], ["lt", "Lithuanian"], ["lv", "Latvian"], ["et", "Estonian"], ["sr", "Serbian"], ["ca", "Catalan"], ["eu", "Basque"], ["ga", "Irish"], ["cy", "Welsh"], ["is", "Icelandic"], ["mt", "Maltese"], ["sq", "Albanian"], ["mk", "Macedonian"]
];

const state = {
  goal: "wealth",
  duration: "5-10",
  risk: "Moderate",
  returnPref: "moderate",
  language: localStorage.getItem("ffi_language") || "en",
  sipSelected: [],
  compareSelected: [],
  lastRecommendations: [],
  helpTool: "find",
  helpStep: 0
};

const helpGuides = {
  find: {
    label: "Find Funds",
    tab: "find",
    steps: [
      { target: "#goalSelect", title: "Choose your goal", copy: "Pick what the money is for, such as wealth, retirement, house, education, travel, or emergency fund." },
      { target: "#monthlyAmount", title: "Enter monthly amount", copy: "Add the amount you are thinking of investing every month. This also controls how many funds are shown." },
      { target: "#durationChoices", title: "Set duration", copy: "Choose how long the money can stay invested. Short timelines usually need steadier categories." },
      { target: "#riskChoices", title: "Choose risk comfort", copy: "Select the level of ups and downs you can emotionally handle." },
      { target: "#findFundsBtn", title: "Study the shortlist", copy: "Press Study Funds to see fund matches, historical returns, score, and past SIP replay." }
    ]
  },
  sipcalc: {
    label: "SIP Calculator",
    tab: "sipcalc",
    steps: [
      { target: "#sipCalcAmount", title: "Enter SIP amount", copy: "Start with the monthly SIP amount you want to estimate." },
      { target: "#sipCalcYears", title: "Set years", copy: "Choose how long the SIP may continue." },
      { target: "#sipCalcReturn", title: "Choose return assumption", copy: "Use a conservative, balanced, or growth assumption. This is only an estimate." },
      { target: "#runSipCalcBtn", title: "Calculate", copy: "Calculate the estimated corpus, invested amount, and estimated gain." }
    ]
  },
  salary: {
    label: "Salary Planner",
    tab: "salary",
    steps: [
      { target: "#salaryIncome", title: "Enter salary", copy: "Add your monthly take-home salary." },
      { target: ".expense-grid", title: "Add expenses", copy: "Fill Home, Food, Lifestyle, Commute, Bills, and Other to find investable surplus." },
      { target: "#salaryRisk", title: "Pick risk level", copy: "Choose how much market movement you are comfortable studying." },
      { target: "#runSalaryBtn", title: "Plan salary", copy: "Plan Salary shows leftover monthly surplus and funds to study from that surplus." }
    ]
  },
  sip: {
    label: "SIP Replay",
    tab: "sip",
    steps: [
      { target: "#sipSearch", title: "Search funds", copy: "Search and add up to three funds." },
      { target: "#sipAmount", title: "Enter monthly SIP", copy: "Set the same monthly amount for all selected funds." },
      { target: "#sipYears", title: "Choose duration", copy: "Pick 3, 5, or 10 years for historical replay." },
      { target: "#runSipBtn", title: "Run replay", copy: "Replay uses actual NAV dates to compare current historical values." }
    ]
  },
  compare: {
    label: "Compare",
    tab: "compare",
    steps: [
      { target: "#compareSearch", title: "Add funds", copy: "Search and add 2-4 funds for side-by-side comparison." },
      { target: "#runCompareBtn", title: "Compare", copy: "Compare returns, score, volatility, drawdown, and SIP replay result." }
    ]
  },
  loan: {
    label: "Loan Freedom",
    tab: "loan",
    steps: [
      { target: "#loanOutstanding", title: "Enter loan details", copy: "Add outstanding loan, EMI, rate, and remaining years." },
      { target: "#loanSip", title: "Add side SIP", copy: "Enter the extra monthly SIP amount you want to study alongside the loan." },
      { target: "#runLoanBtn", title: "Calculate plan", copy: "See when the side corpus may become comparable to remaining loan balance." }
    ]
  }
};

const els = {};
let translateLoadPromise = null;

document.addEventListener("DOMContentLoaded", init);

function init() {
  cacheEls();
  renderLanguageOptions();
  renderChoices();
  updateRiskHorizonGuidance();
  wireTabs();
  wireInputs();
  wireSearch("sipSearch", "sipSearchResults", "sipSearchStatus", addSipFund, 3);
  wireSearch("compareSearch", "compareSearchResults", "compareSearchStatus", addCompareFund, 4);
  updateAmountUI();
  updateFreedomFields();
  wireLanguageSelector();
  scheduleRecommendationPrefetch(1400);
  if (window.location.hash) setTimeout(() => routeToHash(window.location.hash.slice(1), false), 0);
}

function cacheEls() {
  [
    "goalSelect", "durationChoices", "riskChoices", "returnChoices", "monthlyAmount", "monthlySlider", "monthlyPretty",
    "languageSelect", "helpLaunchBtn", "helpOverlay", "helpCloseBtn", "helpTools", "helpStepCard", "helpPrevBtn", "helpNextBtn",
    "findFundsBtn", "findFundsMobileBtn", "findStatus", "findError", "recommendationResults",
    "sipCalcAmount", "sipCalcYears", "sipCalcReturn", "sipCalcStepUp", "runSipCalcBtn", "sipCalcError", "sipCalcResults",
    "sipSearch", "sipSearchResults", "sipSearchStatus", "sipSelected", "sipAmount", "sipYears",
    "runSipBtn", "sipStatus", "sipError", "sipResults", "compareSearch", "compareSearchResults",
    "compareSearchStatus", "compareSelected", "runCompareBtn", "compareStatus", "compareError", "compareResults",
    "loanType", "loanOutstanding", "loanEmi", "loanRate", "loanYears", "loanSip", "sipReturn",
    "runLoanBtn", "loanError", "loanResults", "freedomGoalType", "croreFields", "freedomFields",
    "croreCurrent", "croreSip", "croreReturn", "croreTarget", "monthlyExpense", "freedomMultiplier",
    "freedomCurrent", "freedomSip", "freedomReturn", "runFreedomBtn", "freedomError", "freedomResults",
    "corpusCurrent", "corpusSip", "corpusLumpsum", "corpusYears", "corpusReturn", "corpusStepUp",
    "salaryIncome", "salaryRisk", "salaryDuration", "salaryReturnPref", "expenseRent", "expenseFood",
    "expenseShopping", "expenseTransport", "expenseBills", "expenseOther", "runSalaryBtn", "salaryStatus",
    "salaryError", "salaryResults",
    "runCorpusBtn", "corpusError", "corpusResults", "metalType", "metalView", "runMetalsBtn",
    "metalStatus", "metalError", "metalResults", "runPopularBtn", "popularStatus", "popularError", "popularResults"
  ].forEach(id => { els[id] = document.getElementById(id); });
}

/* ---------- UI rendering ---------- */
function renderLanguageOptions() {
  els.languageSelect.innerHTML = languages.map(([code, label]) => `
    <option value="${escapeAttr(code)}" ${code === state.language ? "selected" : ""}>${escapeHTML(label)}</option>
  `).join("");
}

function wireLanguageSelector() {
  els.languageSelect.addEventListener("change", event => {
    state.language = event.target.value;
    localStorage.setItem("ffi_language", state.language);
    if (state.language === "en") {
      resetToEnglish(true);
    } else {
      loadGoogleTranslate(() => applyLanguage(state.language));
    }
  });
  if (state.language === "en") {
    clearTranslateCookie();
    document.documentElement.lang = "en";
    sessionStorage.removeItem("ffi_force_english_reload");
  } else {
    scheduleIdle(() => loadGoogleTranslate(() => applyLanguage(state.language)), 900);
  }
}

function applyLanguage(code, attempts = 0) {
  if (code === "en") return;
  sessionStorage.removeItem("ffi_force_english_reload");
  const combo = document.querySelector(".goog-te-combo");
  if (!combo) {
    if (attempts < 20) loadGoogleTranslate(() => setTimeout(() => applyLanguage(code, attempts + 1), 250));
    return;
  }
  combo.value = code;
  combo.dispatchEvent(new Event("change"));
  document.documentElement.lang = code;
}

function resetToEnglish(forceReload) {
  clearTranslateCookie();
  document.documentElement.lang = "en";
  if (forceReload && sessionStorage.getItem("ffi_force_english_reload") !== "1") {
    sessionStorage.setItem("ffi_force_english_reload", "1");
    window.location.reload();
  }
}

function hasTranslateCookie() {
  return document.cookie.split(";").some(item => item.trim().startsWith("googtrans="));
}

function clearTranslateCookie() {
  [
    "googtrans=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/",
    "googtrans=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=plansip.com",
    "googtrans=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=.plansip.com",
    "googtrans=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=vsj91.github.io",
    "googtrans=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=.vsj91.github.io",
    "googtrans=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=github.io",
    "googtrans=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=.github.io"
  ].forEach(cookie => {
    document.cookie = cookie;
  });
}

window.googleTranslateElementInit = function googleTranslateElementInit() {
  new google.translate.TranslateElement({
    pageLanguage: "en",
    includedLanguages: languages.map(([code]) => code).filter(code => code !== "en").join(","),
    autoDisplay: false
  }, "google_translate_element");
  if (state.language !== "en") setTimeout(() => applyLanguage(state.language), 700);
};

function loadGoogleTranslate(callback) {
  if (window.google?.translate?.TranslateElement) {
    callback?.();
    return Promise.resolve();
  }
  if (!translateLoadPromise) {
    translateLoadPromise = new Promise((resolve, reject) => {
      const existing = document.querySelector("script[data-google-translate]");
      const done = () => {
        resolve();
        if (callback) setTimeout(callback, 250);
      };
      if (existing) {
        existing.addEventListener("load", done, { once: true });
        existing.addEventListener("error", reject, { once: true });
        return;
      }
      const script = document.createElement("script");
      script.src = "https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
      script.async = true;
      script.dataset.googleTranslate = "true";
      script.addEventListener("load", done, { once: true });
      script.addEventListener("error", reject, { once: true });
      document.head.appendChild(script);
    }).catch(() => {
      translateLoadPromise = null;
    });
  } else if (callback) {
    translateLoadPromise.then(callback);
  }
  return translateLoadPromise;
}

function renderChoices() {
  els.goalSelect.innerHTML = goals.map(goal => `
    <option value="${escapeAttr(goal.id)}" ${goal.id === state.goal ? "selected" : ""}>${goal.icon} ${escapeHTML(goal.title)}</option>
  `).join("");
  els.durationChoices.innerHTML = durations.map(duration => `
    <button class="segment ${duration.id === state.duration ? "selected" : ""}" data-duration="${escapeAttr(duration.id)}" type="button">${escapeHTML(duration.label)}</button>
  `).join("");
  els.riskChoices.innerHTML = risks.map(risk => `
    <button class="segment ${risk === state.risk ? "selected" : ""}" data-risk="${escapeAttr(risk)}" type="button">${escapeHTML(risk)}</button>
  `).join("");
  els.returnChoices.innerHTML = returnPrefs.map(pref => `
    <button class="segment ${pref.id === state.returnPref ? "selected" : ""}" data-return-pref="${escapeAttr(pref.id)}" type="button">${escapeHTML(pref.label)}</button>
  `).join("");
}

function wireTabs() {
  document.querySelectorAll(".tab").forEach(tab => {
    tab.addEventListener("click", () => showTab(tab.dataset.tab));
  });
  document.querySelectorAll("a[href^='#']").forEach(anchor => {
    anchor.addEventListener("click", event => {
      const id = anchor.getAttribute("href").slice(1);
      const target = document.getElementById(id);
      if (target) {
        event.preventDefault();
        event.stopPropagation();
        routeToHash(id, true);
      }
    });
  });
  window.addEventListener("hashchange", () => routeToHash(window.location.hash.slice(1), false));
}

function routeToHash(id, updateHash) {
  const target = document.getElementById(id);
  const section = target?.classList.contains("section") ? target : target?.closest(".section");
  if (!section) return;
  showTab(section.id, updateHash ? id : null);
  if (target && target !== section) {
    if (target.matches("details")) target.open = true;
    requestAnimationFrame(() => target.scrollIntoView({ behavior: "smooth", block: "start" }));
  } else {
    requestAnimationFrame(() => section.scrollIntoView({ behavior: "smooth", block: "start" }));
  }
}

function showTab(id, hashId = id) {
  const section = document.getElementById(id);
  if (!section?.classList.contains("section")) return;
  document.querySelectorAll(".tab").forEach(t => t.classList.toggle("active", t.dataset.tab === id));
  document.querySelectorAll(".section").forEach(s => s.classList.toggle("active", s.id === id));
  if (id === "popular") scheduleIdle(() => loadMostInvestedStudyFunds(), 300);
  if (hashId) history.replaceState(null, "", "#" + hashId);
}


function updateRiskHorizonGuidance() {
  const riskHost = els.riskChoices?.parentElement;
  if (!riskHost) return;

  let note = document.getElementById("riskHorizonGuidance");
  if (!note) {
    note = document.createElement("div");
    note.id = "riskHorizonGuidance";
    note.className = "risk-horizon-guidance";
    note.setAttribute("role", "status");
    note.setAttribute("aria-live", "polite");
    riskHost.appendChild(note);
  }

  const isShortHorizon = state.duration === "1-3";
  const isHighRisk = state.risk === "High" || state.risk === "Very High";
  const shouldShow = isShortHorizon && isHighRisk;

  if (!shouldShow) {
    note.hidden = true;
    note.innerHTML = "";
    return;
  }

  note.hidden = false;
  note.innerHTML = `
    <div class="risk-horizon-icon" aria-hidden="true">🛡️</div>
    <div class="risk-horizon-content">
      <strong>${escapeHTML(state.risk)} risk selected — but your time horizon is short</strong>
      <p>
        Your risk tolerance is ${escapeHTML(state.risk.toLowerCase())}, but a 1–3 year goal may not leave enough time
        for equity markets to recover after a sharp fall. PlanSIP therefore keeps the shortlist inside
        short-horizon categories and uses your risk choice to rank the more aggressive eligible options first.
      </p>
      <div class="risk-horizon-tags">
        <span>Risk tolerance: ${escapeHTML(state.risk)}</span>
        <span>Horizon: 1–3 years</span>
        <span>Equity: excluded for this horizon</span>
      </div>
      <div class="risk-horizon-actions">
        <span>Want equity-oriented choices?</span>
        <button class="btn btn-ghost risk-horizon-change" type="button" data-change-longer-horizon>
          Change to 5–10 years
        </button>
      </div>
    </div>
  `;

  note.querySelector("[data-change-longer-horizon]")?.addEventListener("click", () => {
    state.duration = "5-10";
    renderChoices();
    updateRiskHorizonGuidance();
    scheduleRecommendationPrefetch(0);
    els.durationChoices?.scrollIntoView({ behavior: "smooth", block: "center" });
  });
}

function wireInputs() {
  els.goalSelect.addEventListener("change", event => {
    state.goal = event.target.value;
    scheduleRecommendationPrefetch(500);
  });
  els.durationChoices.addEventListener("click", event => {
    const button = event.target.closest("[data-duration]");
    if (!button) return;
    state.duration = button.dataset.duration;
    renderChoices();
    updateRiskHorizonGuidance();
    scheduleRecommendationPrefetch(500);
  });
  els.riskChoices.addEventListener("click", event => {
    const button = event.target.closest("[data-risk]");
    if (!button) return;
    state.risk = button.dataset.risk;
    renderChoices();
    updateRiskHorizonGuidance();
    scheduleRecommendationPrefetch(500);
  });
  els.returnChoices.addEventListener("click", event => {
    const button = event.target.closest("[data-return-pref]");
    if (!button) return;
    state.returnPref = button.dataset.returnPref;
    renderChoices();
    scheduleRecommendationPrefetch(500);
  });
  els.monthlySlider.addEventListener("input", () => {
    els.monthlyAmount.value = els.monthlySlider.value;
    updateAmountUI();
  });
  els.monthlyAmount.addEventListener("input", () => {
    const value = readMoney(els.monthlyAmount.value);
    if (value) els.monthlySlider.value = clamp(value, 1000, 200000);
    updateAmountUI();
  });
  els.findFundsBtn.addEventListener("click", findFunds);
  els.findFundsMobileBtn.addEventListener("click", findFunds);
  els.helpLaunchBtn.addEventListener("click", openHelpGuide);
  els.helpCloseBtn.addEventListener("click", closeHelpGuide);
  els.helpOverlay.addEventListener("click", event => {
    if (event.target === els.helpOverlay) closeHelpGuide();
  });
  els.helpPrevBtn.addEventListener("click", () => moveHelpStep(-1));
  els.helpNextBtn.addEventListener("click", () => moveHelpStep(1));
  els.runSipCalcBtn.addEventListener("click", () => runWithButtonLoading(els.runSipCalcBtn, "Calculating SIP...", () => runSipCalculator()));
  els.runSipBtn.addEventListener("click", () => runWithButtonLoading(els.runSipBtn, "Running SIP replay...", runSipChallenge));
  els.runCompareBtn.addEventListener("click", () => runWithButtonLoading(els.runCompareBtn, "Comparing funds...", runCompare));
  els.runLoanBtn.addEventListener("click", () => runWithButtonLoading(els.runLoanBtn, "Calculating plan...", runLoanPlanner));
  els.freedomGoalType.addEventListener("change", updateFreedomFields);
  els.runFreedomBtn.addEventListener("click", () => runWithButtonLoading(els.runFreedomBtn, "Calculating goal...", runFreedomGoals));
  els.runSalaryBtn.addEventListener("click", () => runWithButtonLoading(els.runSalaryBtn, "Planning salary...", runSalaryPlanner));
  els.runCorpusBtn.addEventListener("click", () => runWithButtonLoading(els.runCorpusBtn, "Calculating corpus...", runCorpusCalculator));
  els.runMetalsBtn.addEventListener("click", () => runWithButtonLoading(els.runMetalsBtn, "Loading metal funds...", runMetalTracker));
  els.runPopularBtn.addEventListener("click", () => runWithButtonLoading(els.runPopularBtn, "Loading popular funds...", loadMostInvestedStudyFunds));
  runSipCalculator(false);
}

function openHelpGuide() {
  const active = document.querySelector(".section.active")?.id;
  if (helpGuides[active]) state.helpTool = active;
  state.helpStep = 0;
  els.helpOverlay.classList.add("show");
  els.helpOverlay.setAttribute("aria-hidden", "false");
  renderHelpGuide();
}

function closeHelpGuide() {
  els.helpOverlay.classList.remove("show");
  els.helpOverlay.setAttribute("aria-hidden", "true");
  clearHelpHighlight();
}

function renderHelpGuide() {
  const guide = helpGuides[state.helpTool] || helpGuides.find;
  const steps = guide.steps;
  const step = steps[state.helpStep] || steps[0];
  showTab(guide.tab, guide.tab);
  els.helpTools.innerHTML = Object.entries(helpGuides).map(([id, item]) => `
    <button class="help-tool ${id === state.helpTool ? "active" : ""}" type="button" data-help-tool="${escapeAttr(id)}">${escapeHTML(item.label)}</button>
  `).join("");
  els.helpTools.querySelectorAll("[data-help-tool]").forEach(button => {
    button.addEventListener("click", () => {
      state.helpTool = button.dataset.helpTool;
      state.helpStep = 0;
      renderHelpGuide();
    });
  });
  els.helpStepCard.innerHTML = `
    <div class="help-count">Step ${state.helpStep + 1} of ${steps.length}</div>
    <h3>${escapeHTML(step.title)}</h3>
    <p>${escapeHTML(step.copy)}</p>
  `;
  els.helpPrevBtn.disabled = state.helpStep === 0;
  els.helpNextBtn.textContent = state.helpStep === steps.length - 1 ? "Done" : "Next";
  highlightHelpTarget(step.target);
}

function moveHelpStep(direction) {
  const guide = helpGuides[state.helpTool] || helpGuides.find;
  if (direction > 0 && state.helpStep === guide.steps.length - 1) {
    closeHelpGuide();
    return;
  }
  state.helpStep = clamp(state.helpStep + direction, 0, guide.steps.length - 1);
  renderHelpGuide();
}

function highlightHelpTarget(selector) {
  clearHelpHighlight();
  const target = document.querySelector(selector);
  if (!target) return;
  target.classList.add("help-highlight");
  setTimeout(() => {
    target.scrollIntoView({ behavior: "smooth", block: "center" });
  }, 60);
}

function clearHelpHighlight() {
  document.querySelectorAll(".help-highlight").forEach(item => item.classList.remove("help-highlight"));
}

function updateAmountUI() {
  const amount = readMoney(els.monthlyAmount.value) || 0;
  els.monthlyPretty.textContent = `${INR.format(amount)} per month`;
}

function renderSelected(container, selected, removeFn) {
  container.innerHTML = selected.map(fund => `
    <span class="chip">
      <span title="${escapeAttr(fund.schemeName)}">${escapeHTML(cleanName(fund.schemeName))}</span>
      <button type="button" aria-label="Remove ${escapeAttr(fund.schemeName)}" data-code="${escapeAttr(fund.schemeCode)}">×</button>
    </span>
  `).join("");
  container.querySelectorAll("button").forEach(button => {
    button.addEventListener("click", () => removeFn(String(button.dataset.code)));
  });
}

function setStatus(el, show) {
  el.classList.toggle("show", Boolean(show));
}

function setFindLoading(isLoading) {
  const label = isLoading ? `<span class="spinner" aria-hidden="true"></span><span>Finding funds...</span>` : "Study Funds";
  [els.findFundsBtn, els.findFundsMobileBtn].forEach(button => {
    button.disabled = isLoading;
    button.innerHTML = label;
    button.setAttribute("aria-busy", String(isLoading));
  });
  setStatus(els.findStatus, isLoading);
}

function setButtonLoading(button, isLoading, loadingText) {
  if (!button) return;
  if (!button.dataset.idleLabel) button.dataset.idleLabel = button.innerHTML;
  button.disabled = Boolean(isLoading);
  button.setAttribute("aria-busy", String(Boolean(isLoading)));
  button.innerHTML = isLoading
    ? `<span class="spinner" aria-hidden="true"></span><span>${escapeHTML(loadingText)}</span>`
    : button.dataset.idleLabel;
}

function nextPaint() {
  return new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
}

async function runWithButtonLoading(button, loadingText, action) {
  setButtonLoading(button, true, loadingText);
  await nextPaint();
  try {
    return await action();
  } finally {
    setButtonLoading(button, false, loadingText);
  }
}

function scrollToResults(target) {
  if (!target) return;
  setTimeout(() => target.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
}

function showError(el, message) {
  el.innerHTML = message ? `<div class="error">${escapeHTML(message)}</div>` : "";
}

/* ---------- MFapi integration and caching ---------- */
async function searchFunds(query) {
  const cleanQuery = query.trim();
  if (cleanQuery.length < 2) return [];
  const cacheKey = "ffi_search_" + cleanQuery.toLowerCase();
  const cached = readCache(cacheKey, SEARCH_TTL);
  if (cached) return cached;
  const response = await fetch(`${API_BASE}/search?q=${encodeURIComponent(cleanQuery)}`);
  if (!response.ok) throw new Error("MFapi search failed.");
  const data = await response.json();
  const deduped = dedupeSearch(Array.isArray(data) ? data : []);
  writeCache(cacheKey, deduped);
  return deduped;
}

async function getFundDetails(schemeCode) {
  const cacheKey = "ffi_detail_" + schemeCode;
  const cached = readCache(cacheKey, DETAIL_TTL);
  if (cached) return normalizeDetail(cached);
  const response = await fetch(`${API_BASE}/${encodeURIComponent(schemeCode)}`);
  if (!response.ok) throw new Error("Could not download NAV history.");
  const data = await response.json();
  writeCache(cacheKey, data);
  return normalizeDetail(data);
}

async function getAnalysedFund(candidate) {
  const cacheKey = "ffi_analysis_v4_" + candidate.schemeCode;
  const cached = readCache(cacheKey, ANALYSIS_TTL);
  if (cached) return hydrateAnalysis(cached);
  const detail = await getFundDetails(candidate.schemeCode);
  if (detail.history.length < 250) return null;
  const analysis = analyseFund(candidate, detail);
  const light = stripAnalysisForCache(analysis);
  writeCache(cacheKey, light);
  return hydrateAnalysis(light);
}

function readCache(key, ttl) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const payload = JSON.parse(raw);
    if (!payload || Date.now() - payload.time > ttl) return null;
    return payload.value;
  } catch (_) {
    return null;
  }
}

function writeCache(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify({ time: Date.now(), value }));
  } catch (_) {
    /* Storage can be full or disabled; the app still works without cache. */
  }
}

function normalizeDetail(raw) {
  const rows = Array.isArray(raw.data) ? raw.data : [];
  const history = rows.map(row => ({
    date: parseMFDate(row.date),
    nav: Number(row.nav)
  })).filter(row => row.date instanceof Date && !Number.isNaN(row.nav) && row.nav > 0)
    .sort((a, b) => a.date - b.date);
  return {
    meta: raw.meta || {},
    history,
    latest: history[history.length - 1] || null
  };
}

function stripAnalysisForCache(analysis) {
  return {
    code: analysis.code,
    name: analysis.name,
    category: analysis.category,
    type: analysis.type,
    latest: analysis.latest ? { date: analysis.latest.date.toISOString(), nav: analysis.latest.nav } : null,
    returns: analysis.returns,
    periodReturns: analysis.periodReturns,
    navPath: analysis.navPath,
    volatility: analysis.volatility,
    consistency: analysis.consistency,
    maxDrawdown: analysis.maxDrawdown,
    historyYears: analysis.historyYears,
    score: analysis.score
  };
}

function hydrateAnalysis(analysis) {
  if (!analysis) return null;
  return {
    ...analysis,
    latest: analysis.latest ? { ...analysis.latest, date: new Date(analysis.latest.date) } : null,
    navPath: Array.isArray(analysis.navPath) ? analysis.navPath.map(point => ({ ...point, date: new Date(point.date) })) : []
  };
}

function dedupeSearch(items) {
  const directGrowth = [];
  const fallback = [];
  const seenNames = new Set();
  for (const item of items) {
    if (!item || !item.schemeCode || !item.schemeName) continue;
    const name = String(item.schemeName);
    if (/idcw|dividend|bonus|reinvestment/i.test(name)) continue;
    const key = name.toLowerCase()
      .replace(/\b(direct|regular|plan|growth|option)\b/g, "")
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
    if (seenNames.has(key)) continue;
    seenNames.add(key);
    const entry = { schemeCode: String(item.schemeCode), schemeName: name };
    if (/direct/i.test(name) && /growth/i.test(name)) directGrowth.push(entry);
    else fallback.push(entry);
  }
  return directGrowth.concat(fallback).slice(0, 30);
}

function wireSearch(inputId, resultsId, statusId, addFn, limit) {
  const input = els[inputId];
  const results = els[resultsId];
  const status = els[statusId];
  const run = debounce(async () => {
    const query = input.value.trim();
    results.innerHTML = "";
    if (query.length < 2) return;
    setStatus(status, true);
    try {
      const funds = await searchFunds(query);
      results.innerHTML = funds.length ? funds.slice(0, 10).map(fund => `
        <button class="search-item" type="button" data-code="${escapeAttr(fund.schemeCode)}" data-name="${escapeAttr(fund.schemeName)}">
          <span>${escapeHTML(cleanName(fund.schemeName))}</span>
          <span class="pill">Add</span>
        </button>
      `).join("") : `<div class="empty">No matching funds found.</div>`;
      results.querySelectorAll(".search-item").forEach(button => {
        button.addEventListener("click", () => {
          addFn({ schemeCode: String(button.dataset.code), schemeName: button.dataset.name }, limit);
          input.value = "";
          results.innerHTML = "";
        });
      });
    } catch (error) {
      results.innerHTML = `<div class="error">${escapeHTML(error.message || "Search failed. Please try again.")}</div>`;
    } finally {
      setStatus(status, false);
    }
  }, 350);
  input.addEventListener("input", run);
}

/* ---------- Recommendations ---------- */
async function findFunds() {
  showError(els.findError, "");
  els.recommendationResults.innerHTML = "";
  setFindLoading(true);
  try {
    const amount = readMoney(els.monthlyAmount.value) || 10000;
    const profile = getProfile();
    const funds = await recommendFundsForProfile(profile, amount, { hydrateHistory: true });
    renderRecommendations(funds, profile, amount);
  } catch (error) {
    showError(els.findError, error.message || "Something went wrong while finding funds.");
  } finally {
    setFindLoading(false);
  }
}

async function hydrateFundsWithHistory(funds) {
  return Promise.all(funds.map(async fund => {
    if (Array.isArray(fund.history) && fund.history.length) return fund;
    try {
      const detail = await getFundDetails(fund.code);
      return { ...fund, history: detail.history, latest: detail.latest || fund.latest };
    } catch (_) {
      return { ...fund, history: [] };
    }
  }));
}

function getProfile() {
  const duration = durations.find(d => d.id === state.duration) || durations[2];
  const returnPref = state.returnPref || "moderate";
  return { goal: state.goal, duration, risk: state.risk, returnPref };
}

const prefetchRecommendationSearches = debounce(async () => {
  const profile = getProfile();
  await Promise.all(recommendationQueries(profile).map(query => searchFunds(query).catch(() => [])));
}, 450);

function scheduleRecommendationPrefetch(timeout = 1000) {
  scheduleIdle(() => prefetchRecommendationSearches(), timeout);
}

function scheduleIdle(callback, timeout = 1000) {
  if ("requestIdleCallback" in window) {
    window.requestIdleCallback(callback, { timeout });
    return;
  }
  window.setTimeout(callback, timeout);
}

function recommendationQueries(profile) {
  // V2 suitability-first model: horizon is the hard gate. Risk and return preference
  // only change choices inside the universe that is suitable for that horizon.
  const durationId = profile.duration?.id || "5-10";

  // Emergency money should stay highly liquid regardless of risk/return preference.
  if (profile.goal === "emergency") {
    return [
      "overnight fund direct growth",
      "liquid fund direct growth",
      "money market fund direct growth",
      "ultra short duration fund direct growth"
    ];
  }

  // 1-3 years: no pure-equity search, even for High / Very High risk.
  if (durationId === "1-3") {
    const base = [
      "liquid fund direct growth",
      "money market fund direct growth",
      "ultra short duration fund direct growth",
      "short duration debt fund direct growth"
    ];
    if (profile.risk === "High" || profile.risk === "Very High") {
      base.push("corporate bond fund direct growth", "banking and psu debt fund direct growth");
    }
    return [...new Set(base)];
  }

  // 3-5 years: keep pure high-beta equity out; use debt/hybrid/core large/index choices.
  if (durationId === "3-5") {
    let base = [
      "short duration debt fund direct growth",
      "corporate bond fund direct growth",
      "banking and psu debt fund direct growth",
      "balanced advantage fund direct growth"
    ];
    if (profile.risk === "Moderate") base.push("conservative hybrid fund direct growth", "large cap fund direct growth", "nifty 50 index fund direct growth");
    if (profile.risk === "High" || profile.risk === "Very High") base.push("aggressive hybrid fund direct growth", "large cap fund direct growth", "nifty 50 index fund direct growth");
    if (profile.goal === "travel" || profile.returnPref === "stable") {
      base = ["short duration debt fund direct growth", "corporate bond fund direct growth", "balanced advantage fund direct growth"].concat(base);
    }
    return [...new Set(base)];
  }

  // 5-10 years: diversified equity becomes acceptable; risk controls aggressiveness.
  if (durationId === "5-10") {
    let base;
    if (profile.risk === "Low") {
      base = ["balanced advantage fund direct growth", "aggressive hybrid fund direct growth", "nifty 50 index fund direct growth", "large cap fund direct growth"];
    } else if (profile.risk === "Moderate") {
      base = ["nifty 50 index fund direct growth", "large cap fund direct growth", "flexi cap fund direct growth", "balanced advantage fund direct growth"];
    } else if (profile.risk === "High") {
      base = ["flexi cap fund direct growth", "large and mid cap fund direct growth", "mid cap fund direct growth", "nifty 50 index fund direct growth"];
    } else {
      base = ["flexi cap fund direct growth", "mid cap fund direct growth", "large and mid cap fund direct growth", "small cap fund direct growth"];
    }
    if (profile.returnPref === "stable") base = ["balanced advantage fund direct growth", "nifty 50 index fund direct growth", "large cap fund direct growth"].concat(base);
    if (profile.returnPref === "high" && profile.risk !== "Low") base = ["flexi cap fund direct growth", "large and mid cap fund direct growth", "mid cap fund direct growth"].concat(base);
    return [...new Set(base)];
  }

  // 10+ years: broad equity universe, still constrained by the selected risk level.
  let base;
  if (profile.risk === "Low") {
    base = ["balanced advantage fund direct growth", "nifty 50 index fund direct growth", "large cap fund direct growth", "flexi cap fund direct growth"];
  } else if (profile.risk === "Moderate") {
    base = ["nifty 50 index fund direct growth", "large cap fund direct growth", "flexi cap fund direct growth", "large and mid cap fund direct growth"];
  } else if (profile.risk === "High") {
    base = ["flexi cap fund direct growth", "large and mid cap fund direct growth", "mid cap fund direct growth", "nifty 50 index fund direct growth", "value fund direct growth"];
  } else {
    base = ["flexi cap fund direct growth", "mid cap fund direct growth", "small cap fund direct growth", "large and mid cap fund direct growth", "value fund direct growth"];
  }
  base.push("elss direct growth", "nifty 50 index fund direct growth");
  if (profile.returnPref === "stable") base = ["nifty 50 index fund direct growth", "large cap fund direct growth", "balanced advantage fund direct growth"].concat(base);
  if (profile.returnPref === "high" && profile.risk !== "Low") base = ["flexi cap fund direct growth", "mid cap fund direct growth", "large and mid cap fund direct growth"].concat(base);
  return [...new Set(base)];
}

async function recommendFundsForProfile(profile, amount = 10000, options = {}) {
  const analysisLimit = Number.isFinite(options.analysisLimit) ? options.analysisLimit : 16;
  const requestedCount = Number.isFinite(options.count)
    ? Math.max(1, Math.floor(options.count))
    : suggestedFundCount(amount, 3);

  const candidates = await getRecommendationCandidates(profile);
  if (!candidates.length) throw new Error("Could not find candidate funds for this profile.");

  const analysed = (await Promise.all(candidates.slice(0, analysisLimit).map(async candidate => {
    try {
      // Do not spend NAV requests on a category that already fails the horizon/goal hard gate.
      if (!suitabilityAllowsFund(candidate, profile)) return null;
      const analysis = await getAnalysedFund(candidate);
      if (!analysis || !suitabilityAllowsFund(analysis, profile)) return null;
      analysis.profileFit = profileFitScore(analysis, profile);
      const shortHighRiskBoost =
        profile.duration?.id === "1-3" && (profile.risk === "High" || profile.risk === "Very High")
          ? (/corporate bond|banking.*psu|banking and psu/.test(fundCategoryText(analysis)) ? 14
            : /short duration|short term/.test(fundCategoryText(analysis)) ? 8
            : /money market|ultra short/.test(fundCategoryText(analysis)) ? 3
            : 0)
          : 0;
      analysis.finalRank = analysis.score
        + analysis.profileFit
        + returnPreferenceScore(analysis, profile.returnPref, profile)
        + shortHighRiskBoost;
      return analysis;
    } catch (_) {
      return null;
    }
  }))).filter(Boolean);

  // The strict filter is shared by Find Funds, Salary Planner, Loan Freedom,
  // First Crore and Financial Freedom. There is intentionally no fallback to
  // an unsuitable category when the time horizon hard gate rejects it.
  const filtered = strictRecommendationFilter(analysed, profile)
    .filter(fund => fund.latest && isRecentNav(fund.latest.date))
    .sort((a, b) => b.finalRank - a.finalRank);

  if (!filtered.length) {
    throw new Error("MFapi did not return enough suitable funds with recent NAV history for this profile.");
  }

  const diversified = diversifyRecommendationResults(filtered, requestedCount);
  if (options.hydrateHistory) return hydrateFundsWithHistory(diversified);
  return diversified;
}

function recommendationCategoryBucket(fund) {
  const text = fundCategoryText(fund);
  if (/overnight|liquid/.test(text)) return "liquid";
  if (/money market|ultra short|short duration|short term/.test(text)) return "short-debt";
  if (/corporate bond|banking.*psu|gilt|g-sec|debt/.test(text)) return "debt";
  if (/balanced advantage|dynamic asset|hybrid|multi asset/.test(text)) return "hybrid";
  if (/nifty|sensex|index/.test(text)) return "index";
  if (/large cap/.test(text) && !/large & mid|large and mid/.test(text)) return "large-cap";
  if (/flexi/.test(text)) return "flexi-cap";
  if (/large & mid|large and mid/.test(text)) return "large-mid";
  if (/mid cap/.test(text)) return "mid-cap";
  if (/small cap/.test(text)) return "small-cap";
  if (/sector|thematic/.test(text)) return "sectoral";
  return "other";
}

function diversifyRecommendationResults(rankedFunds, count) {
  const target = Math.min(Math.max(1, count), rankedFunds.length);
  if (target <= 1) return rankedFunds.slice(0, target);

  const selected = [];
  const usedBuckets = new Set();
  for (const fund of rankedFunds) {
    const bucket = recommendationCategoryBucket(fund);
    if (usedBuckets.has(bucket)) continue;
    selected.push(fund);
    usedBuckets.add(bucket);
    if (selected.length === target) return selected;
  }

  // If there are not enough distinct categories, fill remaining slots by rank.
  for (const fund of rankedFunds) {
    if (selected.some(item => item.code === fund.code)) continue;
    selected.push(fund);
    if (selected.length === target) break;
  }
  return selected;
}

async function getRecommendationCandidates(profile) {
  const searches = await Promise.all(recommendationQueries(profile).map(async query => {
    try {
      return (await searchFunds(query)).slice(0, 6);
    } catch (_) {
      return [];
    }
  }));
  const all = searches.flat();
  const map = new Map();
  // dedupe by family but keep multiple distinct funds where available (less aggressive)
  all.forEach(fund => {
    const family = (fund.schemeName || "").toLowerCase()
      .replace(/\b(direct|regular|growth|plan|option)\b/g, "")
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
    if (!map.has(family)) map.set(family, []);
    map.get(family).push(fund);
  });

  // Flatten but preserve multiple options per family; compute quick match score to bias ordering
  const candidates = [];
  for (const [, group] of map) {
    for (const fund of group) candidates.push(fund);
  }

  // Score candidates by quick profile text match before heavier analysis
  const scored = candidates.map(fund => ({ fund, s: quickProfileMatchScore(fund, profile) }));
  scored.sort((a, b) => b.s - a.s);

  // Build a simple scored list of funds
  const scoredFunds = scored.map(item => item.fund);

  // Ensure the returned set respects the user's risk/return/duration by reordering buckets
  const covered = ensureProfileCoverage(scoredFunds, profile);

  // Limit and return
  return covered.slice(0, 24);
}

function fundCategoryText(fund) {
  return `${fund.schemeName || fund.name || ""} ${fund.schemeCategory || fund.category || ""} ${fund.type || ""}`.toLowerCase();
}

function isPureEquityCategory(text) {
  return /small cap|mid cap|large & mid|large and mid|flexi|focused|value|contra|sector|thematic|elss|equity/.test(text);
}

function isShortDebtCategory(text) {
  return /overnight|liquid|money market|ultra short|short duration|short term|corporate bond|banking.*psu|banking and psu|debt/.test(text);
}

function isCoreEquityCategory(text) {
  return /nifty|sensex|index|large cap|flexi cap/.test(text);
}

function isHybridCategory(text) {
  return /balanced advantage|dynamic asset|hybrid|multi asset/.test(text);
}

function suitabilityAllowsFund(fund, profile) {
  const text = fundCategoryText(fund);
  const durationId = profile.duration?.id || "5-10";

  if (/idcw|dividend|bonus|reinvestment/.test(text)) return false;

  // Emergency corpus: liquidity first. Do not allow equity/hybrid categories.
  if (profile.goal === "emergency") {
    return /overnight|liquid|money market|ultra short/.test(text);
  }

  // Hard horizon gate: pure equity is not suitable for a 1-3 year goal in this finder.
  if (durationId === "1-3") {
    return isShortDebtCategory(text) && !isPureEquityCategory(text) && !isHybridCategory(text);
  }

  // 3-5 years: avoid high-beta pure equity. Permit debt, hybrid and core large/index exposure.
  if (durationId === "3-5") {
    if (/small cap|mid cap|large & mid|large and mid|sector|thematic|focused|value|contra/.test(text)) return false;
    if (profile.goal === "travel" && isPureEquityCategory(text) && !/index|large cap/.test(text)) return false;
    return isShortDebtCategory(text) || isHybridCategory(text) || /large cap|index|nifty|sensex/.test(text);
  }

  // 5-10 years: equity is allowed, but Low risk excludes aggressive categories.
  if (durationId === "5-10") {
    if (profile.risk === "Low" && /small cap|mid cap|large & mid|large and mid|sector|thematic/.test(text)) return false;
    if (profile.risk === "Moderate" && /sector|thematic/.test(text)) return false;
    return true;
  }

  // 10+ years: broad universe; Low risk still excludes high-beta categories.
  if (profile.risk === "Low" && /small cap|mid cap|sector|thematic/.test(text)) return false;
  if (profile.risk === "Moderate" && /sector|thematic/.test(text)) return false;
  return true;
}

function goalFitScore(fund, profile) {
  const text = fundCategoryText(fund);
  let score = 0;
  if (profile.goal === "emergency") return /overnight|liquid/.test(text) ? 24 : /money market|ultra short/.test(text) ? 18 : 0;
  if (profile.goal === "travel") {
    if (/liquid|money market|ultra short|short duration|corporate bond/.test(text)) score += 14;
    if (isHybridCategory(text)) score += 6;
  }
  if (profile.goal === "house") {
    if (/short duration|corporate bond|balanced advantage|index|large cap/.test(text)) score += 10;
  }
  if (profile.goal === "education") {
    if (/balanced advantage|index|large cap|flexi/.test(text)) score += 10;
  }
  if (profile.goal === "retirement") {
    if (/index|large cap|flexi|balanced advantage/.test(text)) score += 12;
  }
  if (profile.goal === "wealth") {
    if (/index|flexi|large & mid|large and mid|mid cap|large cap/.test(text)) score += 10;
  }
  return score;
}

function profileFitScore(fund, profile) {
  const category = fundCategoryText(fund);
  let fit = goalFitScore(fund, profile);
  if (/direct/.test(category)) fit += 4;
  if (/growth/.test(category)) fit += 3;

  // Duration is intentionally weighted more heavily than risk.
  if (profile.duration.id === "1-3" && /overnight|liquid|money market|ultra short|short duration|corporate bond/.test(category)) fit += 24;
  if (profile.duration.id === "3-5" && /short duration|corporate bond|banking.*psu|balanced advantage|hybrid|large cap|index/.test(category)) fit += 18;
  if (profile.duration.id === "5-10" && /balanced|hybrid|large cap|index|flexi|large & mid|large and mid|mid cap/.test(category)) fit += 15;
  if (profile.duration.id === "10+" && /equity|index|flexi|cap|elss|value/.test(category)) fit += 16;

  if (profile.risk === "Low" && /overnight|liquid|money market|short duration|corporate bond|balanced advantage|index|large cap/.test(category)) fit += 12;
  if (profile.risk === "Moderate" && /balanced|hybrid|large cap|index|flexi/.test(category)) fit += 12;
  if (profile.risk === "High" && /flexi|large & mid|large and mid|mid cap|value|equity/.test(category)) fit += 12;
  if (profile.risk === "Very High" && /small cap|mid cap|large & mid|large and mid|flexi/.test(category)) fit += 12;
  return fit;
}

function returnPreferenceScore(fund, preference, profile = null) {
  const category = fundCategoryText(fund);
  const longReturn = firstNumber(fund.returns?.y10, fund.returns?.y5, fund.returns?.y3, fund.returns?.y1);
  const shortHorizon = profile && (profile.duration?.id === "1-3" || profile.goal === "emergency");

  // Return preference is only a tie-breaker. It can never unlock an unsuitable category.
  if (preference === "stable") {
    const categoryBonus = /liquid|short|debt|corporate|balanced|large cap|index/.test(category) ? 8 : 0;
    return (1 - scale(fund.volatility, 0.04, 0.24)) * 16 + (1 - scale(Math.abs(fund.maxDrawdown || 0), 0.03, 0.45)) * 12 + categoryBonus;
  }
  if (preference === "high") {
    if (shortHorizon) {
      return scale(longReturn, 0.03, 0.10) * 10 + (1 - scale(fund.volatility, 0.02, 0.14)) * 6;
    }
    const growthBonus = /mid cap|large & mid|large and mid|flexi|small cap|value|equity/.test(category) ? 10 : 0;
    return scale(longReturn, 0.04, 0.24) * 20 + scale(fund.returns?.y3, 0.04, 0.22) * 8 + growthBonus;
  }
  const moderateBonus = /balanced|large cap|index|flexi/.test(category) ? 7 : 0;
  return scale(longReturn, 0.02, 0.18) * 10 + (1 - scale(fund.volatility, 0.04, 0.24)) * 9 + moderateBonus;
}

// Cheap candidate-ordering score. Suitability is checked before heavy NAV analysis.
function quickProfileMatchScore(fund, profile) {
  const text = fundCategoryText(fund);
  if (!suitabilityAllowsFund(fund, profile)) return -1000;
  let score = 0;
  if (/direct/.test(text)) score += 4;
  if (/growth/.test(text)) score += 3;
  score += goalFitScore(fund, profile);

  if (profile.duration.id === "1-3") score += /overnight|liquid|money market|ultra short|short duration|corporate bond/.test(text) ? 20 : 0;
  if (profile.duration.id === "3-5") score += /short duration|corporate bond|balanced advantage|hybrid|large cap|index/.test(text) ? 14 : 0;
  if (profile.duration.id === "5-10") score += /balanced|index|large cap|flexi|large & mid|large and mid|mid cap/.test(text) ? 10 : 0;
  if (profile.duration.id === "10+") score += /index|large cap|flexi|large & mid|large and mid|mid cap|small cap|elss/.test(text) ? 10 : 0;

  if (profile.risk === "Low") score += /liquid|short|debt|corporate|balanced|large cap|index/.test(text) ? 8 : 0;
  if (profile.risk === "Moderate") score += /hybrid|balanced|large cap|index|flexi/.test(text) ? 7 : 0;
  if (profile.risk === "High") score += /flexi|large and mid|large & mid|mid cap|value|equity/.test(text) ? 7 : 0;
  if (profile.risk === "Very High") score += /small cap|mid cap|large and mid|large & mid|flexi/.test(text) ? 7 : 0;
  return score;
}

function textRiskLabel(candidate) {
  const text = fundCategoryText(candidate);
  if (/overnight|liquid|money market|short duration|ultra short|corporate bond|banking.*psu|gilt|g-sec|debt/.test(text)) return "Low";
  if (/balanced|hybrid|large cap|index|nifty|sensex/.test(text)) return "Moderate";
  if (/mid cap|flexi|large and mid|large & mid|equity|elss|value|contra/.test(text)) return "High";
  if (/small cap|sector|thematic/.test(text)) return "Very High";
  return "Moderate";
}

function ensureProfileCoverage(candidates, profile) {
  // First remove categories that fail the horizon/goal hard gate.
  const suitable = candidates.filter(c => suitabilityAllowsFund(c, profile));
  const buckets = { Low: [], Moderate: [], High: [], "Very High": [] };
  for (const c of suitable) buckets[textRiskLabel(c)].push(c);

  const ordered = [];
  if (profile.duration.id === "1-3" || profile.goal === "emergency") {
    ordered.push(...buckets.Low, ...buckets.Moderate);
  } else if (profile.risk === "Low" || profile.returnPref === "stable") {
    ordered.push(...buckets.Low, ...buckets.Moderate, ...buckets.High, ...buckets["Very High"]);
  } else if (profile.risk === "Moderate") {
    ordered.push(...buckets.Moderate, ...buckets.Low, ...buckets.High, ...buckets["Very High"]);
  } else if (profile.risk === "High") {
    ordered.push(...buckets.High, ...buckets.Moderate, ...buckets["Very High"], ...buckets.Low);
  } else {
    ordered.push(...buckets["Very High"], ...buckets.High, ...buckets.Moderate, ...buckets.Low);
  }

  const final = [];
  const seen = new Set();
  for (const fund of ordered) {
    const family = (fund.schemeName || fund.name || "").toLowerCase().replace(/\b(direct|regular|growth|plan|option)\b/g, "").replace(/[^a-z0-9]+/g, " ").trim();
    if (!seen.has(family)) {
      final.push(fund);
      seen.add(family);
    }
  }
  return final;
}

function strictRecommendationFilter(analysedFunds, profile) {
  if (!Array.isArray(analysedFunds) || analysedFunds.length === 0) return [];
  return analysedFunds.filter(fund => {
    if (!suitabilityAllowsFund(fund, profile)) return false;
    const text = fundCategoryText(fund);
    const risk = textRiskLabel(fund);

    // Stable preference gets an additional historical-risk check.
    if (profile.returnPref === "stable" && fund.volatility != null) {
      const maxVol = profile.duration.id === "1-3" ? 0.12 : profile.duration.id === "3-5" ? 0.18 : 0.22;
      if (fund.volatility > maxVol) return false;
    }

    // Keep Low-risk profiles out of aggressive categories even at long horizons.
    if (profile.risk === "Low" && (risk === "High" || risk === "Very High") && !/index|large cap|balanced/.test(text)) return false;
    if (profile.risk === "Moderate" && /sector|thematic/.test(text)) return false;
    return true;
  });
}

function renderRecommendations(funds, profile, amount) {
  const goal = goals.find(g => g.id === profile.goal);
  const displayFunds = selectedStudyFunds(funds, amount);
  const displayWeights = studyMixWeights(displayFunds, amount);
  state.lastRecommendations = displayFunds;
  els.recommendationResults.innerHTML = `
    <div class="section-head" style="margin-top:24px">
      <div>
        <h2 class="section-title">Your Shortlist</h2>
        <p class="section-copy">${escapeHTML(goal ? goal.title : "Your goal")} • ${escapeHTML(profile.duration.label)} • ${escapeHTML(profile.risk)} risk • ${escapeHTML(returnPreferenceLabel(profile.returnPref))} • ${escapeHTML(INR.format(amount))}/month</p>
      </div>
    </div>
    ${profile.duration.id === "1-3" && (profile.risk === "High" || profile.risk === "Very High") ? `
      <div class="short-horizon-result-note">
        <strong>Best fit for your 1–3 year horizon</strong>
        <span>You selected ${escapeHTML(profile.risk)} risk. PlanSIP is therefore ranking the relatively higher-risk choices available within short-horizon categories. Equity, mid-cap and small-cap funds remain excluded because the selected investment period is only 1–3 years.</span>
      </div>
    ` : ""}
    <div class="notice">Suitability-first analysis: time horizon is the hard gate, then goal and risk, while return preference only fine-tunes ranking. Funds below also passed historical NAV checks. This is educational analysis, not investment advice.</div>
    ${renderStudyMix(displayWeights, amount)}
    ${renderPeriodComparison(displayFunds)}
    <div class="results-grid">
      ${displayWeights.map((item, index) => renderFundCard(item.fund, profile, item.monthlyAmount, index === 0)).join("")}
    </div>
    <div class="notice">Past performance does not guarantee future returns. The Fund Score is an analytical score, not investment advice.</div>
  `;
  els.recommendationResults.querySelectorAll("[data-detail]").forEach(button => {
    button.addEventListener("click", () => {
      const detail = button.closest(".fund-card").querySelector(".detail");
      detail.classList.toggle("show");
      button.textContent = detail.classList.contains("show") ? "Hide detailed analysis" : "View detailed analysis";
    });
  });
  els.recommendationResults.querySelectorAll("[data-period]").forEach(button => {
    button.addEventListener("click", () => updateReturnChart(button.dataset.period));
  });
  els.recommendationResults.querySelectorAll("[data-fund-chart-period]").forEach(button => {
    button.addEventListener("click", () => updateFundChart(button));
  });
  els.recommendationResults.scrollIntoView({ behavior: "smooth", block: "start" });
}

function selectedStudyFunds(funds, amount) {
  return funds.slice(0, suggestedFundCount(amount, funds.length));
}

async function loadMostInvestedStudyFunds(excludeCodes) {
  const box = els.popularResults || document.getElementById("popularResults");
  if (!box) return;
  const excluded = Array.isArray(excludeCodes) ? excludeCodes.map(String) : [];
  showError(els.popularError, "");
  setStatus(els.popularStatus, true);
  box.innerHTML = `<div class="empty">Loading broad-category funds from MFapi...</div>`;
  try {
    const queries = [
      "nifty 50 index direct growth",
      "sensex index direct growth",
      "large cap direct growth",
      "flexi cap direct growth",
      "balanced advantage direct growth"
    ];
    const raw = (await Promise.all(queries.map(query => searchFunds(query).catch(() => []))))
      .flat()
      .filter(item => !excluded.includes(String(item.schemeCode)));
    const map = new Map();
    raw.forEach(item => {
      const family = item.schemeName.toLowerCase()
        .replace(/\b(direct|regular|growth|plan|option)\b/g, "")
        .replace(/[^a-z0-9]+/g, " ")
        .trim();
      if (!map.has(family) || /direct/i.test(item.schemeName)) map.set(family, item);
    });
    const analysed = (await Promise.all(Array.from(map.values()).slice(0, 12).map(async candidate => {
      try {
        const analysis = await getAnalysedFund(candidate);
        if (!analysis) return null;
        const nameScore = (/direct/i.test(analysis.name) ? 10 : 0) + (/growth/i.test(analysis.name) ? 6 : 0);
        analysis.popularStudyRank = analysis.score + nameScore + scale(analysis.historyYears, 3, 12) * 12;
        return analysis;
      } catch (_) {
        return null;
      }
    }))).filter(Boolean)
      .filter(fund => fund.latest && isRecentNav(fund.latest.date))
      .sort((a, b) => b.popularStudyRank - a.popularStudyRank)
      .slice(0, 4);
    box.innerHTML = renderMostInvestedStudyFunds(analysed);
  } catch (error) {
    showError(els.popularError, error.message || "Could not load this section right now.");
  } finally {
    setStatus(els.popularStatus, false);
  }
}

function renderMostInvestedStudyFunds(funds) {
  if (!funds.length) {
    return `
      <h3 class="mix-title">Popular funds to study</h3>
      <div class="meta-line">MFapi did not return enough data for this section.</div>
    `;
  }
  return `
    <h3 class="mix-title">Popular funds to study</h3>
    <div class="meta-line">MFapi does not publish AUM or investor-count ranking. This separate tab uses broad, commonly used categories and ranks funds by real NAV history, Direct/Growth fit, and analytical score.</div>
    <div class="results-grid" style="margin-top:14px">
      ${funds.map(fund => `
        <article class="fund-card">
          <h3 class="fund-name">${escapeHTML(cleanName(fund.name))}</h3>
          <div class="meta-line">${escapeHTML(metaLabel(fund))}</div>
          <div class="metrics primary">
            <div class="metric"><small>1Y</small><strong>${escapeHTML(formatPercent(fund.periodReturns?.y1))}</strong></div>
            <div class="metric"><small>3Y CAGR</small><strong>${escapeHTML(formatPercent(fund.periodReturns?.y3))}</strong></div>
            <div class="metric"><small>Score</small><strong>${fund.score}/100</strong></div>
          </div>
        </article>
      `).join("")}
    </div>
    <div class="notice">This is not an AUM ranking and not investment advice. Use it only as a study starting point.</div>
  `;
}

function renderPeriodComparison(funds) {
  const defaultPeriod = "y3";
  return `
    <section class="period-panel" aria-label="Historical return comparison">
      <div>
        <h3 class="mix-title">Return Comparison</h3>
        <div class="meta-line">Short periods show NAV return. 1Y and above are annualized from history.</div>
      </div>
      <div class="period-controls" role="group" aria-label="Choose return period">
        ${returnPeriods.map(period => `
          <button class="period-btn ${period.id === defaultPeriod ? "active" : ""}" type="button" data-period="${escapeAttr(period.id)}">${escapeHTML(period.label)}</button>
        `).join("")}
      </div>
      <div class="return-chart" data-return-chart>${renderReturnChartRows(funds, defaultPeriod)}</div>
      <div class="table-wrap" style="margin-top:14px">
        <table>
          <thead>
            <tr>
              <th>Fund</th>
              ${returnPeriods.map(period => `<th>${escapeHTML(period.label)}</th>`).join("")}
            </tr>
          </thead>
          <tbody>
            ${funds.map(fund => `
              <tr>
                <td>${escapeHTML(shortName(fund.name))}</td>
                ${returnPeriods.map(period => `<td>${escapeHTML(formatPercent(fund.periodReturns?.[period.id]))}</td>`).join("")}
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    </section>
  `;
}

function updateReturnChart(periodId) {
  const chart = els.recommendationResults.querySelector("[data-return-chart]");
  if (!chart) return;
  els.recommendationResults.querySelectorAll("[data-period]").forEach(button => {
    button.classList.toggle("active", button.dataset.period === periodId);
  });
  chart.innerHTML = renderReturnChartRows(state.lastRecommendations, periodId);
}

function renderReturnChartRows(funds, periodId) {
  const period = returnPeriods.find(item => item.id === periodId) || returnPeriods[5];
  const rows = funds.map(fund => ({ fund, value: fund.periodReturns?.[period.id] }));
  const maxAbs = Math.max(.01, ...rows.map(row => Math.abs(row.value || 0)));
  return rows.map(row => {
    const width = row.value == null || Number.isNaN(row.value) ? 0 : Math.max(5, Math.round(Math.abs(row.value) / maxAbs * 100));
    const style = row.value == null || Number.isNaN(row.value)
      ? "width:0"
      : `width:${width}%; background:${row.value < 0 ? "#d95f59" : "linear-gradient(90deg, var(--brand), var(--accent))"}`;
    return `
      <div class="return-row">
        <strong title="${escapeAttr(row.fund.name)}">${escapeHTML(shortName(row.fund.name))}</strong>
        <div class="return-track" aria-label="${escapeAttr(period.title)} for ${escapeAttr(row.fund.name)}">
          <div class="return-fill" style="${escapeAttr(style)}"></div>
        </div>
        <span class="mix-percent">${escapeHTML(formatPercent(row.value))}</span>
      </div>
    `;
  }).join("");
}

function renderStudyMix(weights, amount) {
  const colors = ["#007a5a", "#f6b944", "#4f8cff", "#d95f59"];
  let cursor = 0;
  const stops = weights.map((item, index) => {
    const start = cursor;
    cursor += item.percent;
    return `${colors[index % colors.length]} ${start}% ${cursor}%`;
  }).join(", ");
  return `
    <section class="study-mix" aria-label="Filter-based analysis view">
      <div class="mix-donut" style="background:conic-gradient(${escapeAttr(stops)})"></div>
      <div>
        <h3 class="mix-title">Analysis View</h3>
        <div class="meta-line">${escapeHTML(analysisViewCopy(weights.length, amount))}</div>
        <div class="mix-list">
          ${weights.map((item, index) => `
            <div class="mix-item">
              <span class="mix-swatch" style="background:${colors[index % colors.length]}"></span>
              <strong title="${escapeAttr(item.fund.name)}">${escapeHTML(shortName(item.fund.name))}</strong>
              <span class="mix-percent">${item.percent}% • ${escapeHTML(INR.format(item.monthlyAmount))}/mo</span>
            </div>
          `).join("")}
        </div>
      </div>
    </section>
  `;
}

function studyMixWeights(funds, amount) {
  if (funds.length === 1) return [{ fund: funds[0], percent: 100, monthlyAmount: amount }];
  const raw = funds.map(fund => ({
    fund,
    weight: Math.max(12, fund.score + (fund.profileFit || 0) - riskPenaltyForMix(fund))
  }));
  const total = raw.reduce((sum, item) => sum + item.weight, 0) || 1;
  let remaining = 100;
  return raw.map((item, index) => {
    const percent = index === raw.length - 1 ? remaining : Math.max(10, Math.round(item.weight / total * 100));
    remaining -= percent;
    return { fund: item.fund, percent, monthlyAmount: Math.round(amount * percent / 100) };
  });
}

function suggestedFundCount(amount, availableCount) {
  if (amount < 1500) return 1;
  if (amount < 5000) return Math.min(2, availableCount);
  return Math.min(3, availableCount);
}

function analysisViewCopy(count, amount) {
  if (count === 1) {
    return `For ${INR.format(amount)}/month, this view keeps the analysis simple and shows only the closest filter match. It is not a recommendation or advice to invest.`;
  }
  return `This view shows filter-based weights across ${count} shortlisted funds using historical NAV analysis. It is not a recommendation or advice to invest.`;
}

function riskPenaltyForMix(fund) {
  if (fund.volatility == null) return 0;
  return Math.round(scale(fund.volatility, 0.04, 0.28) * 12);
}

function isRecentNav(date) {
  if (!(date instanceof Date)) return false;
  const ageDays = (Date.now() - date.getTime()) / (24 * 60 * 60 * 1000);
  return ageDays <= 180;
}

function renderFundCard(fund, profile, amount, best) {
  return `
    <article class="fund-card ${best ? "best" : ""}">
      <div class="fund-top">
        <div>
          <h3 class="fund-name">${escapeHTML(cleanName(fund.name))}</h3>
          <div class="meta-line">${escapeHTML(metaLabel(fund))}</div>
          <div class="quick-label">
            ${best ? `<span class="pill">Closest study match</span>` : ""}
            <span class="pill">Risk: ${escapeHTML(riskLabel(fund))}</span>
          </div>
        </div>
        <div class="score-ring" style="--p:${fund.score}"><span>${fund.score}</span></div>
      </div>
      <div class="metrics primary">
        <div class="metric"><small>3Y CAGR</small><strong>${formatPercent(fund.returns.y3)}</strong></div>
        <div class="metric"><small>5Y CAGR</small><strong>${formatPercent(fund.returns.y5)}</strong></div>
        <div class="metric"><small>Score</small><strong>${fund.score}/100</strong></div>
      </div>
      ${renderPastSipCorpus(fund, amount, profile.duration.years)}
      ${renderFundNavChart(fund, "all")}
      <div class="why">${escapeHTML(whyMatches(fund, profile))}</div>
      <button class="btn btn-ghost" type="button" data-detail>View detailed analysis</button>
      <div class="detail">
        Latest NAV: ${escapeHTML(formatNav(fund.latest.nav))} on ${escapeHTML(formatDate(fund.latest.date))}. 1Y return: ${escapeHTML(formatPercent(fund.returns.y1))}. 10Y CAGR: ${escapeHTML(formatPercent(fund.returns.y10))}. Volatility: ${escapeHTML(formatPercent(fund.volatility))}. Maximum drawdown: ${escapeHTML(formatPercent(fund.maxDrawdown))}. Positive monthly periods: ${escapeHTML(formatPercent(fund.consistency))}. Available NAV history: ${escapeHTML(fund.historyYears.toFixed(1))} years. The score uses historical return, consistency, volatility, drawdown, and history length. It is not investment advice.
      </div>
    </article>
  `;
}

function renderPastSipCorpus(fund, amount, years) {
  if (!Array.isArray(fund.history) || !fund.history.length || !fund.latest) {
    return `
      <div class="why">
        If you had started a ${escapeHTML(INR.format(amount))}/month SIP ${escapeHTML(String(years))} years ago, this fund does not have enough NAV history to reconstruct a clean result.
      </div>
    `;
  }
  const simulation = simulateSip(fund, amount, years);
  if (!simulation || simulation.instalments < Math.max(6, years * 8)) {
    return `
      <div class="why">
        If you had started a ${escapeHTML(INR.format(amount))}/month SIP ${escapeHTML(String(years))} years ago, this fund does not have enough NAV history to reconstruct a clean result.
      </div>
    `;
  }
  return `
    <div class="past-sip">
      <div class="past-sip-head">
        <small>Past SIP replay</small>
        <span>${escapeHTML(INR.format(amount))}/month • ${escapeHTML(String(years))} years</span>
      </div>
      <strong>${escapeHTML(INR.format(simulation.currentValue))}</strong>
      <div class="past-sip-foot">
        <span>Corpus today</span>
        <span>Invested ${escapeHTML(INR.format(simulation.totalInvested))}</span>
      </div>
    </div>
  `;
}

function renderFundNavChart(fund, period) {
  const chart = fundChartData(fund, period);
  const periods = [["y1", "1Y"], ["y3", "3Y"], ["y5", "5Y"], ["all", "All"]];
  return `
    <div class="fund-chart" data-fund-chart="${escapeAttr(fund.code)}">
      <div class="fund-chart-top">
        <span class="fund-chart-title" data-chart-title>${escapeHTML(chart.label)}</span>
        <span class="fund-chart-return" data-chart-return>${escapeHTML(formatPercent(chart.returnValue))}</span>
      </div>
      <div data-chart-svg>${renderSparkline(chart.points)}</div>
      <div class="fund-chart-controls" role="group" aria-label="Choose fund chart period">
        ${periods.map(([value, label]) => `
          <button class="fund-chart-btn ${value === period ? "active" : ""}" type="button" data-fund-chart-period="${escapeAttr(value)}">${escapeHTML(label)}</button>
        `).join("")}
      </div>
    </div>
  `;
}

function updateFundChart(button) {
  const card = button.closest(".fund-card");
  const chartBox = button.closest("[data-fund-chart]");
  if (!card || !chartBox) return;
  const fund = state.lastRecommendations.find(item => String(item.code) === String(chartBox.dataset.fundChart));
  if (!fund) return;
  const chart = fundChartData(fund, button.dataset.fundChartPeriod);
  chartBox.querySelectorAll("[data-fund-chart-period]").forEach(item => item.classList.toggle("active", item === button));
  chartBox.querySelector("[data-chart-title]").textContent = chart.label;
  chartBox.querySelector("[data-chart-return]").textContent = formatPercent(chart.returnValue);
  chartBox.querySelector("[data-chart-svg]").innerHTML = renderSparkline(chart.points);
}

function fundChartData(fund, period) {
  const points = Array.isArray(fund.navPath) ? fund.navPath : [];
  const latest = points[points.length - 1];
  if (!latest) return { points: [], returnValue: null, label: "NAV history unavailable" };
  let filtered = points;
  let label = "Since start";
  if (period !== "all") {
    const years = Number(period.replace("y", ""));
    const start = addYears(latest.date, -years);
    filtered = points.filter(point => point.date >= start);
    label = `${years}Y NAV path`;
  }
  if (filtered.length < 2) filtered = points.slice(-2);
  const first = filtered[0];
  const last = filtered[filtered.length - 1];
  const returnValue = first && last ? last.nav / first.nav - 1 : null;
  return { points: filtered, returnValue, label };
}

function renderSparkline(points) {
  if (!points || points.length < 2) {
    return `<div class="empty" style="padding:12px">Graph unavailable</div>`;
  }
  const width = 320;
  const height = 92;
  const pad = 8;
  const navs = points.map(point => point.nav);
  const min = Math.min(...navs);
  const max = Math.max(...navs);
  const range = max - min || 1;
  const coords = points.map((point, index) => {
    const x = pad + index / Math.max(points.length - 1, 1) * (width - pad * 2);
    const y = pad + (1 - (point.nav - min) / range) * (height - pad * 2);
    return [x, y];
  });
  const line = coords.map(([x, y], index) => `${index ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
  const area = `${line} L${(width - pad).toFixed(1)} ${(height - pad).toFixed(1)} L${pad.toFixed(1)} ${(height - pad).toFixed(1)} Z`;
  return `
    <svg class="sparkline" viewBox="0 0 ${width} ${height}" role="img" aria-label="Fund NAV graph">
      <line class="axis" x1="${pad}" y1="${height - pad}" x2="${width - pad}" y2="${height - pad}"></line>
      <path class="area" d="${escapeAttr(area)}"></path>
      <path class="line" d="${escapeAttr(line)}"></path>
    </svg>
  `;
}

/* ---------- Analysis math ---------- */
function analyseFund(searchItem, detail) {
  const meta = detail.meta || {};
  const name = meta.scheme_name || searchItem.schemeName;
  const category = meta.scheme_category || "";
  const type = meta.scheme_type || "";
  const history = detail.history;
  const latest = detail.latest;
  const returns = {
    y1: trailingReturn(history, 1, false),
    y3: trailingReturn(history, 3, true),
    y5: trailingReturn(history, 5, true),
    y10: trailingReturn(history, 10, true)
  };
  const periodReturns = {
    m1: trailingMonthsReturn(history, 1),
    m3: trailingMonthsReturn(history, 3),
    m6: trailingMonthsReturn(history, 6),
    y1: trailingReturn(history, 1, true),
    y2: trailingReturn(history, 2, true),
    y3: returns.y3,
    y5: returns.y5
  };
  const monthly = monthlyReturns(history);
  const volatility = annualizedVolatility(monthly);
  const consistency = monthly.length ? monthly.filter(v => v > 0).length / monthly.length : null;
  const maxDrawdown = maximumDrawdown(history);
  const historyYears = (latest.date - history[0].date) / (365.25 * 24 * 60 * 60 * 1000);
  const navPath = sampleNavPath(history);
  const score = fundScore({ returns, volatility, consistency, maxDrawdown, historyYears });
  return { code: searchItem.schemeCode, name, category, type, history, latest, returns, periodReturns, navPath, volatility, consistency, maxDrawdown, historyYears, score };
}

function sampleNavPath(history) {
  if (!history.length) return [];
  const maxPoints = 140;
  const step = Math.max(1, Math.ceil(history.length / maxPoints));
  const sampled = [];
  for (let i = 0; i < history.length; i += step) sampled.push(history[i]);
  const latest = history[history.length - 1];
  if (sampled[sampled.length - 1] !== latest) sampled.push(latest);
  return sampled.map(point => ({ date: point.date.toISOString(), nav: point.nav }));
}

function trailingReturn(history, years, annualized) {
  const latest = history[history.length - 1];
  if (!latest) return null;
  const target = addYears(latest.date, -years);
  const past = closestNav(history, target);
  if (!past) return null;
  const actualYears = (latest.date - past.date) / (365.25 * 24 * 60 * 60 * 1000);
  if (actualYears < years * .82) return null;
  const ratio = latest.nav / past.nav;
  return annualized ? Math.pow(ratio, 1 / actualYears) - 1 : ratio - 1;
}

function trailingMonthsReturn(history, months) {
  const latest = history[history.length - 1];
  if (!latest) return null;
  const target = new Date(latest.date);
  target.setMonth(target.getMonth() - months);
  const past = closestNav(history, target);
  if (!past) return null;
  const actualMonths = (latest.date - past.date) / (30.4375 * 24 * 60 * 60 * 1000);
  if (actualMonths < months * .65) return null;
  return latest.nav / past.nav - 1;
}

function monthlyReturns(history) {
  if (history.length < 2) return [];
  const byMonth = new Map();
  history.forEach(point => {
    const key = `${point.date.getFullYear()}-${String(point.date.getMonth() + 1).padStart(2, "0")}`;
    byMonth.set(key, point);
  });
  const points = Array.from(byMonth.values()).sort((a, b) => a.date - b.date);
  const returns = [];
  for (let i = 1; i < points.length; i++) {
    returns.push(points[i].nav / points[i - 1].nav - 1);
  }
  return returns;
}

function annualizedVolatility(returns) {
  if (returns.length < 6) return null;
  const mean = returns.reduce((sum, value) => sum + value, 0) / returns.length;
  const variance = returns.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) / (returns.length - 1);
  return Math.sqrt(variance) * Math.sqrt(12);
}

function maximumDrawdown(history) {
  if (history.length < 2) return null;
  let peak = history[0].nav;
  let max = 0;
  history.forEach(point => {
    peak = Math.max(peak, point.nav);
    max = Math.min(max, point.nav / peak - 1);
  });
  return max;
}

function fundScore(metrics) {
  const bestReturn = firstNumber(metrics.returns.y10, metrics.returns.y5, metrics.returns.y3, metrics.returns.y1);
  const returnScore = scale(bestReturn, -0.02, 0.18) * 35;
  const consistencyScore = scale(metrics.consistency, 0.42, 0.68) * 20;
  const volScore = (1 - scale(metrics.volatility, 0.02, 0.28)) * 20;
  const drawdownScore = (1 - scale(Math.abs(metrics.maxDrawdown || 0), 0.02, 0.55)) * 15;
  const historyScore = scale(metrics.historyYears, 1, 10) * 10;
  return Math.round(clamp(returnScore + consistencyScore + volScore + drawdownScore + historyScore, 0, 100));
}

function whyMatches(fund, profile) {
  const bits = [];
  bits.push(`${profile.duration.label} horizon suitability`);
  if (profile.goal === "emergency") bits.push("liquidity-first emergency-fund fit");
  else bits.push(`${(goals.find(g => g.id === profile.goal)?.title || profile.goal).toLowerCase()} goal fit`);
  bits.push(`${profile.risk.toLowerCase()} risk fit`);
  if (fund.volatility != null) bits.push(`${riskLabel(fund).toLowerCase()} historical volatility`);
  if (fund.returns.y5 != null || fund.returns.y10 != null) bits.push("usable long-term NAV history");
  return "Why it matches: " + bits.slice(0, 4).join(", ") + ".";
}

function returnPreferenceLabel(value) {
  const pref = returnPrefs.find(item => item.id === value);
  return pref ? pref.label : "Moderate returns";
}

function riskLabel(fund) {
  const text = `${fund.category} ${fund.type} ${fund.name}`.toLowerCase();
  if (/liquid|overnight|money market|short duration|ultra short|corporate bond/.test(text)) return "Low";
  if (/debt|gilt|banking.*psu|balanced|hybrid|large cap|index/.test(text)) return "Moderate";
  if (/small cap|sector|thematic/.test(text)) return "Very High";
  if (/mid cap|equity|flexi|elss|value|contra/.test(text)) return "High";
  if (fund.volatility != null) {
    if (fund.volatility < .06) return "Low";
    if (fund.volatility < .14) return "Moderate";
    if (fund.volatility < .22) return "High";
  }
  return "Data-based";
}

/* ---------- Simple SIP calculator ---------- */
function runSipCalculator(shouldScroll = true) {
  showError(els.sipCalcError, "");
  try {
    const input = {
      sip: readMoney(els.sipCalcAmount.value),
      years: Number(String(els.sipCalcYears.value).replace(/[^\d.]/g, "")),
      rate: Number(els.sipCalcReturn.value),
      stepUp: Number(els.sipCalcStepUp.value)
    };
    validateSipCalcInput(input);
    renderSipCalculatorResults(input, calculateSipProjection(input), shouldScroll);
  } catch (error) {
    showError(els.sipCalcError, error.message || "Could not calculate SIP.");
  }
}

function validateSipCalcInput(input) {
  if (!input.sip || input.sip < 100) throw new Error("Enter a valid monthly SIP.");
  if (!input.years || input.years <= 0 || input.years > 60) throw new Error("Enter investment years between 1 and 60.");
  if (!input.rate || input.rate <= 0 || input.rate > 40) throw new Error("Choose a realistic assumed return.");
  if (input.stepUp < 0 || input.stepUp > 50) throw new Error("Choose a valid yearly SIP step-up.");
}

function calculateSipProjection(input) {
  const months = Math.round(input.years * 12);
  const monthlyRate = input.rate / 100 / 12;
  let sip = input.sip;
  let value = 0;
  let invested = 0;
  const yearly = [];
  for (let month = 1; month <= months; month++) {
    value = value * (1 + monthlyRate) + sip;
    invested += sip;
    if (month % 12 === 0 || month === months) {
      yearly.push({ name: `Year ${Math.ceil(month / 12)}`, value, invested });
    }
    if (month % 12 === 0 && month < months) sip *= 1 + input.stepUp / 100;
  }
  return { months, value, invested, gain: value - invested, yearly };
}

function renderSipCalculatorResults(input, result, shouldScroll = true) {
  const gainPercent = result.invested ? Math.round(clamp(result.gain / result.invested * 100, 0, 999)) : 0;
  els.sipCalcResults.innerHTML = `
    <div class="goal-result">
      <div class="goal-hero">
        <small>Estimated SIP value</small>
        <strong>${escapeHTML(INR.format(result.value))}</strong>
        <span>${escapeHTML(INR.format(input.sip))}/month for ${escapeHTML(monthsLabel(result.months))} at an assumed ${escapeHTML(input.rate)}% annual return${input.stepUp ? ` with ${escapeHTML(input.stepUp)}% yearly step-up` : ""}.</span>
      </div>
      <div class="savings-circle-wrap">
        <div class="goal-circle" style="--goal:${clamp(gainPercent, 0, 100)}"><span>${gainPercent}%<br>gain</span></div>
        <div class="savings-copy">
          <strong>${escapeHTML(INR.format(result.gain))} estimated growth</strong>
          <p>This is a planning estimate from your inputs. Real market returns can be higher or lower.</p>
        </div>
      </div>
      <div class="insight-grid">
        <div class="insight"><small>Total invested</small><strong>${escapeHTML(INR.format(result.invested))}</strong></div>
        <div class="insight"><small>Estimated value</small><strong>${escapeHTML(INR.format(result.value))}</strong></div>
        <div class="insight"><small>Estimated gain</small><strong>${escapeHTML(INR.format(result.gain))}</strong></div>
        <div class="insight"><small>Assumed return</small><strong>${escapeHTML(input.rate)}%</strong></div>
      </div>
      <div class="chart-wrap">${renderValueChart(result.yearly.slice(-12), "SIP growth")}</div>
      <div class="notice">This is not investment advice. Use SIP Replay to study actual historical NAV outcomes for selected mutual funds.</div>
    </div>
  `;
  if (shouldScroll) scrollToResults(els.sipCalcResults);
}

/* ---------- SIP challenge ---------- */
function addSipFund(fund, limit) {
  if (state.sipSelected.some(item => item.schemeCode === fund.schemeCode)) return;
  if (state.sipSelected.length >= limit) {
    showError(els.sipError, "You can compare up to 3 funds in SIP Replay.");
    return;
  }
  showError(els.sipError, "");
  state.sipSelected.push(fund);
  renderSelected(els.sipSelected, state.sipSelected, removeSipFund);
}

function removeSipFund(code) {
  state.sipSelected = state.sipSelected.filter(fund => fund.schemeCode !== code);
  renderSelected(els.sipSelected, state.sipSelected, removeSipFund);
}

async function runSipChallenge() {
  showError(els.sipError, "");
  if (!state.sipSelected.length) {
    showError(els.sipError, "Select at least one fund.");
    return;
  }
  setStatus(els.sipStatus, true);
  try {
    const amount = readMoney(els.sipAmount.value) || 10000;
    const years = Number(els.sipYears.value);
    const results = [];
    for (const fund of state.sipSelected) {
      const detail = await getFundDetails(fund.schemeCode);
      if (detail.history.length < 250) throw new Error(`${cleanName(fund.schemeName)} has insufficient NAV history.`);
      const analysis = analyseFund(fund, detail);
      const simulation = simulateSip(analysis, amount, years);
      results.push({ ...analysis, simulation });
    }
    renderSipResults(results, amount, years);
  } catch (error) {
    showError(els.sipError, error.message || "Could not complete SIP simulation.");
  } finally {
    setStatus(els.sipStatus, false);
  }
}

function simulateSip(fund, amount, years) {
  const latest = fund.latest;
  const start = addYears(latest.date, -years);
  const months = [];
  let cursor = new Date(start.getFullYear(), start.getMonth(), 1);
  const endMonth = new Date(latest.date.getFullYear(), latest.date.getMonth(), 1);
  while (cursor <= endMonth) {
    months.push(new Date(cursor));
    cursor.setMonth(cursor.getMonth() + 1);
  }
  let units = 0;
  const cashflows = [];
  const path = [];
  for (const date of months) {
    const navPoint = closestNav(fund.history, date);
    if (!navPoint || navPoint.date < fund.history[0].date) continue;
    const bought = amount / navPoint.nav;
    units += bought;
    cashflows.push({ amount: -amount, date: navPoint.date });
    path.push({ date: navPoint.date, value: units * navPoint.nav });
  }
  const currentValue = units * latest.nav;
  cashflows.push({ amount: currentValue, date: latest.date });
  const totalInvested = cashflows.filter(c => c.amount < 0).reduce((sum, c) => sum - c.amount, 0);
  return {
    totalInvested,
    currentValue,
    profit: currentValue - totalInvested,
    xirr: xirr(cashflows),
    units,
    instalments: cashflows.length - 1,
    path
  };
}

function renderSipResults(results, amount, years) {
  const winner = results.slice().sort((a, b) => b.simulation.currentValue - a.simulation.currentValue)[0];
  els.sipResults.innerHTML = `
    <h3 class="step-title">${escapeHTML(INR.format(amount))}/month for ${years} years</h3>
    <p class="section-copy" style="margin-bottom:16px">Top historical value: <strong>${escapeHTML(cleanName(winner.name))}</strong> based on highest current historical SIP value.</p>
    <div class="chart-wrap">${renderBarChart(results, r => r.simulation.currentValue, "Current value")}</div>
    <div class="results-grid" style="grid-template-columns:repeat(${Math.min(results.length, 3)}, minmax(0, 1fr)); margin-top:16px">
      ${results.map(r => `
        <article class="fund-card ${r.code === winner.code ? "best" : ""}">
          <h3 class="fund-name">${escapeHTML(cleanName(r.name))}</h3>
          <div class="metrics">
            <div class="metric"><small>Total invested</small><strong>${escapeHTML(INR.format(r.simulation.totalInvested))}</strong></div>
            <div class="metric"><small>Current value</small><strong>${escapeHTML(INR.format(r.simulation.currentValue))}</strong></div>
            <div class="metric"><small>Profit</small><strong>${escapeHTML(INR.format(r.simulation.profit))}</strong></div>
            <div class="metric"><small>XIRR</small><strong>${escapeHTML(formatPercent(r.simulation.xirr))}</strong></div>
          </div>
          <div class="meta-line">${r.simulation.instalments} monthly purchases reconstructed using closest available NAV dates.</div>
        </article>
      `).join("")}
    </div>
  `;
}

/* ---------- Compare funds ---------- */
function addCompareFund(fund, limit) {
  if (state.compareSelected.some(item => item.schemeCode === fund.schemeCode)) return;
  if (state.compareSelected.length >= limit) {
    showError(els.compareError, "You can compare up to 4 funds.");
    return;
  }
  showError(els.compareError, "");
  state.compareSelected.push(fund);
  renderSelected(els.compareSelected, state.compareSelected, removeCompareFund);
}

function removeCompareFund(code) {
  state.compareSelected = state.compareSelected.filter(fund => fund.schemeCode !== code);
  renderSelected(els.compareSelected, state.compareSelected, removeCompareFund);
}

async function runCompare() {
  showError(els.compareError, "");
  if (state.compareSelected.length < 2) {
    showError(els.compareError, "Add at least 2 funds to compare.");
    return;
  }
  setStatus(els.compareStatus, true);
  try {
    const results = [];
    for (const fund of state.compareSelected) {
      const detail = await getFundDetails(fund.schemeCode);
      if (detail.history.length < 250) throw new Error(`${cleanName(fund.schemeName)} has insufficient NAV history.`);
      const analysis = analyseFund(fund, detail);
      analysis.simulation = simulateSip(analysis, 10000, 5);
      results.push(analysis);
    }
    renderCompareResults(results);
  } catch (error) {
    showError(els.compareError, error.message || "Could not compare the selected funds.");
  } finally {
    setStatus(els.compareStatus, false);
  }
}

function renderCompareResults(results) {
  const best = {
    y1: maxCode(results, r => r.returns.y1),
    y3: maxCode(results, r => r.returns.y3),
    y5: maxCode(results, r => r.returns.y5),
    y10: maxCode(results, r => r.returns.y10),
    vol: minCode(results, r => r.volatility),
    drawdown: maxCode(results, r => r.maxDrawdown),
    score: maxCode(results, r => r.score),
    sip: maxCode(results, r => r.simulation.currentValue),
    consistency: maxCode(results, r => r.consistency)
  };
  const overall = results.find(r => r.code === best.score);
  const consistent = results.find(r => r.code === best.consistency);
  const lowVol = results.find(r => r.code === best.vol);
  const sipWinner = results.find(r => r.code === best.sip);
  els.compareResults.innerHTML = `
    <div class="panel">
      <div class="cards-grid" style="margin-bottom:16px">
        <div class="choice selected"><span class="icon">🏆</span><strong>Highest overall score</strong><span>${escapeHTML(cleanName(overall.name))}</span></div>
        <div class="choice"><span class="icon">🧭</span><strong>Most consistent</strong><span>${escapeHTML(cleanName(consistent.name))}</span></div>
        <div class="choice"><span class="icon">🛡</span><strong>Lowest volatility</strong><span>${escapeHTML(cleanName(lowVol.name))}</span></div>
        <div class="choice"><span class="icon">💰</span><strong>Top SIP outcome</strong><span>${escapeHTML(cleanName(sipWinner.name))}</span></div>
      </div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Fund</th><th>1Y</th><th>3Y CAGR</th><th>5Y CAGR</th><th>10Y CAGR</th><th>Volatility</th><th>Max drawdown</th><th>Score</th><th>5Y ₹10k SIP</th>
            </tr>
          </thead>
          <tbody>
            ${results.map(r => `
              <tr>
                <td><strong>${escapeHTML(cleanName(r.name))}</strong><div class="meta-line">${escapeHTML(metaLabel(r))}</div></td>
                <td class="${r.code === best.y1 ? "best-cell" : ""}">${escapeHTML(formatPercent(r.returns.y1))}</td>
                <td class="${r.code === best.y3 ? "best-cell" : ""}">${escapeHTML(formatPercent(r.returns.y3))}</td>
                <td class="${r.code === best.y5 ? "best-cell" : ""}">${escapeHTML(formatPercent(r.returns.y5))}</td>
                <td class="${r.code === best.y10 ? "best-cell" : ""}">${escapeHTML(formatPercent(r.returns.y10))}</td>
                <td class="${r.code === best.vol ? "best-cell" : ""}">${escapeHTML(formatPercent(r.volatility))}</td>
                <td class="${r.code === best.drawdown ? "best-cell" : ""}">${escapeHTML(formatPercent(r.maxDrawdown))}</td>
                <td class="${r.code === best.score ? "best-cell" : ""}">${r.score}/100</td>
                <td class="${r.code === best.sip ? "best-cell" : ""}">${escapeHTML(INR.format(r.simulation.currentValue))}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
      <div class="notice">Comparison metrics are historical calculations from NAV data. They are not recommendations to buy, sell, or hold.</div>
    </div>
  `;
}

/* ---------- Loan freedom planner ---------- */
function runLoanPlanner() {
  showError(els.loanError, "");
  try {
    const input = {
      type: els.loanType.value,
      outstanding: readMoney(els.loanOutstanding.value),
      emi: readMoney(els.loanEmi.value),
      loanRate: Number(String(els.loanRate.value).replace(/[^\d.]/g, "")),
      years: Number(String(els.loanYears.value).replace(/[^\d.]/g, "")),
      sip: readMoney(els.loanSip.value),
      sipReturn: Number(els.sipReturn.value)
    };
    validateLoanInput(input);
    const plan = calculateLoanFreedom(input);
    renderLoanResults(input, plan);
  } catch (error) {
    showError(els.loanError, error.message || "Could not calculate this plan.");
  }
}

function validateLoanInput(input) {
  if (!input.outstanding || input.outstanding < 1000) throw new Error("Enter a valid outstanding loan amount.");
  if (!input.emi || input.emi < 100) throw new Error("Enter a valid EMI.");
  if (!input.loanRate || input.loanRate <= 0) throw new Error("Enter a valid loan interest rate.");
  if (!input.years || input.years <= 0) throw new Error("Enter valid remaining years.");
  if (!input.sip || input.sip < 100) throw new Error("Enter a valid extra monthly SIP amount.");
  const monthlyInterest = input.outstanding * (input.loanRate / 100 / 12);
  if (input.emi <= monthlyInterest) throw new Error("This EMI is too low to reduce the loan at the entered rate.");
}

function calculateLoanFreedom(input) {
  const loanMonthlyRate = input.loanRate / 100 / 12;
  const sipMonthlyRate = input.sipReturn / 100 / 12;
  const maxMonths = Math.ceil(input.years * 12);
  let balance = input.outstanding;
  let corpus = 0;
  let interestPaid = 0;
  let closure = null;
  const points = [];

  for (let month = 1; month <= maxMonths && balance > 1; month++) {
    const interest = balance * loanMonthlyRate;
    const principal = Math.min(input.emi - interest, balance);
    balance = Math.max(0, balance - principal);
    interestPaid += interest;
    corpus = corpus * (1 + sipMonthlyRate) + input.sip;
    points.push({ month, balance, corpus, interestPaid });
    if (!closure && corpus >= balance && balance > 0) {
      closure = { month, balance, corpus, interestPaid };
    }
  }

  const payoff = points[points.length - 1] || { month: 0, balance: input.outstanding, corpus: 0, interestPaid: 0 };
  const naturalMonths = payoff.month;
  const naturalInterest = payoff.interestPaid;
  const closureMonth = closure ? closure.month : null;
  const savedInterest = closure ? Math.max(0, naturalInterest - closure.interestPaid) : 0;
  const progress = closure ? clamp(Math.round(closure.month / Math.max(naturalMonths, 1) * 100), 0, 100) : 100;
  return { points, naturalMonths, naturalInterest, closure, closureMonth, savedInterest, progress };
}

function renderLoanResults(input, plan) {
  const canStudyClosure = Boolean(plan.closure);
  const heroTitle = canStudyClosure ? monthsLabel(plan.closureMonth) : "Not within entered tenure";
  const heroText = canStudyClosure
    ? `At the assumed ${input.sipReturn}% SIP return, the side corpus may become comparable to the remaining ${input.type.toLowerCase()} balance around this time.`
    : `At the assumed ${input.sipReturn}% SIP return, the side corpus does not catch the remaining balance within ${input.years} years.`;
  const closureBalance = plan.closure ? plan.closure.balance : plan.points.at(-1)?.balance || 0;
  const closureCorpus = plan.closure ? plan.closure.corpus : plan.points.at(-1)?.corpus || 0;
  const savePercent = plan.naturalInterest ? Math.round(clamp(plan.savedInterest / plan.naturalInterest * 100, 0, 100)) : 0;
  const monthsEarlier = plan.closure ? Math.max(0, plan.naturalMonths - plan.closureMonth) : 0;
  els.loanResults.innerHTML = `
    <div class="freedom-card">
      <div class="freedom-hero">
        <small>${canStudyClosure ? "Estimated time saved" : "Loan result"}</small>
        <strong>${escapeHTML(canStudyClosure ? monthsLabel(monthsEarlier) + " earlier" : heroTitle)}</strong>
        <span>${escapeHTML(canStudyClosure ? `With this SIP assumption, your side corpus may become close to the remaining loan balance around ${heroTitle}. That is about ${monthsLabel(monthsEarlier)} before the regular EMI-only payoff path.` : heroText)}</span>
      </div>
      <div class="savings-circle-wrap">
        <div class="savings-circle" style="--save:${savePercent}"><span>${savePercent}%<br>saved</span></div>
        <div class="savings-copy">
          <strong>${escapeHTML(INR.format(plan.savedInterest))} interest potentially saved</strong>
          <p>Compared with paying only the regular EMI, this estimates the future loan interest that may be avoided if the side corpus is used for a loan prepayment calculation.</p>
        </div>
      </div>
      <div class="insight-grid">
        <div class="insight"><small>Current payoff path</small><strong>${escapeHTML(monthsLabel(plan.naturalMonths))}</strong></div>
        <div class="insight"><small>Side corpus reaches balance</small><strong>${escapeHTML(canStudyClosure ? heroTitle : "Not reached")}</strong></div>
        <div class="insight"><small>Time potentially saved</small><strong>${escapeHTML(canStudyClosure ? monthsLabel(monthsEarlier) : "Not available")}</strong></div>
        <div class="insight"><small>Future interest on EMI path</small><strong>${escapeHTML(INR.format(plan.naturalInterest))}</strong></div>
        <div class="insight"><small>Side corpus at that time</small><strong>${escapeHTML(INR.format(closureCorpus))}</strong></div>
        <div class="insight"><small>Loan balance at that time</small><strong>${escapeHTML(INR.format(closureBalance))}</strong></div>
      </div>
      <div class="timeline">
        <div class="timeline-track"><div class="timeline-fill" style="width:${canStudyClosure ? plan.progress : 100}%"></div></div>
        <div class="timeline-labels">
          <span>Today</span>
          <span>${escapeHTML(canStudyClosure ? "Corpus meets balance" : "Loan tenure end")}</span>
        </div>
      </div>
      <div class="notice">${escapeHTML(loanPlannerNote(input, plan))}</div>
      <section class="period-panel" id="loanFundSuggestions" aria-label="Funds to study for loan freedom">
        <h3 class="mix-title">Funds to study for this loan plan</h3>
        <div class="meta-line">Loading MFapi historical matches based on your SIP amount and loan timeline...</div>
      </section>
    </div>
  `;
  scrollToResults(els.loanResults);
  loadLoanFundSuggestions(input, plan);
}

async function loadLoanFundSuggestions(input, plan) {
  const box = document.getElementById("loanFundSuggestions");
  if (!box) return;
  try {
    const profile = loanFreedomProfile(input, plan);
    const funds = await recommendFundsForProfile(profile, input.sip);
    box.innerHTML = renderLoanFundSuggestions(funds, profile, input, plan);
  } catch (error) {
    box.innerHTML = `
      <h3 class="mix-title">Funds to study for this loan plan</h3>
      <div class="error">${escapeHTML(error.message || "Could not load fund suggestions right now.")}</div>
    `;
  }
}

function loanFreedomProfile(input, plan) {
  const studyMonths = plan.closureMonth || plan.naturalMonths || Math.round(input.years * 12);
  const years = studyMonths / 12;
  const duration = years <= 3 ? durations[0] : years <= 5 ? durations[1] : years <= 10 ? durations[2] : durations[3];
  const risk = years <= 3 ? "Low" : years <= 5 ? "Moderate" : input.sipReturn >= 12 ? "High" : "Moderate";
  const returnPref = input.sipReturn >= 12 ? "high" : input.sipReturn <= 8 ? "stable" : "moderate";
  return { goal: "house", duration, risk, returnPref };
}

function renderLoanFundSuggestions(funds, profile, input, plan) {
  const studyTime = plan.closureMonth ? monthsLabel(plan.closureMonth) : monthsLabel(plan.naturalMonths);
  return `
    <h3 class="mix-title">Funds to study for this loan plan</h3>
    <div class="meta-line">Based on ${escapeHTML(INR.format(input.sip))}/month SIP, about ${escapeHTML(studyTime)} study timeline, ${escapeHTML(profile.duration.label)}, and ${escapeHTML(profile.risk)} risk. This is educational analysis, not investment advice.</div>
    <div class="results-grid" style="margin-top:14px">
      ${funds.map((fund, index) => `
        <article class="fund-card ${index === 0 ? "best" : ""}">
          <div class="fund-top">
            <div>
              <h3 class="fund-name">${escapeHTML(cleanName(fund.name))}</h3>
              <div class="meta-line">${escapeHTML(metaLabel(fund))}</div>
            </div>
            <div class="score-ring" style="--p:${fund.score}"><span>${fund.score}</span></div>
          </div>
          <div class="metrics primary">
            <div class="metric"><small>1Y</small><strong>${escapeHTML(formatPercent(fund.periodReturns?.y1))}</strong></div>
            <div class="metric"><small>3Y CAGR</small><strong>${escapeHTML(formatPercent(fund.periodReturns?.y3))}</strong></div>
            <div class="metric"><small>5Y CAGR</small><strong>${escapeHTML(formatPercent(fund.periodReturns?.y5))}</strong></div>
          </div>
          <div class="why">${escapeHTML(whyMatches(fund, profile))}</div>
        </article>
      `).join("")}
    </div>
    <div class="notice">These funds are study candidates from MFapi NAV history. Do not treat this as advice to invest or prepay a loan.</div>
  `;
}

function loanPlannerNote(input, plan) {
  if (!plan.closure) {
    return "This does not mean the SIP is bad or the loan must continue. It only means the assumed side corpus does not cross the projected loan balance within the entered tenure.";
  }
  return `Planning view only: if the side corpus is considered for loan prepayment around ${monthsLabel(plan.closureMonth)}, the model estimates about ${INR.format(plan.savedInterest)} of future loan interest could be avoided versus the EMI-only path. Taxes, exit loads, fund returns, and lender charges are not included.`;
}

function monthsLabel(months) {
  if (!months || months < 1) return "0 months";
  const years = Math.floor(months / 12);
  const rem = months % 12;
  if (!years) return `${months} month${months === 1 ? "" : "s"}`;
  if (!rem) return `${years} year${years === 1 ? "" : "s"}`;
  return `${years}y ${rem}m`;
}

/* ---------- Freedom goals ---------- */
function updateFreedomFields() {
  const isCrore = els.freedomGoalType.value === "crore";
  els.croreFields.style.display = isCrore ? "grid" : "none";
  els.freedomFields.style.display = isCrore ? "none" : "grid";
  els.freedomResults.innerHTML = `<div class="empty">Choose a goal and calculate your path.</div>`;
  showError(els.freedomError, "");
}

function runFreedomGoals() {
  showError(els.freedomError, "");
  try {
    if (els.freedomGoalType.value === "crore") {
      const input = {
        current: readMoney(els.croreCurrent.value),
        sip: readMoney(els.croreSip.value),
        rate: Number(els.croreReturn.value),
        target: readMoney(els.croreTarget.value)
      };
      validateGoalInput(input.current, input.sip, input.rate, input.target);
      renderGoalResult("First ₹1 Crore", input, calculateGoalMonths(input), input.target);
    } else {
      const target = readMoney(els.monthlyExpense.value) * 12 * Number(els.freedomMultiplier.value);
      const input = {
        current: readMoney(els.freedomCurrent.value),
        sip: readMoney(els.freedomSip.value),
        rate: Number(els.freedomReturn.value),
        target
      };
      validateGoalInput(input.current, input.sip, input.rate, input.target);
      renderGoalResult("Financial Freedom", input, calculateGoalMonths(input), target);
    }
  } catch (error) {
    showError(els.freedomError, error.message || "Could not calculate this goal.");
  }
}

function validateGoalInput(current, sip, rate, target) {
  if (current < 0 || Number.isNaN(current)) throw new Error("Enter valid current investments.");
  if (!sip || sip < 100) throw new Error("Enter a valid monthly SIP.");
  if (!rate || rate <= 0) throw new Error("Choose a valid assumed return.");
  if (!target || target <= current) throw new Error("Target should be higher than current investments.");
}

function calculateGoalMonths(input) {
  const monthlyRate = input.rate / 100 / 12;
  let corpus = input.current;
  let months = 0;
  const maxMonths = 12 * 80;
  while (corpus < input.target && months < maxMonths) {
    corpus = corpus * (1 + monthlyRate) + input.sip;
    months++;
  }
  return { months, corpus };
}

function renderGoalResult(title, input, result, target) {
  const progress = Math.round(clamp(input.current / target * 100, 0, 100));
  const remaining = Math.max(0, target - input.current);
  const totalInvested = input.current + input.sip * result.months;
  els.freedomResults.innerHTML = `
    <div class="goal-result">
      <div class="goal-hero">
        <small>${escapeHTML(title)}</small>
        <strong>${escapeHTML(monthsLabel(result.months))}</strong>
        <span>At an assumed ${escapeHTML(input.rate)}% annual return and ${escapeHTML(INR.format(input.sip))}/month SIP, this is the estimated time to reach ${escapeHTML(INR.format(target))}.</span>
      </div>
      <div class="savings-circle-wrap">
        <div class="goal-circle" style="--goal:${progress}"><span>${progress}%<br>ready</span></div>
        <div class="savings-copy">
          <strong>${escapeHTML(INR.format(remaining))} left to target</strong>
          <p>Current investments are compared with your target corpus. Growth is assumption-based and not guaranteed.</p>
        </div>
      </div>
      <div class="insight-grid">
        <div class="insight"><small>Target corpus</small><strong>${escapeHTML(INR.format(target))}</strong></div>
        <div class="insight"><small>Current corpus</small><strong>${escapeHTML(INR.format(input.current))}</strong></div>
        <div class="insight"><small>Monthly SIP</small><strong>${escapeHTML(INR.format(input.sip))}</strong></div>
        <div class="insight"><small>Total invested by target</small><strong>${escapeHTML(INR.format(totalInvested))}</strong></div>
      </div>
      <div class="notice">Planning view only. Returns, inflation, taxes, and future income can change the result.</div>
      <section class="period-panel" id="freedomFundSuggestions" aria-label="Funds to study for this goal">
        <h3 class="mix-title">Funds to study for this goal</h3>
        <div class="meta-line">Loading MFapi historical matches based on your goal timeline...</div>
      </section>
    </div>
  `;
  scrollToResults(els.freedomResults);
  loadFreedomFundSuggestions(title, input, result);
}

async function loadFreedomFundSuggestions(title, input, result) {
  const box = document.getElementById("freedomFundSuggestions");
  if (!box) return;
  try {
    const profile = freedomGoalProfile(title, input, result);
    const funds = await recommendFundsForProfile(profile, input.sip);
    box.innerHTML = renderFreedomFundSuggestions(funds, profile, input);
  } catch (error) {
    box.innerHTML = `
      <h3 class="mix-title">Funds to study for this goal</h3>
      <div class="error">${escapeHTML(error.message || "Could not load fund suggestions right now.")}</div>
    `;
  }
}

function freedomGoalProfile(title, input, result) {
  const years = result.months / 12;
  const duration = years <= 3 ? durations[0] : years <= 5 ? durations[1] : years <= 10 ? durations[2] : durations[3];
  const risk = years <= 3 ? "Low" : years <= 5 ? "Moderate" : input.rate >= 12 ? "High" : "Moderate";
  const returnPref = input.rate >= 12 ? "high" : input.rate <= 8 ? "stable" : "moderate";
  return {
    goal: /freedom/i.test(title) ? "retirement" : "wealth",
    duration,
    risk,
    returnPref
  };
}

function renderFreedomFundSuggestions(funds, profile, input) {
  return `
    <h3 class="mix-title">Funds to study for this goal</h3>
    <div class="meta-line">Based on your estimated timeline, ${escapeHTML(profile.duration.label)}, ${escapeHTML(profile.risk)} risk, and ${escapeHTML(INR.format(input.sip))}/month SIP. This is educational analysis, not investment advice.</div>
    <div class="results-grid" style="margin-top:14px">
      ${funds.map((fund, index) => `
        <article class="fund-card ${index === 0 ? "best" : ""}">
          <div class="fund-top">
            <div>
              <h3 class="fund-name">${escapeHTML(cleanName(fund.name))}</h3>
              <div class="meta-line">${escapeHTML(metaLabel(fund))}</div>
            </div>
            <div class="score-ring" style="--p:${fund.score}"><span>${fund.score}</span></div>
          </div>
          <div class="metrics primary">
            <div class="metric"><small>1Y</small><strong>${escapeHTML(formatPercent(fund.periodReturns?.y1))}</strong></div>
            <div class="metric"><small>3Y CAGR</small><strong>${escapeHTML(formatPercent(fund.periodReturns?.y3))}</strong></div>
            <div class="metric"><small>5Y CAGR</small><strong>${escapeHTML(formatPercent(fund.periodReturns?.y5))}</strong></div>
          </div>
          <div class="why">${escapeHTML(whyMatches(fund, profile))}</div>
        </article>
      `).join("")}
    </div>
    <div class="notice">These funds are shown because their category and historical NAV behavior fit the planning profile. They are not a recommendation to invest.</div>
  `;
}

/* ---------- Salary planner ---------- */
async function runSalaryPlanner() {
  showError(els.salaryError, "");
  try {
    const input = readSalaryPlannerInput();
    validateSalaryPlannerInput(input);
    const plan = calculateSalaryPlan(input);
    renderSalaryPlan(input, plan);
    if (plan.investable >= 1000) {
      await loadSalaryFundSuggestions(input, plan);
    }
  } catch (error) {
    showError(els.salaryError, error.message || "Could not calculate salary plan.");
  } finally {
    setStatus(els.salaryStatus, false);
  }
}

function readSalaryPlannerInput() {
  const expenses = {
    rent: readMoney(els.expenseRent.value) || 0,
    food: readMoney(els.expenseFood.value) || 0,
    shopping: readMoney(els.expenseShopping.value) || 0,
    transport: readMoney(els.expenseTransport.value) || 0,
    bills: readMoney(els.expenseBills.value) || 0,
    other: readMoney(els.expenseOther.value) || 0
  };
  const duration = durations.find(item => item.id === els.salaryDuration.value) || durations[2];
  return {
    income: readMoney(els.salaryIncome.value),
    expenses,
    risk: els.salaryRisk.value,
    duration,
    returnPref: els.salaryReturnPref.value || "moderate"
  };
}

function validateSalaryPlannerInput(input) {
  if (!input.income || input.income <= 0) throw new Error("Enter a valid monthly salary.");
  if (Object.values(input.expenses).some(value => value < 0 || Number.isNaN(value))) throw new Error("Enter valid expense amounts.");
}

function calculateSalaryPlan(input) {
  const totalExpenses = Object.values(input.expenses).reduce((sum, value) => sum + value, 0);
  const investable = Math.max(0, input.income - totalExpenses);
  const savingsRate = input.income ? investable / input.income : 0;
  const expenseRate = input.income ? totalExpenses / input.income : 0;
  return { totalExpenses, investable, savingsRate, expenseRate };
}

function renderSalaryPlan(input, plan) {
  const hasSurplus = plan.investable >= 1000;
  els.salaryResults.innerHTML = `
    <div class="goal-result">
      <div class="salary-hero">
        <small>Monthly investable surplus</small>
        <strong>${escapeHTML(INR.format(plan.investable))}</strong>
        <span>${escapeHTML(formatPercent(plan.savingsRate))} of salary left after expenses.</span>
      </div>
      <div class="insight-grid">
        <div class="insight"><small>Monthly salary</small><strong>${escapeHTML(INR.format(input.income))}</strong></div>
        <div class="insight"><small>Total expenses</small><strong>${escapeHTML(INR.format(plan.totalExpenses))}</strong></div>
        <div class="insight"><small>Risk level</small><strong>${escapeHTML(input.risk)}</strong></div>
        <div class="insight"><small>Duration</small><strong>${escapeHTML(input.duration.label)}</strong></div>
      </div>
      <div class="expense-breakdown">
        ${salaryExpenseRows(input.expenses, input.income)}
      </div>
      ${hasSurplus ? `
        <section class="period-panel" id="salaryFundSuggestions" aria-label="Funds to study from salary surplus">
          <h3 class="mix-title">Funds to study from surplus</h3>
          <div class="meta-line">Loading MFapi historical matches based on your monthly surplus...</div>
        </section>
      ` : `
        <div class="notice">Your expenses use nearly all of the entered salary. Try reducing expenses or increasing income before studying monthly SIP options.</div>
      `}
    </div>
  `;
  scrollToResults(els.salaryResults);
}

function salaryExpenseRows(expenses, income) {
  const labels = {
    rent: "Home",
    food: "Food",
    shopping: "Lifestyle",
    transport: "Commute",
    bills: "Bills",
    other: "Other"
  };
  return Object.entries(expenses).map(([key, value]) => {
    const percent = income ? value / income : 0;
    return `
      <div class="expense-row">
        <span>${escapeHTML(labels[key] || key)}</span>
        <strong>${escapeHTML(INR.format(value))}</strong>
        <small>${escapeHTML(formatPercent(percent))}</small>
      </div>
    `;
  }).join("");
}

async function loadSalaryFundSuggestions(input, plan) {
  const box = document.getElementById("salaryFundSuggestions");
  if (!box) return;
  setStatus(els.salaryStatus, true);
  try {
    const profile = salaryPlannerProfile(input);
    const funds = await recommendFundsForProfile(profile, plan.investable);
    box.innerHTML = renderSalaryFundSuggestions(funds, profile, plan);
  } catch (error) {
    box.innerHTML = `
      <h3 class="mix-title">Funds to study from surplus</h3>
      <div class="error">${escapeHTML(error.message || "Could not load fund suggestions right now.")}</div>
    `;
  }
}

function salaryPlannerProfile(input) {
  return {
    goal: input.duration.id === "10+" ? "retirement" : "wealth",
    duration: input.duration,
    risk: input.risk,
    returnPref: input.returnPref
  };
}

function renderSalaryFundSuggestions(funds, profile, plan) {
  return `
    <h3 class="mix-title">Funds to study from surplus</h3>
    <div class="meta-line">Based on ${escapeHTML(INR.format(plan.investable))}/month surplus, ${escapeHTML(profile.duration.label)}, ${escapeHTML(profile.risk)} risk, and ${escapeHTML(returnPreferenceLabel(profile.returnPref))}. This is educational analysis, not investment advice.</div>
    <div class="results-grid" style="margin-top:14px">
      ${funds.map((fund, index) => `
        <article class="fund-card ${index === 0 ? "best" : ""}">
          <div class="fund-top">
            <div>
              <h3 class="fund-name">${escapeHTML(cleanName(fund.name))}</h3>
              <div class="meta-line">${escapeHTML(metaLabel(fund))}</div>
            </div>
            <div class="score-ring" style="--p:${fund.score}"><span>${fund.score}</span></div>
          </div>
          <div class="metrics primary">
            <div class="metric"><small>1Y</small><strong>${escapeHTML(formatPercent(fund.periodReturns?.y1))}</strong></div>
            <div class="metric"><small>3Y CAGR</small><strong>${escapeHTML(formatPercent(fund.periodReturns?.y3))}</strong></div>
            <div class="metric"><small>5Y CAGR</small><strong>${escapeHTML(formatPercent(fund.periodReturns?.y5))}</strong></div>
          </div>
          <div class="why">${escapeHTML(whyMatches(fund, profile))}</div>
        </article>
      `).join("")}
    </div>
    <div class="notice">Salary surplus is not a recommendation to invest the full amount. Keep emergency money and near-term needs separate before starting any SIP.</div>
  `;
}

/* ---------- Overall corpus calculator ---------- */
function runCorpusCalculator() {
  showError(els.corpusError, "");
  try {
    const input = {
      current: readMoney(els.corpusCurrent.value),
      sip: readMoney(els.corpusSip.value),
      lumpsum: readMoney(els.corpusLumpsum.value) || 0,
      years: Number(String(els.corpusYears.value).replace(/[^\d.]/g, "")),
      rate: Number(els.corpusReturn.value),
      stepUp: Number(els.corpusStepUp.value)
    };
    validateCorpusInput(input);
    renderCorpusResults(input, calculateCorpus(input));
  } catch (error) {
    showError(els.corpusError, error.message || "Could not calculate corpus.");
  }
}

function validateCorpusInput(input) {
  if (input.current < 0 || Number.isNaN(input.current)) throw new Error("Enter valid current investments.");
  if (input.sip < 0 || Number.isNaN(input.sip)) throw new Error("Enter a valid monthly SIP.");
  if (input.lumpsum < 0 || Number.isNaN(input.lumpsum)) throw new Error("Enter a valid one-time addition.");
  if (!input.years || input.years <= 0) throw new Error("Enter valid years.");
  if (!input.rate || input.rate <= 0) throw new Error("Choose a valid assumed return.");
  if (input.current + input.sip + input.lumpsum <= 0) throw new Error("Add current investments, SIP, or one-time amount.");
}

function calculateCorpus(input) {
  const months = Math.round(input.years * 12);
  const monthlyRate = input.rate / 100 / 12;
  let corpus = input.current + input.lumpsum;
  let sip = input.sip;
  let invested = input.current + input.lumpsum;
  const yearly = [];
  for (let month = 1; month <= months; month++) {
    corpus *= 1 + monthlyRate;
    corpus += sip;
    invested += sip;
    if (month % 12 === 0 && month < months) sip *= 1 + input.stepUp / 100;
    if (month % 12 === 0 || month === months) {
      yearly.push({ name: `Year ${Math.ceil(month / 12)}`, value: corpus, invested });
    }
  }
  return { months, corpus, invested, gain: corpus - invested, yearly };
}

function renderCorpusResults(input, result) {
  const gainPercent = result.invested ? Math.round(clamp(result.gain / result.invested * 100, 0, 999)) : 0;
  els.corpusResults.innerHTML = `
    <div class="goal-result">
      <div class="goal-hero">
        <small>Estimated future corpus</small>
        <strong>${escapeHTML(INR.format(result.corpus))}</strong>
        <span>At an assumed ${escapeHTML(input.rate)}% annual return over ${escapeHTML(monthsLabel(result.months))}${input.stepUp ? ` with ${escapeHTML(input.stepUp)}% yearly SIP step-up` : ""}.</span>
      </div>
      <div class="savings-circle-wrap">
        <div class="goal-circle" style="--goal:${clamp(gainPercent, 0, 100)}"><span>${gainPercent}%<br>gain</span></div>
        <div class="savings-copy">
          <strong>${escapeHTML(INR.format(result.gain))} estimated growth</strong>
          <p>Total invested is compared with projected corpus. Actual market returns can be very different.</p>
        </div>
      </div>
      <div class="insight-grid">
        <div class="insight"><small>Total invested</small><strong>${escapeHTML(INR.format(result.invested))}</strong></div>
        <div class="insight"><small>Estimated corpus</small><strong>${escapeHTML(INR.format(result.corpus))}</strong></div>
        <div class="insight"><small>Estimated gain</small><strong>${escapeHTML(INR.format(result.gain))}</strong></div>
        <div class="insight"><small>Monthly SIP start</small><strong>${escapeHTML(INR.format(input.sip))}</strong></div>
      </div>
      <div class="chart-wrap">${renderValueChart(result.yearly.slice(-10), "Corpus path")}</div>
      <div class="notice">This is only a planning model using assumed returns. It is not investment advice.</div>
    </div>
  `;
}

/* ---------- Gold and silver fund tracker ---------- */
async function runMetalTracker() {
  showError(els.metalError, "");
  setStatus(els.metalStatus, true);
  try {
    const candidates = await getMetalCandidates(els.metalType.value, els.metalView.value);
    if (!candidates.length) throw new Error("MFapi did not return metal fund search results.");
    const analysed = (await Promise.all(candidates.slice(0, 12).map(async candidate => {
      try {
        const analysis = await getAnalysedFund(candidate);
        if (!analysis || !analysis.latest || !isRecentNav(analysis.latest.date)) return null;
        analysis.metalRank = analysis.score + (/direct/i.test(analysis.name) ? 8 : 0) + (/growth/i.test(analysis.name) ? 5 : 0);
        return analysis;
      } catch (_) {
        return null;
      }
    }))).filter(Boolean)
      .sort((a, b) => b.metalRank - a.metalRank)
      .slice(0, 6);
    if (!analysed.length) throw new Error("MFapi returned insufficient recent NAV history for metal funds.");
    renderMetalResults(analysed);
  } catch (error) {
    showError(els.metalError, error.message || "Could not load metal funds.");
  } finally {
    setStatus(els.metalStatus, false);
  }
}

async function getMetalCandidates(type, view) {
  const gold = ["gold fund growth", "gold etf fund of fund growth", "gold savings fund growth"];
  const silver = ["silver etf fund of fund growth", "silver fund growth", "silver etf growth"];
  const queries = type === "gold" ? gold : type === "silver" ? silver : gold.concat(silver);
  const items = (await Promise.all(queries.map(query => searchFunds(query).catch(() => [])))).flat();
  const map = new Map();
  items.forEach(item => {
    if (!item || !item.schemeName) return;
    const name = item.schemeName;
    if (/idcw|dividend|bonus/i.test(name)) return;
    if (view === "direct" && !/direct/i.test(name)) return;
    const family = name.toLowerCase()
      .replace(/\b(direct|regular|growth|plan|option|fund of fund|fof)\b/g, "")
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
    if (!map.has(family) || /direct/i.test(name)) map.set(family, item);
  });
  return Array.from(map.values());
}

function renderMetalResults(funds) {
  const best = funds[0];
  els.metalResults.innerHTML = `
    <h3 class="step-title">Metal fund history</h3>
    <div class="insight" style="margin-bottom:14px">
      <small>Highest historical score</small>
      <strong>${escapeHTML(cleanName(best.name))}</strong>
    </div>
    <div class="results-grid" style="grid-template-columns:1fr; margin-top:0">
      ${funds.slice(0, 3).map((fund, index) => `
        <article class="fund-card ${index === 0 ? "best" : ""}">
          <div class="fund-top">
            <div>
              <h3 class="fund-name">${escapeHTML(cleanName(fund.name))}</h3>
              <div class="meta-line">${escapeHTML(metaLabel(fund))}</div>
            </div>
            <div class="score-ring" style="--p:${fund.score}"><span>${fund.score}</span></div>
          </div>
          <div class="metrics primary">
            <div class="metric"><small>1M</small><strong>${escapeHTML(formatPercent(fund.periodReturns?.m1))}</strong></div>
            <div class="metric"><small>1Y</small><strong>${escapeHTML(formatPercent(fund.periodReturns?.y1))}</strong></div>
            <div class="metric"><small>3Y</small><strong>${escapeHTML(formatPercent(fund.periodReturns?.y3))}</strong></div>
          </div>
        </article>
      `).join("")}
    </div>
    <div class="mobile-fund-list" style="margin-top:14px">
      ${funds.map((fund, index) => `
        <article class="mobile-fund-row ${index === 0 ? "best" : ""}">
          <strong>${escapeHTML(cleanName(fund.name))}</strong>
          <div class="meta-line">${escapeHTML(metaLabel(fund))}</div>
          <div class="mobile-metrics">
            <div class="metric"><small>1M</small><strong>${escapeHTML(formatPercent(fund.periodReturns?.m1))}</strong></div>
            <div class="metric"><small>6M</small><strong>${escapeHTML(formatPercent(fund.periodReturns?.m6))}</strong></div>
            <div class="metric"><small>1Y</small><strong>${escapeHTML(formatPercent(fund.periodReturns?.y1))}</strong></div>
            <div class="metric"><small>3Y</small><strong>${escapeHTML(formatPercent(fund.periodReturns?.y3))}</strong></div>
            <div class="metric"><small>Score</small><strong>${fund.score}/100</strong></div>
            <div class="metric"><small>NAV</small><strong>${escapeHTML(formatNav(fund.latest?.nav))}</strong></div>
          </div>
        </article>
      `).join("")}
    </div>
    <div class="table-wrap metal-table" style="margin-top:14px">
      <table>
        <thead><tr><th>Fund</th><th>1M</th><th>6M</th><th>1Y</th><th>3Y CAGR</th><th>Score</th></tr></thead>
        <tbody>
          ${funds.map(fund => `
            <tr>
              <td><strong>${escapeHTML(cleanName(fund.name))}</strong><div class="meta-line">${escapeHTML(metaLabel(fund))}</div></td>
              <td>${escapeHTML(formatPercent(fund.periodReturns?.m1))}</td>
              <td>${escapeHTML(formatPercent(fund.periodReturns?.m6))}</td>
              <td>${escapeHTML(formatPercent(fund.periodReturns?.y1))}</td>
              <td>${escapeHTML(formatPercent(fund.periodReturns?.y3))}</td>
              <td>${fund.score}/100</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
    <div class="notice">Metal funds can be volatile. Returns are calculated from NAV history and do not predict gold or silver prices.</div>
  `;
}

/* ---------- Charts and utilities ---------- */
function renderBarChart(results, valueFn, label) {
  const max = Math.max(...results.map(valueFn), 1);
  return `
    <div class="bar-chart" aria-label="${escapeAttr(label)} chart">
      ${results.map(item => {
        const value = valueFn(item);
        const width = Math.max(4, Math.round(value / max * 100));
        return `
          <div class="bar-row">
            <strong title="${escapeAttr(item.name)}">${escapeHTML(shortName(item.name))}</strong>
            <div class="bar-track"><div class="bar-fill" style="width:${width}%"></div></div>
            <span>${escapeHTML(INR.format(value))}</span>
          </div>
        `;
      }).join("")}
    </div>
  `;
}

function renderValueChart(points, label) {
  const max = Math.max(...points.map(point => point.value), 1);
  return `
    <div class="bar-chart" aria-label="${escapeAttr(label)} chart">
      ${points.map(point => {
        const width = Math.max(4, Math.round(point.value / max * 100));
        return `
          <div class="bar-row">
            <strong>${escapeHTML(point.name)}</strong>
            <div class="bar-track"><div class="bar-fill" style="width:${width}%"></div></div>
            <span>${escapeHTML(INR.format(point.value))}</span>
          </div>
        `;
      }).join("")}
    </div>
  `;
}

function xirr(cashflows) {
  if (cashflows.length < 2) return null;
  const first = cashflows[0].date;
  const npv = rate => cashflows.reduce((sum, flow) => {
    const years = (flow.date - first) / (365.25 * 24 * 60 * 60 * 1000);
    return sum + flow.amount / Math.pow(1 + rate, years);
  }, 0);
  let low = -0.95;
  let high = 3;
  let lowVal = npv(low);
  let highVal = npv(high);
  if (Math.sign(lowVal) === Math.sign(highVal)) return null;
  for (let i = 0; i < 80; i++) {
    const mid = (low + high) / 2;
    const midVal = npv(mid);
    if (Math.abs(midVal) < .01) return mid;
    if (Math.sign(midVal) === Math.sign(lowVal)) {
      low = mid;
      lowVal = midVal;
    } else {
      high = mid;
      highVal = midVal;
    }
  }
  return (low + high) / 2;
}

function closestNav(history, targetDate) {
  if (!history.length) return null;
  let low = 0;
  let high = history.length - 1;
  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    if (history[mid].date < targetDate) low = mid + 1;
    else high = mid - 1;
  }
  const before = history[Math.max(0, high)];
  const after = history[Math.min(history.length - 1, low)];
  if (!before) return after;
  if (!after) return before;
  return Math.abs(before.date - targetDate) <= Math.abs(after.date - targetDate) ? before : after;
}

function parseMFDate(value) {
  if (!value) return null;
  const parts = String(value).split("-");
  if (parts.length !== 3) return null;
  const [day, month, year] = parts.map(Number);
  return new Date(year, month - 1, day);
}

function addYears(date, years) {
  const copy = new Date(date);
  copy.setFullYear(copy.getFullYear() + years);
  return copy;
}

function maxCode(items, valueFn) {
  return items.reduce((best, item) => {
    const value = valueFn(item);
    if (value == null || Number.isNaN(value)) return best;
    if (!best || value > best.value) return { code: item.code, value };
    return best;
  }, null)?.code;
}

function minCode(items, valueFn) {
  return items.reduce((best, item) => {
    const value = valueFn(item);
    if (value == null || Number.isNaN(value)) return best;
    if (!best || value < best.value) return { code: item.code, value };
    return best;
  }, null)?.code;
}

function scale(value, min, max) {
  if (value == null || Number.isNaN(value)) return .35;
  return clamp((value - min) / (max - min), 0, 1);
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function firstNumber(...values) {
  return values.find(value => value != null && !Number.isNaN(value)) ?? null;
}

function readMoney(value) {
  return Number(String(value).replace(/[^\d.]/g, ""));
}

function debounce(fn, wait) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), wait);
  };
}

function cleanName(name) {
  return String(name || "Unnamed fund").replace(/\s+/g, " ").trim();
}

function metaLabel(fund) {
  const parts = [fund.category, fund.type].filter(Boolean);
  return parts.length ? parts.join(" • ") : "Category/type unavailable";
}

function shortName(name) {
  const clean = cleanName(name)
    .replace(/\b(Direct|Growth|Plan|Option|Mutual Fund|Fund)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
  return clean.length > 32 ? clean.slice(0, 29) + "..." : clean;
}

function formatDate(date) {
  if (!(date instanceof Date)) return "Unavailable";
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function formatNav(nav) {
  if (nav == null || Number.isNaN(nav)) return "Unavailable";
  return "₹" + Number(nav).toFixed(4);
}

function formatPercent(value) {
  if (value == null || Number.isNaN(value)) return "Insufficient data";
  return PCT.format(value);
}

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

function escapeAttr(value) {
  return escapeHTML(value).replace(/`/g, "&#96;");
}