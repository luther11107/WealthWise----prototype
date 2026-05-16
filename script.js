/**
 * WealthWise — client-side finance dashboard
 * Auth is demo-only (localStorage + Base64). Not for production secrets.
 */
(function () {
  "use strict";

  const CONFIG = {
    usersKey: "wealthwise_users",
    loggedInKey: "loggedInUser",
    exchangeApi: "https://api.exchangerate-api.com/v4/latest/INR",
    budget: { needs: 0.5, wants: 0.3, savings: 0.2 },
    chartColors: {
      needs: "#f87171",
      wants: "#60a5fa",
      savings: "#34d399",
    },
  };

  const LEARN_TOPICS = [
    {
      icon: "💡",
      title: "Investing basics",
      short: "Investing helps grow your money over time.",
      full: "Investing means putting money into assets like stocks or funds to generate returns and beat inflation over the long term.",
    },
    {
      icon: "📈",
      title: "Stocks",
      short: "Ownership in a company.",
      full: "Stocks represent a share of a company. They can offer high returns but come with higher risk and volatility.",
    },
    {
      icon: "🏦",
      title: "Fixed deposits",
      short: "Safe and stable returns.",
      full: "Fixed deposits are low-risk bank products with guaranteed returns, suited to conservative investors.",
    },
  ];

  const RISK_SUGGESTIONS = {
    low: "FD, PPF, and high-yield savings accounts",
    medium: "Index funds and diversified mutual funds",
    high: "Equities and other growth assets (higher volatility)",
  };

  const CHAT_RESPONSES = [
    { keys: ["invest", "investment"], text: "You can invest in stocks, mutual funds, or FDs based on your risk level and time horizon." },
    { keys: ["save", "saving", "budget"], text: "Try the 50-30-20 rule: 50% needs, 30% wants, 20% savings." },
    { keys: ["low risk", "safe"], text: "Consider fixed deposits, PPF, or savings accounts for lower risk." },
    { keys: ["high return", "growth"], text: "Stocks and equity mutual funds may offer higher returns with more risk." },
    { keys: ["emi", "loan"], text: "EMI depends on principal, annual interest rate, and loan tenure in months." },
    { keys: ["currency", "usd", "convert"], text: "Use the Currency section to convert INR using live exchange rates." },
  ];

  const DEFAULT_CHAT = "Ask about investing, saving, EMI, or currency conversion.";

  const charts = {};

  const $ = (id) => document.getElementById(id);

  // ——— Formatting ———
  const formatINR = (n) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(n);

  // ——— DOM helpers ———
  function setPanel(id, content, isError = false) {
    const el = $(id);
    if (!el) return;
    el.textContent = "";
    el.classList.remove("result-panel--error");

    if (typeof content === "string") {
      el.textContent = content;
    } else if (content instanceof DocumentFragment) {
      el.replaceChildren(content);
    } else if (content instanceof Node) {
      el.replaceChildren(content);
    }

    if (isError) el.classList.add("result-panel--error");
  }

  function setAuthMessage(text, type = "") {
    const el = $("authMsg");
    el.textContent = text;
    el.className = "auth-box__message";
    if (type === "error") el.classList.add("auth-box__message--error");
    if (type === "success") el.classList.add("auth-box__message--success");
  }

  function parsePositive(value, label) {
    const n = Number(value);
    if (value === "" || Number.isNaN(n) || n <= 0) {
      return { ok: false, message: `Enter a valid ${label} greater than zero.` };
    }
    return { ok: true, value: n };
  }

  function buildStatPanel(rows) {
    const frag = document.createDocumentFragment();
    rows.forEach(([label, value]) => {
      const row = document.createElement("div");
      row.className = "stat-row";
      const span = document.createElement("span");
      span.textContent = label;
      const strong = document.createElement("strong");
      strong.textContent = value;
      row.append(span, strong);
      frag.appendChild(row);
    });
    return frag;
  }

  // ——— Storage / auth ———
  const Auth = {
    encodePass(pass) {
      return btoa(unescape(encodeURIComponent(pass)));
    },

    getUsers() {
      try {
        return JSON.parse(localStorage.getItem(CONFIG.usersKey) || "{}");
      } catch {
        return {};
      }
    },

    setUsers(users) {
      localStorage.setItem(CONFIG.usersKey, JSON.stringify(users));
    },

    getUser() {
      return localStorage.getItem(CONFIG.loggedInKey);
    },

    setUser(username) {
      if (username) {
        localStorage.setItem(CONFIG.loggedInKey, username);
        localStorage.setItem("loggedIn", "true");
      } else {
        localStorage.removeItem(CONFIG.loggedInKey);
        localStorage.removeItem("loggedIn");
      }
    },

    migrateLegacy() {
      const legacyUser = localStorage.getItem("user");
      const legacyPass = localStorage.getItem("pass");
      if (!legacyUser || !legacyPass) return;

      const users = this.getUsers();
      if (!users[legacyUser]) {
        users[legacyUser] = this.encodePass(legacyPass);
        this.setUsers(users);
      }
      if (localStorage.getItem("loggedIn") === "true" && !localStorage.getItem(CONFIG.loggedInKey)) {
        localStorage.setItem(CONFIG.loggedInKey, legacyUser);
      }
      localStorage.removeItem("pass");
    },

    register(username, password) {
      const users = this.getUsers();
      if (users[username]) return { ok: false, message: "Username already exists." };
      users[username] = this.encodePass(password);
      this.setUsers(users);
      this.setUser(username);
      return { ok: true };
    },

    login(username, password) {
      const users = this.getUsers();
      if (users[username] && users[username] === this.encodePass(password)) {
        this.setUser(username);
        return { ok: true };
      }
      return { ok: false, message: "Invalid username or password." };
    },

    logout() {
      this.setUser(null);
    },

    storageKey(suffix) {
      const user = this.getUser();
      return user ? `${user}_${suffix}` : null;
    },

    save(key, data) {
      const storageKey = this.storageKey(key);
      if (storageKey) localStorage.setItem(storageKey, JSON.stringify(data));
    },

    load(key) {
      const storageKey = this.storageKey(key);
      if (!storageKey) return null;
      try {
        return JSON.parse(localStorage.getItem(storageKey));
      } catch {
        return null;
      }
    },
  };

  // ——— UI sync ———
  function syncAuthUI() {
    const loggedIn = !!Auth.getUser();
    $("authBox").hidden = loggedIn;
    $("profile").hidden = !loggedIn;
    $("appContainer").hidden = !loggedIn;
    if (!loggedIn) {
      $("profileMenu").hidden = true;
      $("profileIcon").setAttribute("aria-expanded", "false");
    }

    const user = Auth.getUser();
    const welcome = $("welcomeUser");
    if (user) {
      welcome.textContent = `Welcome, ${user}`;
      welcome.hidden = false;
      $("userName").textContent = user;
    } else {
      welcome.textContent = "";
      welcome.hidden = true;
      $("userName").textContent = "";
    }
  }

  function clearPassword() {
    $("password").value = "";
  }

  // ——— Navigation ———
  function showSection(sectionId) {
    document.querySelectorAll(".page").forEach((page) => {
      page.classList.toggle("page--active", page.id === sectionId);
    });
    document.querySelectorAll(".nav-link").forEach((link) => {
      link.classList.toggle("nav-link--active", link.dataset.section === sectionId);
    });

    if (sectionId === "advisor" && $("chatBox") && !$("chatBox").hasChildNodes()) {
      appendChatMessage("Advisor", DEFAULT_CHAT);
    }
  }

  // ——— Charts ———
  function destroyChart(id) {
    if (charts[id]) {
      charts[id].destroy();
      delete charts[id];
    }
  }

  function renderChart(canvasId, config) {
    destroyChart(canvasId);
    const canvas = $(canvasId);
    if (!canvas || typeof Chart === "undefined") return;
    charts[canvasId] = new Chart(canvas.getContext("2d"), config);
  }

  const Charts = {
    salary(needs, wants, savings) {
      renderChart("chart", {
        type: "pie",
        options: { plugins: { legend: { position: "bottom" } } },
        data: {
          labels: ["Needs (50%)", "Wants (30%)", "Savings (20%)"],
          datasets: [{
            data: [needs, wants, savings],
            backgroundColor: [CONFIG.chartColors.needs, CONFIG.chartColors.wants, CONFIG.chartColors.savings],
          }],
        },
      });
    },

    expenses(income, expense, savings) {
      renderChart("barChart", {
        type: "bar",
        options: {
          plugins: { legend: { display: false } },
          scales: { y: { beginAtZero: true } },
        },
        data: {
          labels: ["Income", "Expense", "Savings"],
          datasets: [{
            data: [income, expense, savings],
            backgroundColor: [CONFIG.chartColors.savings, CONFIG.chartColors.needs, CONFIG.chartColors.wants],
          }],
        },
      });

      renderChart("pieChart", {
        type: "pie",
        options: { plugins: { legend: { position: "bottom" } } },
        data: {
          labels: ["Expense", "Savings"],
          datasets: [{
            data: [expense, savings],
            backgroundColor: [CONFIG.chartColors.needs, CONFIG.chartColors.savings],
          }],
        },
      });
    },
  };

  // ——— Calculators ———
  function calculatePlan(event) {
    event.preventDefault();
    const parsed = parsePositive($("salary").value, "salary");
    if (!parsed.ok) return setPanel("result", parsed.message, true);

    const salary = parsed.value;
    const needs = salary * CONFIG.budget.needs;
    const wants = salary * CONFIG.budget.wants;
    const savings = salary * CONFIG.budget.savings;

    setPanel(
      "result",
      buildStatPanel([
        ["Needs (50%)", formatINR(needs)],
        ["Wants (30%)", formatINR(wants)],
        ["Savings (20%)", formatINR(savings)],
      ])
    );
    Charts.salary(needs, wants, savings);
    Auth.save("finance", { salary, needs, wants, savings });
  }

  function trackExpenses(event) {
    event.preventDefault();
    const incomeParsed = parsePositive($("income").value, "income");
    if (!incomeParsed.ok) return setPanel("trackResult", incomeParsed.message, true);

    const expenseParsed = parsePositive($("expense").value, "expense");
    if (!expenseParsed.ok) return setPanel("trackResult", expenseParsed.message, true);

    const income = incomeParsed.value;
    const expense = expenseParsed.value;
    if (expense > income) return setPanel("trackResult", "Expenses cannot exceed income.", true);

    const savings = income - expense;
    setPanel("trackResult", `Monthly savings: ${formatINR(savings)}`);
    Charts.expenses(income, expense, savings);
    Auth.save("expense", { income, expense, savings });
  }

  function suggestInvestment(event) {
    event.preventDefault();
    const risk = $("risk").value;
    setPanel("suggestion", RISK_SUGGESTIONS[risk] || RISK_SUGGESTIONS.medium);
  }

  function calculateEMI(event) {
    event.preventDefault();
    const loanParsed = parsePositive($("loan").value, "loan amount");
    if (!loanParsed.ok) return setPanel("emiResult", loanParsed.message, true);

    const rateRaw = $("rate").value;
    const rateVal = Number(rateRaw);
    if (rateRaw === "" || Number.isNaN(rateVal) || rateVal < 0) {
      return setPanel("emiResult", "Enter a valid annual interest rate (0% or higher).", true);
    }

    const timeParsed = parsePositive($("time").value, "tenure in months");
    if (!timeParsed.ok) return setPanel("emiResult", timeParsed.message, true);

    const principal = loanParsed.value;
    const monthlyRate = rateVal / 12 / 100;
    const months = timeParsed.value;

    const emi =
      monthlyRate === 0
        ? principal / months
        : (principal * monthlyRate * Math.pow(1 + monthlyRate, months)) /
          (Math.pow(1 + monthlyRate, months) - 1);

    const totalPayable = emi * months;
    const totalInterest = totalPayable - principal;

    setPanel(
      "emiResult",
      buildStatPanel([
        ["Monthly EMI", formatINR(emi)],
        ["Total payable", formatINR(totalPayable)],
        ["Total interest", formatINR(totalInterest)],
      ])
    );
  }

  async function convertCurrency(event) {
    event.preventDefault();
    const amountParsed = parsePositive($("amount").value, "amount");
    if (!amountParsed.ok) return setPanel("currencyResult", amountParsed.message, true);

    const target = $("targetCurrency").value;
    setPanel("currencyResult", "Fetching live rates…");

    try {
      const res = await fetch(CONFIG.exchangeApi);
      if (!res.ok) throw new Error("Network error");
      const data = await res.json();
      const rate = data.rates?.[target];
      if (rate == null) throw new Error("Currency unavailable");

      const converted = amountParsed.value * rate;
      setPanel(
        "currencyResult",
        `${formatINR(amountParsed.value)} ≈ ${converted.toFixed(2)} ${target}`
      );
    } catch {
      setPanel("currencyResult", "Could not fetch exchange rates. Check your connection.", true);
    }
  }

  // ——— Learn ———
  function renderLearnCards() {
    const grid = $("learnGrid");
    if (!grid) return;
    grid.replaceChildren();

    LEARN_TOPICS.forEach((topic) => {
      const card = document.createElement("article");
      card.className = "learn-card";

      const icon = document.createElement("div");
      icon.className = "learn-card__icon";
      icon.setAttribute("aria-hidden", "true");
      icon.textContent = topic.icon;

      const title = document.createElement("h3");
      title.textContent = topic.title;

      const short = document.createElement("p");
      short.className = "learn-card__short";
      short.textContent = topic.short;

      const full = document.createElement("p");
      full.className = "learn-card__full";
      full.textContent = topic.full;

      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "btn btn--secondary learn-card__toggle";
      btn.textContent = "Read more";
      btn.addEventListener("click", () => {
        const expanded = card.classList.toggle("learn-card--expanded");
        btn.textContent = expanded ? "Show less" : "Read more";
      });

      card.append(icon, title, short, full, btn);
      grid.appendChild(card);
    });
  }

  // ——— Chat ———
  function appendChatMessage(role, text) {
    const box = $("chatBox");
    const p = document.createElement("p");
    const label = document.createElement("strong");
    label.textContent = `${role}: `;
    p.append(label, document.createTextNode(text));
    box.appendChild(p);
    box.scrollTop = box.scrollHeight;
  }

  function getChatReply(input) {
    const normalized = input.toLowerCase();
    for (const entry of CHAT_RESPONSES) {
      if (entry.keys.some((k) => normalized.includes(k))) return entry.text;
    }
    return DEFAULT_CHAT;
  }

  function sendChatMessage(event) {
    event.preventDefault();
    const input = $("userInput");
    const text = input.value.trim();
    if (!text) return;

    appendChatMessage("You", text);
    appendChatMessage("Advisor", getChatReply(text));
    input.value = "";
    updateSendButton();
  }

  function updateSendButton() {
    $("sendBtn").disabled = !$("userInput").value.trim();
  }

  // ——— Persisted data ———
  function loadUserData() {
    const finance = Auth.load("finance");
    if (finance) {
      $("salary").value = finance.salary;
      setPanel(
        "result",
        buildStatPanel([
          ["Needs (50%)", formatINR(finance.needs)],
          ["Wants (30%)", formatINR(finance.wants)],
          ["Savings (20%)", formatINR(finance.savings)],
        ])
      );
      Charts.salary(finance.needs, finance.wants, finance.savings);
    }

    const expense = Auth.load("expense");
    if (expense) {
      $("income").value = expense.income;
      $("expense").value = expense.expense;
      setPanel("trackResult", `Monthly savings: ${formatINR(expense.savings)}`);
      Charts.expenses(expense.income, expense.expense, expense.savings);
    }
  }

  // ——— Auth handlers ———
  function handleRegister() {
    const username = $("username").value.trim();
    const password = $("password").value;
    if (!username || !password) {
      setAuthMessage("Please fill in all fields.", "error");
      return;
    }
    const result = Auth.register(username, password);
    if (!result.ok) {
      setAuthMessage(result.message, "error");
      return;
    }
    setAuthMessage("Account created. You are now signed in.", "success");
    clearPassword();
    syncAuthUI();
    loadUserData();
  }

  function handleLogin(event) {
    event.preventDefault();
    const username = $("username").value.trim();
    const password = $("password").value;
    if (!username || !password) {
      setAuthMessage("Please fill in all fields.", "error");
      return;
    }
    const result = Auth.login(username, password);
    if (!result.ok) {
      setAuthMessage(result.message, "error");
      return;
    }
    setAuthMessage("", "");
    clearPassword();
    syncAuthUI();
    loadUserData();
  }

  function handleLogout() {
    Auth.logout();
    $("username").value = "";
    clearPassword();
    setAuthMessage("", "");
    syncAuthUI();
    Object.keys(charts).forEach(destroyChart);
  }

  function toggleProfileMenu() {
    const menu = $("profileMenu");
    const icon = $("profileIcon");
    const open = menu.hidden;
    menu.hidden = !open;
    icon.setAttribute("aria-expanded", String(open));
  }

  // ——— Init ———
  function bindEvents() {
    $("authForm").addEventListener("submit", handleLogin);
    document.querySelector('[data-action="register"]').addEventListener("click", handleRegister);
    document.querySelector('[data-action="logout"]').addEventListener("click", handleLogout);

    document.querySelectorAll(".nav-link").forEach((link) => {
      link.addEventListener("click", () => showSection(link.dataset.section));
    });

    $("plannerForm").addEventListener("submit", calculatePlan);
    $("expenseForm").addEventListener("submit", trackExpenses);
    $("suggestForm").addEventListener("submit", suggestInvestment);
    $("emiForm").addEventListener("submit", calculateEMI);
    $("currencyForm").addEventListener("submit", convertCurrency);
    $("chatForm").addEventListener("submit", sendChatMessage);

    $("profileIcon").addEventListener("click", toggleProfileMenu);
    $("userInput").addEventListener("input", updateSendButton);

    document.addEventListener("click", (e) => {
      if (!$("profile").contains(e.target)) {
        $("profileMenu").hidden = true;
        $("profileIcon").setAttribute("aria-expanded", "false");
      }
    });
  }

  function init() {
    Auth.migrateLegacy();
    renderLearnCards();
    bindEvents();
    showSection("planner");
    syncAuthUI();
    loadUserData();
    updateSendButton();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
