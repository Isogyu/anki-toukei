# 統計検定2級 直前対策 (anki-toukei)

統計検定2級（CBT・4〜5肢選択）の直前対策用モバイルWebアプリです。暗記カード・解法パターン判別ドリル・分野別4〜5択演習・弱点復習・おすすめ出題を、スマホのブラウザで回せます。PWA対応でホーム画面への追加・オフライン利用が可能です。

解説は「四則・%・√のみの普通電卓」と「会場配布の数値表（正規・t・χ²・F）」が使える前提で書いています。

## 機能

- **カード**（157枚）: カテゴリー別の暗記カード。裏面に公式・意味・使う場面に加え、ひっかけ注意（pitfalls）・普通電卓でのコツ（calcTips）・参照節（📖 オーム社/公式テキスト）を表示。
- **簡易SRS**: カード裏面で「覚えた / あやしい / 覚えてない」を3段階評価。`localStorage` に保存し、「弱点優先: ON」では低評価カードから順に出題します（評価順: 覚えてない > あやしい > 未評価 > 覚えた）。☆チェックも併用可。
- **判別ドリル**: 短い問題文から「手法・分布・自由度」を即答。タイマー付きで、パターンごとの正答率・平均回答時間を記録します（37パターン、各バリエーション3題以上）。
- **演習**: 分野別の4〜5択問題。計算問題はパラメータをランダム生成し、正解は `src/solvers/*.ts` がその場で計算します（ハードコードなし）。誤答選択肢は典型ミス（n と n−1、標準偏差と標準誤差、片側/両側、自由度の取り違えなど）から生成。解答後は普通電卓での手順・誤答の理由・参照節を表示し、誤答を「知識不足 / 判別ミス / 計算ミス」で1タップ分類できます。
- **数値表トレーニング**: 正規（Φ・上側）・t・χ²・F分布表の引き方問題。値はすべて scipy で生成した `tables.json` から出題し、隣接セル・逆側の表・自由度違いなどの誤読選択肢を出します。
- **穴埋め**: 分散分析表（SS・df・MS・F）と回帰出力（傾き・標準誤差・t値・R²）の空欄を整合性のある乱数値で生成し、3空欄ずつ回答します。
- **ミニ模試**: カテゴリー横断10問・25分計。解答中は正誤を見せず、終了後にスコアと全問の解説を表示します（時間切れで自動採点）。
- **弱点**: 誤答テンプレート（分類別の内訳付き）と低評価カードの一覧。各項目から直接「もう一度」「カードを見る」に飛べます。🚩報告IDの一覧もここ。
- **今日のおすすめ20問**: 誤答問題と低評価カードを混ぜた20問セッション。ホーム最上部と弱点タブから開始。
- **🚩おかしいボタン**: 各カード・問題・パターンにあり、押すと項目IDが `localStorage` に記録されます（弱点タブで一覧確認）。

## 技術スタック

- パッケージマネージャ: npm
- Node.js: 20 LTS 以上
- ビルドツール: Vite
- フレームワーク: React 18 + TypeScript 5
- スタイリング: CSS Modules
- 数式レンダリング: KaTeX
- Lint: ESLint (typescript-eslint recommended)
- Format: Prettier (semi: true, singleQuote: true)
- データ検証: zod
- 数値検算: Python 3 + scipy（`scripts/`）

## セットアップ

```bash
npm install       # 依存関係のインストール
npm run dev       # 開発サーバー起動 (http://localhost:5173)
```

## スクリプト

| コマンド           | 内容                                                                |
| ------------------ | ------------------------------------------------------------------- |
| `npm run dev`      | 開発サーバーを起動                                                  |
| `npm run build`    | 型チェック + 本番ビルド                                             |
| `npm run lint`     | ESLint によるチェック                                               |
| `npm run format`   | Prettier で整形                                                     |
| `npm run validate` | データ品質検証 + ソルバー/数値表の scipy 照合（要 Python3 + scipy） |
| `npm run preview`  | ビルド結果のプレビュー                                              |

## データスキーマ

### カード (`src/data/cards.json`, `src/types/Card.ts`)

```ts
interface Card {
  id: number; // 1始まりの連番。重複禁止
  category: Category; // 定義済みカテゴリーのいずれか
  title: string; // 見出し（カテゴリー内で一意）
  formula: string; // LaTeX文字列。なければ ""
  meaning: string; // 意味（1〜2文）
  usage: string[]; // 使う場面タグ（1〜3個）
  pitfalls?: string[]; // ひっかけ注意（任意）
  calcTips?: string; // 普通電卓でのコツ（任意）
  ohm?: string; // オーム社テキスト節番号 例 "6-2"（任意）
  official?: string; // 公式テキスト節番号 例 "4.4"（任意）
  refs?: string[]; // 参照URL等（任意）
}
```

### 判別パターン (`src/data/patterns.json`, `src/types/Pattern.ts`)

```ts
interface Pattern {
  id: string; // "pat-xx" 形式
  category: Category;
  trigger: string; // 問題文の手がかり
  method: string; // 手法名（判別ドリルの正解）
  distribution: DistributionKey; // z | t | chi2 | f | binom 等
  dfShort: string; // 自由度の短い表記（判別ドリルの正解）
  dfRule: string; // 自由度の求め方
  steps: string[]; // 解法手順
  variants: string[]; // 出題バリエーション（3つ以上）
  ohm?: string;
  official?: string;
}
```

### 演習テンプレート (`src/data/questions.json`, `src/types/Question.ts`)

```ts
interface QuestionTemplate {
  id: string; // "q-xxx-01" 形式
  category: Category;
  solver: string; // src/solvers/index.ts の SOLVERS キー
  label: string; // テンプレート名
  pool?: ConceptItem[]; // solver === 'concept' のとき必須
  ohm?: string;
  official?: string;
  refs?: string[];
}
```

計算ソルバーは `verify` ペイロード（kind + params + expected）を返し、`scripts/verify_solvers.py` が scipy で再計算して照合します。

### 数値表 (`src/data/tables.json`)

`scripts/gen_tables.py` が scipy で生成した正規・t・χ²・F分布の値（臨界値・Φ(z)・上側確率）。

## 検証

```bash
npm run validate
```

以下をすべて確認し、1つでも失敗すると exit code 1 で終了します。

1. `cards.json` / `patterns.json` / `questions.json` が zod スキーマに適合
2. ID 重複なし・カテゴリー別の最低件数（カード・テンプレート）
3. 空でない `formula` が KaTeX でレンダリング可能
4. 全ソルバーが4〜5択・正解ちょうど1つ・誤答理由付きの問題を生成できる
5. 全テンプレート × 8シードの `verify` ペイロードを scipy で再計算照合
6. `tables.json` の全数値を scipy の `isf/cdf/sf` と照合

検算だけ回したい場合:

```bash
npx tsx scripts/dump_verify.ts      # verify ペイロードをダンプ
python3 scripts/verify_solvers.py   # scipy 照合
```

## 保存データ（localStorage）

| キー                     | 内容                               |
| ------------------------ | ---------------------------------- |
| `anki-toukei:checked`    | ☆チェックしたカードID              |
| `anki-toukei:userCards`  | ユーザー追加カード                 |
| `anki-toukei:ratings`    | カードの3段階評価                  |
| `anki-toukei:quizStats`  | 演習テンプレート別の成績・誤答分類 |
| `anki-toukei:drillStats` | 判別ドリルの正答率・回答時間       |
| `anki-toukei:reports`    | 🚩報告した項目ID                   |

## PWA / オフライン

- `public/manifest.webmanifest` + アイコンでホーム画面に追加できます（standalone 表示）。
- `public/sw.js` が cache-first で動作し、一度開いたページはオフラインでも使えます。
- 本番ビルド（`npm run build`）のみ Service Worker を登録します。

## デプロイ

GitHub Pages（`.github/workflows/deploy.yml`）。`main` への push で `npm ci && npm run build` → `dist` をデプロイします。`vite.config.ts` の `base` は `/anki-toukei/`。

## 既知の制限

- `concept` ソルバーの問題（知識確認系）は `verify` ペイロードを持たず scipy 照合対象外です（選択肢の正誤は zod/テンプレート検証で担保）。数値表・穴埋めページの数値は既に検算済みの表値/公式と同じものを使っています。
- SRS は間隔反復ではなく直近評価による優先度ソートのみです。
- 判別ドリルの選択肢は同時出題パターンに依存し、類似手法同士の区別が難しい場合があります。

## ディレクトリ構成

```
src/
  components/    FlashCard, QuestionCard, CategorySelector, AddCardForm,
                 TabBar, ReportButton, Tex
  data/          cards.json, patterns.json, questions.json, tables.json
  hooks/         useCheckedCards, useUserCards, useRatings, useQuizStats,
                 useReports
  lib/           stats.ts（乱数・分布関数）, recommend.ts（おすすめキュー）
  pages/         Home, Drill, Quiz, Weak, Today
  solvers/       計算ソルバー（分野別）+ index.ts（SOLVERSレジストリ）
  types/         Card, Pattern, Question
scripts/
  validate-cards.ts   データ品質検証
  dump_verify.ts      verify ペイロードのダンプ
  verify_solvers.py   scipy 照合
  gen_tables.py       数値表生成
  gen_icons.py        PWAアイコン生成
public/
  manifest.webmanifest, sw.js, icon-*.png
```
