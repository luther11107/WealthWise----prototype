// Navigation
function showSection(id) {
  let pages = document.querySelectorAll('.page');
  pages.forEach(p => p.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}
showSection('planner');

// Salary Chart
let chart;

function calculatePlan() {
  let salary = document.getElementById("salary").value;

  let needs = salary * 0.5;
  let wants = salary * 0.3;
  let savings = salary * 0.2;

  document.getElementById("result").innerHTML =
    `Needs: ₹${needs} <br> Wants: ₹${wants} <br> Savings: ₹${savings}`;

  // SAVE DATA
  let user = localStorage.getItem("user");
  let data = {
    salary,
    needs,
    wants,
    savings
  };

  localStorage.setItem(user + "_finance", JSON.stringify(data));

  // Chart
  let ctx = document.getElementById('chart').getContext('2d');
  if (chart) chart.destroy();

  chart = new Chart(ctx, {
    type: 'pie',
    data: {
      labels: ['Needs', 'Wants', 'Savings'],
      datasets: [{
        data: [needs, wants, savings],
        backgroundColor: ['#f87171', '#60a5fa', '#34d399']
      }]
    }
  });
}

// EMI
function calculateEMI() {
  let P = document.getElementById("loan").value;
  let R = document.getElementById("rate").value / 12 / 100;
  let N = document.getElementById("time").value;

  let EMI = (P * R * Math.pow(1 + R, N)) / (Math.pow(1 + R, N) - 1);

  document.getElementById("emiResult").innerHTML =
    `Monthly EMI: ₹${EMI.toFixed(2)}`;
}

// Currency (Live API)
async function convert() {
  let amount = document.getElementById("amount").value;

  let res = await fetch("https://api.exchangerate-api.com/v4/latest/INR");
  let data = await res.json();

  let usd = amount * data.rates.USD;

  document.getElementById("currencyResult").innerHTML =
    `USD: $${usd.toFixed(2)}`;
}

// Investment Suggestion
function suggest() {
  let risk = document.getElementById("risk").value;

  let result = "";

  if (risk === "low") {
    result = "FD, PPF, Savings Account";
  } else if (risk === "medium") {
    result = "Mutual Funds, Index Funds";
  } else {
    result = "Stocks, Crypto";
  }

  document.getElementById("suggestion").innerHTML = result;
}

// Expense Tracker
let barChart, pieChart;

function track() {
  let income = document.getElementById("income").value;
  let expense = document.getElementById("expense").value;
  let savings = income - expense;

  document.getElementById("trackResult").innerHTML =
    `Savings: ₹${savings}`;

  // Bar Chart
  let ctx1 = document.getElementById("barChart").getContext('2d');
  if (barChart) barChart.destroy();

  barChart = new Chart(ctx1, {
    type: 'bar',
    data: {
      labels: ['Income', 'Expense', 'Savings'],
      datasets: [{
        data: [income, expense, savings]
      }]
    }
  });

  // Pie Chart
  let ctx2 = document.getElementById("pieChart").getContext('2d');
  if (pieChart) pieChart.destroy();

  pieChart = new Chart(ctx2, {
    type: 'pie',
    data: {
      labels: ['Expense', 'Savings'],
      datasets: [{
        data: [expense, savings]
      }]
    }
  });
}
// Register
function register() {
  let user = document.getElementById("username").value;
  let pass = document.getElementById("password").value;

  if (!user || !pass) {
    document.getElementById("authMsg").innerText = "Fill all fields!";
    return;
  }

  localStorage.setItem("user", user);
  localStorage.setItem("pass", pass);

  document.getElementById("authMsg").innerText = "Registered!";
}

// Login
function login() {
  let user = document.getElementById("username").value;
  let pass = document.getElementById("password").value;

  let storedUser = localStorage.getItem("user");
  let storedPass = localStorage.getItem("pass");

  if (user === storedUser && pass === storedPass) {
    document.getElementById("authBox").style.display = "none";
    localStorage.setItem("loggedIn", "true");
  } else {
    document.getElementById("authMsg").innerText = "Wrong credentials!";
  }
}

// Auto login
window.onload = function () {
  if (localStorage.getItem("loggedIn") === "true") {
    document.getElementById("authBox").style.display = "none";
  }
};

// Logout
function logout() {
  localStorage.removeItem("loggedIn");
  document.getElementById("authBox").style.display = "block";
}
function showUser() {
  let user = localStorage.getItem("user");
  if (user) {
    document.getElementById("welcomeUser").innerText = "👋 " + user;
  }
}

window.onload = function () {
  if (localStorage.getItem("loggedIn") === "true") {
    document.getElementById("authBox").style.display = "none";
  }
  showUser();
  loadUserData();
};
document.getElementById("profileIcon").onclick = function () {
  let menu = document.getElementById("profileMenu");

  if (menu.style.display === "block") {
    menu.style.display = "none";
  } else {
    menu.style.display = "block";
  }
};
function showUser() {
  let user = localStorage.getItem("user");
  if (user) {
    document.getElementById("userName").innerText = user;
  }
}

function loadUserData() {
  let user = localStorage.getItem("user");
  let saved = localStorage.getItem(user + "_finance");

  if (saved) {
    let data = JSON.parse(saved);

    document.getElementById("salary").value = data.salary;

    document.getElementById("result").innerHTML =
      `Needs: ₹${data.needs} <br> Wants: ₹${data.wants} <br> Savings: ₹${data.savings}`;
  }
}

function toggle(btn) {
  let card = btn.parentElement;
  let shortText = card.querySelector(".short");
  let fullText = card.querySelector(".full");

  if (fullText.style.display === "block") {
    fullText.style.display = "none";
    shortText.style.display = "block";
    btn.innerText = "Read More";
  } else {
    fullText.style.display = "block";
    shortText.style.display = "none";
    btn.innerText = "Show Less";
  }
}

function sendMessage() {
  let input = document.getElementById("userInput").value.toLowerCase();
  let chatBox = document.getElementById("chatBox");

  // Show user message
  chatBox.innerHTML += `<p><b>You:</b> ${input}</p>`;

  let response = "";

  // Simple AI logic
  if (input.includes("invest")) {
    response = "You can invest in stocks, mutual funds, or FD based on your risk level.";
  }
  else if (input.includes("save")) {
    response = "Follow 50-30-20 rule: 50% needs, 30% wants, 20% savings.";
  }
  else if (input.includes("low risk")) {
    response = "Go for Fixed Deposits, PPF, or savings accounts.";
  }
  else if (input.includes("high return")) {
    response = "Stocks and mutual funds give higher returns but have more risk.";
  }
  else if (input.includes("emi")) {
    response = "EMI depends on loan amount, interest rate, and time period.";
  }
  else {
    response = "I'm here to help with finance! Try asking about investing, saving, or loans.";
  }

  // Show bot response
  chatBox.innerHTML += `<p><b>AI:</b> ${response}</p>`;

  document.getElementById("userInput").value = "";
}

document.getElementById("userInput").addEventListener("keypress", function(e) {
  if (e.key === "Enter") {
    sendMessage();
  }
});