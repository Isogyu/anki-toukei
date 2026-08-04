# Test Plan — 統計検定2級 暗記カード (PR #1)

App: Vite React SPA at http://localhost:5173. Single page (Home). No auth/state persistence.
Source refs: `src/pages/Home.tsx`, `src/components/FlashCard.tsx`, `src/components/CategorySelector.tsx`.
Data: 107 cards total. Counts: 記述統計=13, 確率=5, 確率分布=21, 用語=13. First cards id1=平均, id2=中央値(no formula), id3=最頻値(no formula).

## Test 1 — Initial display
- Load http://localhost:5173, maximize window.
- PASS: one card centered showing front (title, category tag, "タップして解答を表示" hint). Counter reads **"1 / 107"**. Category dropdown default = **"すべて"**. First card title = **"平均"**.

## Test 2 — Card flip toggle
- Click the card.
- PASS: card flips to back; shows sections 公式 (KaTeX formula for 平均), 意味, 使う場面. Front hint no longer shown.
- Click again → PASS: returns to front (title 平均 visible).

## Test 3 — Navigation resets flip + counter increments
- Flip current card (back visible). Click "次へ →".
- PASS: counter → **"2 / 107"**, card shows FRONT (not flipped) — title = **"中央値"**.
- Click "← 前へ".
- PASS: counter → **"1 / 107"**, front, title = **"平均"**.

## Test 4 — Loop at boundary (prev from first → last)
- At card 1/107, click "← 前へ".
- PASS: counter → **"107 / 107"** (wraps to last card), front shown.
- Click "次へ →" → PASS: counter → **"1 / 107"**.

## Test 5 — Category switch
- Select category **"確率分布"** in dropdown.
- PASS: counter total changes to **"1 / 21"**, first card of that category shown on FRONT, category tag = 確率分布.
- Select **"確率"** → PASS: counter → **"1 / 5"**.

## Test 6 — KaTeX formula rendering + no-formula card
- With "すべて", navigate to a card with a rich formula (e.g. 分散 or 正規分布 density). Flip.
- PASS: formula renders as typeset math (fractions/superscripts, not raw LaTeX like `\frac`).
- Navigate to id2 中央値 (2/107) and flip.
- PASS: 公式 section is ABSENT; only 意味 and 使う場面 sections shown.

## Test 7 — Keyboard navigation
- Press ArrowRight → counter increments; ArrowLeft → decrements.
- PASS: counter changes accordingly, cards reset to front.

## Test 8 — Responsive layout (regression-ish, per spec)
- Resize/emulate viewport < 768px width.
- PASS: controls row (前へ / dropdown / 次へ) stacks vertically (column) instead of horizontal row.
