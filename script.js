const display = document.getElementById("display");
const expressionLabel = document.getElementById("expression");
const message = document.getElementById("message");
const historyList = document.getElementById("historyList");
const historyCount = document.getElementById("historyCount");
const toast = document.getElementById("toast");

let current = "0";
let expression = "";
let justEvaluated = false;
let history = loadHistory();
let toastTimer;

function loadHistory() {
  try {
    const parsed = JSON.parse(localStorage.getItem("calcspace-history") || "[]");
    return Array.isArray(parsed) ? parsed.slice(0, 30) : [];
  } catch {
    return [];
  }
}
function saveHistory() {
  try { localStorage.setItem("calcspace-history", JSON.stringify(history.slice(0, 30))); }
  catch { showToast("History storage is unavailable in this browser."); }
}
function showToast(text) {
  toast.textContent = text;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2000);
}
function prettyNumber(value) {
  if (!Number.isFinite(value)) throw new Error("Result is outside the supported range.");
  if (Object.is(value, -0)) value = 0;
  const rounded = Number(value.toPrecision(12));
  return String(rounded);
}
function render() {
  display.textContent = current;
  expressionLabel.textContent = expression;
  historyCount.textContent = String(history.length);
}
function clearAll() {
  current = "0";
  expression = "";
  justEvaluated = false;
  message.textContent = "Use your keyboard or the buttons below.";
  render();
}
function lastNumberPart(text) {
  const parts = text.split(/[+\-×÷]/);
  return parts[parts.length - 1];
}
function append(value) {
  message.textContent = "Use your keyboard or the buttons below.";
  if (value === "%") {
    const n = Number(current);
    if (!Number.isFinite(n)) return;
    current = prettyNumber(n / 100);
    expression = "";
    justEvaluated = true;
    render();
    return;
  }

  if (/^\d$/.test(value)) {
    if (justEvaluated) { current = value; expression = ""; justEvaluated = false; }
    else if (current === "0") current = value;
    else if (current === "-0") current = "-" + value;
    else current += value;
  } else if (value === ".") {
    if (justEvaluated) { current = "0."; expression = ""; justEvaluated = false; }
    else if (!lastNumberPart(current).includes(".")) current += ".";
  } else if (["+", "−", "×", "÷"].includes(value)) {
    if (justEvaluated) { expression = current; current += value; justEvaluated = false; }
    else if (["+", "−", "×", "÷"].includes(current.slice(-1))) current = current.slice(0, -1) + value;
    else current += value;
  }
  render();
}
function backspace() {
  if (justEvaluated) { clearAll(); return; }
  current = current.length > 1 ? current.slice(0, -1) : "0";
  if (current === "-" || current === "") current = "0";
  render();
}
function toggleSign() {
  if (justEvaluated) { current = String(-Number(current)); justEvaluated = false; render(); return; }
  const match = current.match(/(-?\d*\.?\d+)$/);
  if (!match) {
    if (current === "0") current = "-0";
    else if (["+", "−", "×", "÷"].includes(current.slice(-1))) current += "-";
    render(); return;
  }
  const start = match.index;
  const number = match[0];
  const flipped = number.startsWith("-") ? number.slice(1) : "-" + number;
  current = current.slice(0, start) + flipped;
  render();
}

// Recursive-descent parser: supports +, -, ×, ÷, unary signs and decimals without eval().
function calculateExpression(input) {
  const source = input.replace(/×/g, "*").replace(/÷/g, "/").replace(/−/g, "-").replace(/\s+/g, "");
  let i = 0;
  function parseExpression() {
    let value = parseTerm();
    while (source[i] === "+" || source[i] === "-") {
      const op = source[i++];
      const right = parseTerm();
      value = op === "+" ? value + right : value - right;
    }
    return value;
  }
  function parseTerm() {
    let value = parseUnary();
    while (source[i] === "*" || source[i] === "/") {
      const op = source[i++];
      const right = parseUnary();
      if (op === "/" && right === 0) throw new Error("Cannot divide by zero.");
      value = op === "*" ? value * right : value / right;
    }
    return value;
  }
  function parseUnary() {
    if (source[i] === "+") { i++; return parseUnary(); }
    if (source[i] === "-") { i++; return -parseUnary(); }
    return parseNumber();
  }
  function parseNumber() {
    const start = i;
    let dots = 0;
    while (i < source.length && /[\d.]/.test(source[i])) {
      if (source[i] === ".") dots++;
      if (dots > 1) throw new Error("Check your decimal points.");
      i++;
    }
    if (start === i || source.slice(start, i) === ".") throw new Error("Enter a valid calculation.");
    const n = Number(source.slice(start, i));
    if (!Number.isFinite(n)) throw new Error("Number is too large.");
    return n;
  }
  if (!source) throw new Error("Enter a calculation first.");
  const result = parseExpression();
  if (i !== source.length) throw new Error("Check the expression and try again.");
  if (!Number.isFinite(result)) throw new Error("Result is outside the supported range.");
  return result;
}
function calculate() {
  const raw = current;
  try {
    const result = calculateExpression(raw);
    const formatted = prettyNumber(result);
    if (/[+\-×÷]/.test(raw.slice(1))) {
      history.unshift({ expression: raw, result: formatted, time: Date.now() });
      history = history.slice(0, 30);
      saveHistory();
      renderHistory();
    }
    expression = raw + " =";
    current = formatted;
    justEvaluated = true;
    message.textContent = "Calculation complete.";
    render();
  } catch (error) {
    message.textContent = error.message || "Unable to calculate this expression.";
    showToast(message.textContent);
  }
}
function renderHistory() {
  historyCount.textContent = String(history.length);
  if (!history.length) {
    historyList.innerHTML = `<div class="empty-state"><span class="empty-icon">↗</span><strong>No calculations yet</strong><p>Your recent results will appear here.</p></div>`;
    return;
  }
  historyList.replaceChildren();
  history.forEach((item, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "history-item";
    button.setAttribute("aria-label", `Reuse result ${item.result} from ${item.expression}`);
    const left = document.createElement("span");
    const exp = document.createElement("span");
    exp.className = "history-expression";
    exp.textContent = item.expression + " =";
    const result = document.createElement("span");
    result.className = "history-result";
    result.textContent = item.result;
    left.append(exp, result);
    const time = document.createElement("span");
    time.className = "history-time";
    time.textContent = index === 0 ? "LATEST" : new Date(item.time).toLocaleTimeString([], {hour:"2-digit", minute:"2-digit"});
    button.append(left, time);
    button.addEventListener("click", () => {
      current = item.result;
      expression = item.expression + " =";
      justEvaluated = true;
      message.textContent = "Result restored from history.";
      render();
    });
    historyList.append(button);
  });
}
document.getElementById("keypad").addEventListener("click", event => {
  const button = event.target.closest("button");
  if (!button) return;
  if (button.dataset.value !== undefined) append(button.dataset.value);
  else if (button.dataset.action === "clear") clearAll();
  else if (button.dataset.action === "backspace") backspace();
  else if (button.dataset.action === "sign") toggleSign();
  else if (button.dataset.action === "equals") calculate();
});
document.getElementById("clearHistory").addEventListener("click", () => {
  if (!history.length) { showToast("History is already empty."); return; }
  history = [];
  saveHistory();
  renderHistory();
  showToast("Calculation history cleared.");
});
document.getElementById("themeToggle").addEventListener("click", () => {
  document.body.classList.toggle("light");
  const light = document.body.classList.contains("light");
  try { localStorage.setItem("calcspace-theme", light ? "light" : "dark"); } catch {}
  document.getElementById("themeToggle").textContent = light ? "☾" : "☼";
  document.getElementById("themeToggle").setAttribute("aria-label", light ? "Switch to dark theme" : "Switch to light theme");
});
document.getElementById("copyResult").addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(current);
    showToast("Result copied.");
  } catch {
    showToast("Clipboard access is unavailable. Select the result to copy it.");
  }
});
document.addEventListener("keydown", event => {
  if (event.ctrlKey || event.metaKey || event.altKey) return;
  if (/^\d$/.test(event.key)) append(event.key);
  else if (event.key === ".") append(".");
  else if (event.key === "+") append("+");
  else if (event.key === "-") append("−");
  else if (event.key === "*") append("×");
  else if (event.key === "/") { event.preventDefault(); append("÷"); }
  else if (event.key === "%") append("%");
  else if (event.key === "Enter" || event.key === "=") { event.preventDefault(); calculate(); }
  else if (event.key === "Backspace") backspace();
  else if (event.key === "Escape") clearAll();
});
try {
  if (localStorage.getItem("calcspace-theme") === "light") {
    document.body.classList.add("light");
    document.getElementById("themeToggle").textContent = "☾";
  }
} catch {}
render();
renderHistory();
