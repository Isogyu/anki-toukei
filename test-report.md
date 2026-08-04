# Test Report — 統計検定2級 暗記カード (PR #1)

**How tested:** Ran the app locally via `npm run dev` (Vite, http://localhost:5173) and exercised the full golden-path flow end-to-end through the browser UI. All 8 planned tests passed.

**Branch:** devin/1785816223-anki-toukei · **Data:** 107 cards.

## Result summary

| # | Test | Result |
|---|------|--------|
| 1 | Initial display: 1/107, default すべて, card 平均 centered | ✅ Passed |
| 2 | Card flip toggles front ⇄ back (公式/意味/使う場面) | ✅ Passed |
| 3 | Next/Prev advance counter & reset to front (un-flipped) | ✅ Passed |
| 4 | Boundary loop: Prev at 1→107, Next at 107→1 | ✅ Passed |
| 5 | Category switch changes filter & total count | ✅ Passed |
| 6 | KaTeX formula renders; no-formula card hides 公式 | ✅ Passed |
| 7 | Arrow-key navigation (←/→) | ✅ Passed |
| 8 | Responsive: controls stack vertically <768px | ✅ Passed |

## Evidence

### 1. Initial display — counter 1/107, default すべて, card 平均
![initial](https://app.devin.ai/attachments/8d88ce3c-cdc7-43f3-b654-2ff2d489129b/ss_zoom_3a4c6784.png)

### 2. Card flip — 平均 back with KaTeX formula, 意味, 使う場面
![flip](https://app.devin.ai/attachments/7a526bce-a686-41b6-8cbd-a076970b384e/ss_zoom_614dff71.png)

### 4. Boundary loop — Prev from 1/107 wraps to 107/107 (外的妥当性)
![loop](https://app.devin.ai/attachments/dca9fd69-d858-4109-9800-9e7af0c04b96/ss_zoom_7c64d521.png)

### 5. Category switch — 確率分布 → 1/21 (二項分布); 確率 → 1/5 (加法定理)
![cat21](https://app.devin.ai/attachments/18f2bbfb-422c-40ad-99a9-c626694dd03d/ss_zoom_6370b251.png)
![cat5](https://app.devin.ai/attachments/04fdeb84-1291-4ea0-a66c-326179ff9abe/ss_zoom_0af69b5e.png)

### 6a. KaTeX rendering — binomial distribution typeset (coefficient + superscripts)
![katex](https://app.devin.ai/attachments/13c44caa-1a27-4631-a882-1e7d13ca9e00/ss_zoom_00457fdf.png)

### 6b. No-formula term card — 中央値 back shows only 意味 / 使う場面 (公式 absent)
![noformula](https://app.devin.ai/attachments/3d637754-fc05-427a-9eaf-e35376530e0c/ss_zoom_1056182d.png)

### 8. Responsive — controls stack vertically at <768px width
![responsive](https://app.devin.ai/attachments/d04d1675-28b0-4d52-b1b1-9837a3203544/ss_zoom_7e73fefa.png)

## Notes / caveats
- A second Vite instance (port 5175, started with `--host`, likely by the lead) and a duplicate browser tab appeared mid-session. This caused one flip-back click to land on the wrong tab and briefly look unresponsive. After closing the extra tab and continuing on the single 5173 tab, the flip-back worked correctly and was re-verified. This is an environment artifact, **not** an app bug.
- No persistence tested (spec says state resets on reload — by design).
