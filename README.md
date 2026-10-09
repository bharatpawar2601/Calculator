# CalcSpace Scientific — Calculator V3

A responsive scientific calculator built with HTML, CSS, and vanilla JavaScript.

## Features
- Trigonometry: `sin`, `cos`, `tan` with DEG/RAD mode
- Inverse trig: type `asin(0.5)`, `acos(0.5)`, `atan(1)`
- `log`, `ln`, square root, square, powers, reciprocal, factorial, percentage
- Constants: π, e, and `Ans` (previous answer)
- Parentheses and arithmetic precedence
- Calculation history with restore, hide/show, and clear-all controls
- Dark/light theme, keyboard support, copy result, responsive layout
- Safe tokenizer/parser (does not use `eval()`)

## Run
Open `index.html` in a modern browser. No build tools or backend are required.

## History storage note
This version stores history in the browser's `localStorage`. It stays in that browser profile and is not a shared database. To save a user's history to a real database and access it across devices, add a backend/API and a database such as Supabase or PostgreSQL, and usually user authentication.

## GitHub Pages deployment
1. Create a public repository named `calculator-v3-scientific`.
2. Upload `index.html`, `style.css`, `script.js`, and `README.md` to the root.
3. Go to Settings → Pages.
4. Choose Deploy from a branch, branch `main`, folder `/ (root), then Save.
5. Wait for deployment. URL format: `https://YOUR-USERNAME.github.io/calculator-v3-scientific/`.
