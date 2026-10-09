// ---------- Elements & state ----------
const exprEl = document.getElementById("expr");
const resEl = document.getElementById("result");
const histEl = document.getElementById("history");
const toastEl = document.getElementById("toast");

let expr = "";          // what the user has typed
let ans = "";           // last answer
let done = false;       // true right after pressing "="
let deg = true;         // degrees or radians
let history = load("calcii-history", []);

const OPS = "+−-×÷^";

// ---------- Safe storage helpers ----------
function load(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
    catch { return fallback; }
}
function save(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}

// ---------- Expression evaluator (no eval) ----------
const fail = (msg) => { throw new Error(msg); };

function tokenize(s) {
    const re = /(\d+\.?\d*|\.\d+)(E[+-]?\d+)?|[a-zπ]+|[-+*/^%()√]/y;
    const out = [];
    let i = 0;
    while (i < s.length) {
        if (s[i] === " ") { i++; continue; }
        re.lastIndex = i;
        const m = re.exec(s);
        if (!m) fail("Invalid expression");
        out.push(m[0]);
        i = re.lastIndex;
    }
    return out;
}

function evaluate(src) {
    try {
        let s = src.replace(/×/g, "*").replace(/÷/g, "/").replace(/−/g, "-");
        const open = (s.match(/\(/g) || []).length - (s.match(/\)/g) || []).length;
        s += ")".repeat(Math.max(0, open));          // auto-close brackets

        const t = tokenize(s);
        let p = 0, pct = false;
        const peek = () => t[p];
        const next = () => t[p++];
        const startsFactor = (x) => x && (/^[\d.]/.test(x) || x === "(" || x === "√" || /^[a-zπ]/.test(x));
        const toRad = (x) => (deg ? (x * Math.PI) / 180 : x);

        const F = {
            sin: (x) => Math.sin(toRad(x)),
            cos: (x) => Math.cos(toRad(x)),
            tan: (x) => {
                if (deg && Math.abs(x % 180) === 90) fail("Undefined");
                return Math.tan(toRad(x));
            },
            log: (x) => (x > 0 ? Math.log10(x) : fail("Invalid input")),
            ln: (x) => (x > 0 ? Math.log(x) : fail("Invalid input")),
            sqrt: (x) => (x >= 0 ? Math.sqrt(x) : fail("Invalid input")),
            "√": (x) => (x >= 0 ? Math.sqrt(x) : fail("Invalid input")),
        };

        function addSub() {
            let v = term();
            while (peek() === "+" || peek() === "-") {
                const op = next();
                let r = term();
                if (pct) r = v * r;                   // 200 + 10% = 220
                v = op === "+" ? v + r : v - r;
            }
            return v;
        }
        function term() {
            pct = false;
            let v = unary();
            for (;;) {
                const x = peek();
                if (x === "*" || x === "/") {
                    next();
                    const r = unary();
                    pct = false;
                    if (x === "/") { if (r === 0) fail("Can't divide by zero"); v /= r; }
                    else v *= r;
                } else if (startsFactor(x)) {         // implicit multiply: 2π, 3(4+1)
                    v *= power();
                    pct = false;
                } else return v;
            }
        }
        function unary() {
            if (peek() === "-") { next(); return -unary(); }
            if (peek() === "+") { next(); return unary(); }
            return power();
        }
        function power() {
            const b = postfix();
            if (peek() === "^") { next(); const e = unary(); pct = false; return Math.pow(b, e); }
            return b;
        }
        function postfix() {
            let v = primary();
            while (peek() === "%") { next(); v /= 100; pct = true; }
            return v;
        }
        function primary() {
            const x = next();
            if (x === undefined) fail("Incomplete expression");
            if (/^[\d.]/.test(x)) return parseFloat(x);
            if (x === "(") {
                const v = addSub();
                if (next() !== ")") fail("Missing bracket");
                return v;
            }
            if (x === "π") return Math.PI;
            if (x === "e") return Math.E;
            if (F[x]) return F[x](primary());
            return fail("Invalid expression");
        }

        const v = addSub();
        if (p < t.length) fail("Invalid expression");
        if (!Number.isFinite(v)) fail("Invalid result");
        return { v };
    } catch (e) {
        return { err: e.message };
    }
}

// Round off floating-point noise (0.1 + 0.2 → 0.3, sin(180°) → 0)
const fmt = (n) => String(parseFloat(n.toPrecision(12))).replace("e", "E");

// ---------- Display ----------
function render(final = false, error = "") {
    exprEl.textContent = expr;
    exprEl.scrollLeft = exprEl.scrollWidth;
    resEl.className = "result";
    if (error) {
        resEl.textContent = error;
        resEl.classList.add("err");
        return;
    }
    let text = "0";
    if (final) text = expr || "0";
    else if (expr) {
        const r = evaluate(expr);
        text = r.err ? "\u00a0" : fmt(r.v);
        resEl.classList.add("prev");
    }
    resEl.textContent = text;
    if (text.length > 11) resEl.classList.add("long");
}

// ---------- Input ----------
function add(v) {
    const isOp = v.length === 1 && OPS.includes(v);
    if (done) {
        if (!(isOp || v === "%")) expr = "";       // typing a number starts fresh
        done = false;
    }
    const last = expr.slice(-1);

    if (isOp) {
        if (!expr) { if (v !== "−") return; }       // only a minus can start
        else if (OPS.includes(last)) {
            if (v === "−" && "×÷^".includes(last)) { /* allow 5×−3 */ }
            else expr = expr.slice(0, -1);          // swap the operator
        }
    }
    if (v === "%" && (!expr || OPS.includes(last))) return;

    if (v === ".") {
        const num = expr.match(/[\d.]+$/);
        if (num && num[0].includes(".")) return;
        if (!num) v = "0.";
    }
    if (expr.length >= 60) return toast("Maximum length reached");
    expr += v;
    render();
}

function del() {
    if (done) { clearAll(); return; }
    expr = expr.replace(/(sin\(|cos\(|tan\(|log\(|ln\(|√\(|.)$/, "");
    render();
}

function clearAll() { expr = ""; done = false; render(); }

function equals() {
    if (!expr) return;
    const r = evaluate(expr);
    if (r.err) return render(false, r.err);
    const out = fmt(r.v);
    const open = (expr.match(/\(/g) || []).length - (expr.match(/\)/g) || []).length;
    history.unshift({ e: expr + ")".repeat(Math.max(0, open)), r: out });
    history = history.slice(0, 30);
    save("calcii-history", history);
    ans = out;
    expr = out;
    done = true;
    render(true);
    renderHistory();
}

// ---------- History ----------
function renderHistory() {
    histEl.innerHTML = "";
    if (!history.length) {
        const li = document.createElement("li");
        li.className = "empty";
        li.textContent = "Your calculations will appear here.";
        histEl.appendChild(li);
        return;
    }
    history.forEach((h, i) => {
        const li = document.createElement("li");
        const b = document.createElement("button");
        b.dataset.h = i;
        b.innerHTML = '<span class="e"></span><span class="r"></span>';
        b.querySelector(".e").textContent = h.e + " =";
        b.querySelector(".r").textContent = h.r;
        li.appendChild(b);
        histEl.appendChild(li);
    });
}

// ---------- Theme, mode, angle ----------
const root = document.documentElement;
function setTheme(t) {
    root.dataset.theme = t;
    save("calcii-theme", t);
}
setTheme(load("calcii-theme", matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark"));

function setMode(m) {
    document.getElementById("sci").hidden = m !== "sci";
    document.querySelectorAll(".tabs button").forEach((b) => b.classList.toggle("on", b.dataset.m === m));
    save("calcii-mode", m);
}
setMode(load("calcii-mode", "basic"));

function toggleDeg() {
    deg = !deg;
    document.getElementById("angle").textContent = deg ? "DEG" : "RAD";
    document.getElementById("degBtn").textContent = deg ? "Deg" : "Rad";
    render();
}

// ---------- Toast & copy ----------
let toastTimer;
function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove("show"), 1500);
}

async function copyResult() {
    const text = resEl.textContent.trim();
    if (!text || resEl.classList.contains("err")) return;
    try { await navigator.clipboard.writeText(text); toast("Copied " + text); }
    catch { toast("Copy not supported here"); }
}

// ---------- Events ----------
document.addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    if (b.id === "result") return copyResult();
    if (b.dataset.h !== undefined) {
        expr = history[b.dataset.h].r;
        done = true;
        return render(true);
    }
    if (b.dataset.v) return add(b.dataset.v);
    switch (b.dataset.a) {
        case "clear": clearAll(); break;
        case "del": del(); break;
        case "eq": equals(); break;
        case "ans": if (ans) add(ans); else toast("No answer yet"); break;
        case "deg": toggleDeg(); break;
        case "mode": setMode(b.dataset.m); break;
        case "theme": setTheme(root.dataset.theme === "dark" ? "light" : "dark"); break;
        case "clearhist": history = []; save("calcii-history", history); renderHistory(); break;
    }
});

document.addEventListener("keydown", (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const k = e.key;
    const map = { "*": "×", "/": "÷", "-": "−" };
    if (/^[0-9.+^%()]$/.test(k) || map[k]) { e.preventDefault(); add(map[k] || k); }
    else if (k === "Enter" || k === "=") { e.preventDefault(); equals(); }
    else if (k === "Backspace") { e.preventDefault(); del(); }
    else if (k === "Escape") clearAll();
});

render();
renderHistory();