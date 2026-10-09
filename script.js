const display = document.getElementById("display");
const expressionView = document.getElementById("expression");
const statusView = document.getElementById("status");
const historyList = document.getElementById("historyList");
const historyCount = document.getElementById("historyCount");
const toast = document.getElementById("toast");

let expression = "";
let answer = 0;
let angleMode = "DEG";
let justCalculated = false;
let history = readHistory();
let toastTimer;

function readHistory() {
  try {
    const data = JSON.parse(localStorage.getItem("calcspace-scientific-history") || "[]");
    return Array.isArray(data) ? data.slice(0, 100) : [];
  } catch { return []; }
}
function persistHistory() {
  try { localStorage.setItem("calcspace-scientific-history", JSON.stringify(history.slice(0, 100))); }
  catch { showToast("Browser storage is unavailable."); }
}
function showToast(text) {
  toast.textContent = text;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2100);
}
function formatNumber(n) {
  if (!Number.isFinite(n)) throw new Error("Result is outside the supported range.");
  if (Object.is(n, -0)) n = 0;
  return String(Number(n.toPrecision(12)));
}
function render() {
  display.textContent = expression || "0";
  expressionView.textContent = "";
}
function insert(text) {
  if (justCalculated && /^(?:\d|\.|π|e|\()/.test(text)) expression = "";
  justCalculated = false;
  if (expression === "0" && /^\d$/.test(text)) expression = "";
  expression += text;
  statusView.textContent = "Use buttons or your keyboard.";
  render();
}
function clearCalc() {
  expression = "";
  justCalculated = false;
  statusView.textContent = "Use buttons or your keyboard.";
  render();
}
function backspace() {
  if (justCalculated) { clearCalc(); return; }
  expression = expression.slice(0, -1);
  render();
}
function toggleSign() {
  if (!expression) { expression = "-"; render(); return; }
  const m = expression.match(/(\d+(?:\.\d*)?|\.\d+)$/);
  if (m) {
    const start = m.index;
    const before = expression.slice(0, start);
    const value = m[0];
    expression = before.endsWith("-") && (before.length === 1 || /[+\-×÷(]$/.test(before.slice(0, -1)))
      ? before.slice(0, -1) + value : before + "-" + value;
  } else expression = "-" + expression;
  render();
}

function factorial(n) {
  if (!Number.isInteger(n) || n < 0 || n > 170) throw new Error("Factorial requires an integer from 0 to 170.");
  let result = 1;
  for (let i = 2; i <= n; i++) result *= i;
  return result;
}

// Safe tokenizer + recursive-descent parser; no eval().
function evaluate(source) {
  const s = source.replace(/×/g, "*").replace(/÷/g, "/").replace(/−/g, "-").replace(/π/g, "pi");
  const tokens = [];
  let i = 0;
  while (i < s.length) {
    if (/\s/.test(s[i])) { i++; continue; }
    const rest = s.slice(i);
    const number = rest.match(/^(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?/i);
    if (number) { tokens.push({type:"number", value:Number(number[0])}); i += number[0].length; continue; }
    const word = rest.match(/^[a-zA-Z]+/);
    if (word) { tokens.push({type:"word", value:word[0].toLowerCase()}); i += word[0].length; continue; }
    if ("+-*/^!()%".includes(s[i])) { tokens.push({type:s[i], value:s[i]}); i++; continue; }
    throw new Error("Unsupported character: " + s[i]);
  }
  let p = 0;
  const peek = () => tokens[p];
  const take = () => tokens[p++];
  const toRadians = x => angleMode === "DEG" ? x * Math.PI / 180 : x;
  const trigInput = x => angleMode === "DEG" ? x * Math.PI / 180 : x;

  function primary() {
    const t = take();
    if (!t) throw new Error("Complete the expression first.");
    let value;
    if (t.type === "number") value = t.value;
    else if (t.type === "(") {
      value = addSub();
      if (!peek() || take().type !== ")") throw new Error("Missing closing parenthesis.");
    } else if (t.type === "+" || t.type === "-") {
      value = primary();
      if (t.type === "-") value = -value;
    } else if (t.type === "word") {
      if (t.value === "pi") value = Math.PI;
      else if (t.value === "e") value = Math.E;
      else if (t.value === "ans") value = answer;
      else {
        if (!peek() || take().type !== "(") throw new Error(`${t.value} needs parentheses, e.g. ${t.value}(30).`);
        const arg = addSub();
        if (!peek() || take().type !== ")") throw new Error("Missing closing parenthesis.");
        switch (t.value) {
          case "sin": value = Math.sin(trigInput(arg)); break;
          case "cos": value = Math.cos(trigInput(arg)); break;
          case "tan":
            if (angleMode === "DEG" && Math.abs(Math.cos(trigInput(arg))) < 1e-12) throw new Error("tan is undefined at this angle.");
            value = Math.tan(trigInput(arg)); break;
          case "asin": value = angleMode === "DEG" ? Math.asin(arg) * 180 / Math.PI : Math.asin(arg); break;
          case "acos": value = angleMode === "DEG" ? Math.acos(arg) * 180 / Math.PI : Math.acos(arg); break;
          case "atan": value = angleMode === "DEG" ? Math.atan(arg) * 180 / Math.PI : Math.atan(arg); break;
          case "sqrt": if (arg < 0) throw new Error("Square root of a negative number is not real."); value = Math.sqrt(arg); break;
          case "log": if (arg <= 0) throw new Error("log requires a positive number."); value = Math.log10(arg); break;
          case "ln": if (arg <= 0) throw new Error("ln requires a positive number."); value = Math.log(arg); break;
          case "abs": value = Math.abs(arg); break;
          case "exp": value = Math.exp(arg); break;
          default: throw new Error("Unknown function: " + t.value);
        }
      }
    } else throw new Error("Expected a number or function.");
    if (!Number.isFinite(value)) throw new Error("Result is outside the supported range.");
    return postfix(value);
  }
  function postfix(value) {
    while (peek() && (peek().type === "!" || peek().type === "%")) {
      const op = take().type;
      value = op === "!" ? factorial(value) : value / 100;
    }
    return value;
  }
  function power() {
    let value = primary();
    if (peek() && peek().type === "^") { take(); value = Math.pow(value, unary()); }
    return value;
  }
  function unary() {
    if (peek() && (peek().type === "+" || peek().type === "-")) {
      const op = take().type;
      return op === "-" ? -unary() : unary();
    }
    return power();
  }
  function multiply() {
    let value = unary();
    while (peek() && (peek().type === "*" || peek().type === "/")) {
      const op = take().type, rhs = unary();
      if (op === "/" && rhs === 0) throw new Error("Cannot divide by zero.");
      value = op === "*" ? value * rhs : value / rhs;
    }
    return value;
  }
  function addSub() {
    let value = multiply();
    while (peek() && (peek().type === "+" || peek().type === "-")) {
      const op = take().type, rhs = multiply();
      value = op === "+" ? value + rhs : value - rhs;
    }
    return value;
  }
  if (!tokens.length) throw new Error("Enter a calculation first.");
  const result = addSub();
  if (p < tokens.length) {
    if (peek().type === "(") throw new Error("Use an operator between values, e.g. 2×(3+4).");
    throw new Error("Please check the expression.");
  }
  if (!Number.isFinite(result)) throw new Error("Result is outside the supported range.");
  return result;
}
function calculate() {
  try {
    const input = expression;
    const result = evaluate(input);
    const output = formatNumber(result);
    answer = result;
    expressionView.textContent = input + " =";
    expression = output;
    justCalculated = true;
    statusView.textContent = "Calculated successfully.";
    history.unshift({input, output, mode:angleMode, time:Date.now()});
    history = history.slice(0, 100);
    persistHistory();
    renderHistory();
    display.textContent = output;
  } catch (e) {
    statusView.textContent = e.message || "Unable to calculate.";
    showToast(statusView.textContent);
  }
}
function applyFunction(fn) {
  if (fn === "pow") { insert("^"); return; }
  const map = {sqrt:"sqrt(", sin:"sin(", cos:"cos(", tan:"tan(", log:"log(", ln:"ln(", reciprocal:"1/(", square:"("};
  if (fn === "factorial") { insert("!"); return; }
  if (fn === "square") { insert(")^2"); return; }
  if (fn === "reciprocal") { insert("1/("); return; }
  if (map[fn]) insert(map[fn]);
}
function renderHistory() {
  historyCount.textContent = history.length;
  historyList.replaceChildren();
  if (!history.length) {
    const empty = document.createElement("div");
    empty.className = "empty";
    empty.innerHTML = "<span>↗</span><strong>No calculations yet</strong><p>Your results will appear here.</p>";
    historyList.append(empty);
    return;
  }
  history.forEach(item => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "history-item";
    const left = document.createElement("span");
    const exp = document.createElement("span");
    exp.className = "history-expression";
    exp.textContent = item.input + " =";
    const res = document.createElement("span");
    res.className = "history-result";
    res.textContent = item.output;
    left.append(exp, res);
    const time = document.createElement("span");
    time.className = "history-time";
    time.textContent = item.mode + " · " + new Date(item.time).toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"});
    btn.append(left, time);
    btn.addEventListener("click", () => {
      answer = Number(item.output);
      expression = item.output;
      justCalculated = true;
      expressionView.textContent = item.input + " =";
      display.textContent = item.output;
      statusView.textContent = "Result restored from history.";
    });
    historyList.append(btn);
  });
}
document.getElementById("keypad").addEventListener("click", e => {
  const b = e.target.closest("button");
  if (!b) return;
  if (b.dataset.value !== undefined) insert(b.dataset.value);
  else if (b.dataset.constant) insert(b.dataset.constant === "pi" ? "π" : "e");
  else if (b.dataset.fn) applyFunction(b.dataset.fn);
  else if (b.dataset.action === "clear") clearCalc();
  else if (b.dataset.action === "backspace") backspace();
  else if (b.dataset.action === "sign") toggleSign();
  else if (b.dataset.action === "equals") calculate();
});
document.getElementById("degBtn").addEventListener("click", () => setAngle("DEG"));
document.getElementById("radBtn").addEventListener("click", () => setAngle("RAD"));
function setAngle(mode) {
  angleMode = mode;
  document.getElementById("degBtn").classList.toggle("selected", mode === "DEG");
  document.getElementById("radBtn").classList.toggle("selected", mode === "RAD");
  document.getElementById("modeLabel").textContent = mode === "DEG" ? "DEGREES" : "RADIANS";
  statusView.textContent = `Trigonometric functions use ${mode.toLowerCase()}.`;
}
document.getElementById("clearHistory").addEventListener("click", () => {
  history = [];
  persistHistory();
  renderHistory();
  showToast("History cleared.");
});
document.getElementById("historyToggle").addEventListener("click", e => {
  const hidden = historyList.hidden;
  historyList.hidden = !hidden;
  e.currentTarget.textContent = hidden ? "Hide history" : "Show history";
});
document.getElementById("themeBtn").addEventListener("click", () => {
  document.body.classList.toggle("light");
  const light = document.body.classList.contains("light");
  document.getElementById("themeBtn").textContent = light ? "☾" : "☼";
  try { localStorage.setItem("calcspace-scientific-theme", light ? "light" : "dark"); } catch {}
});
document.getElementById("copyBtn").addEventListener("click", async () => {
  try { await navigator.clipboard.writeText(display.textContent); showToast("Result copied."); }
  catch { showToast("Clipboard is unavailable in this context."); }
});
document.addEventListener("keydown", e => {
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  if (/^\d$/.test(e.key) || [".","+","-","*","/","(",")","%","^"].includes(e.key)) {
    e.preventDefault();
    const map = {"*":"×","/":"÷","-":"−"};
    insert(map[e.key] || e.key);
  } else if (e.key === "Enter" || e.key === "=") { e.preventDefault(); calculate(); }
  else if (e.key === "Backspace") backspace();
  else if (e.key === "Escape") clearCalc();
});
try {
  if (localStorage.getItem("calcspace-scientific-theme") === "light") {
    document.body.classList.add("light");
    document.getElementById("themeBtn").textContent = "☾";
  }
} catch {}
render();
renderHistory();
