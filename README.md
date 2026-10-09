# CalcSpace — Calculator V2

A responsive calculator built with HTML, CSS, and vanilla JavaScript.

## Features
- Addition, subtraction, multiplication, division, decimals, percentage, sign toggle, and backspace
- Calculation history saved in the current browser with `localStorage`
- Click a history item to restore its result
- Clear history, copy result, keyboard support, and dark/light theme
- Responsive layout for desktop and mobile
- Expression parser without `eval()`, with division-by-zero and invalid-expression handling

## Run locally
1. Download or extract this folder.
2. Open `index.html` in a modern browser.

No build tools, backend, or dependencies are required. Google Fonts are optional; the page has fallback fonts.

## Deploy with GitHub Pages
1. Create a public GitHub repository named `calculator-v2`.
2. Upload `index.html`, `style.css`, `script.js`, and `README.md` to the repository root.
3. Open **Settings → Pages**.
4. Under **Build and deployment**, choose **Deploy from a branch**.
5. Select branch `main` and folder `/ (root)`, then save.
6. Wait for deployment. Your site URL will look like `https://YOUR-USERNAME.github.io/calculator-v2/`.

## History and privacy
History and theme preference are stored in the browser's local storage. They are not synced between devices or browsers. Clearing browser site data may remove them.
