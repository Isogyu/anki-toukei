# 統計検定2級 暗記カード (anki-toukei)

統計検定2級の試験直前対策用に、公式・定義・重要用語を3〜5秒で反復確認するための暗記カードWebアプリです。問題演習・進捗管理・SRS などの学習ロジックは実装していません（状態はリロードでリセットされます）。

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

## セットアップ

```bash
npm install       # 依存関係のインストール
npm run dev       # 開発サーバー起動 (http://localhost:5173)
```

## スクリプト

| コマンド | 内容 |
| --- | --- |
| `npm run dev` | 開発サーバーを起動 |
| `npm run build` | 型チェック + 本番ビルド |
| `npm run lint` | ESLint によるチェック |
| `npm run format` | Prettier で整形 |
| `npm run validate` | カードデータ (`src/data/cards.json`) の品質検証 |
| `npm run preview` | ビルド結果のプレビュー |

## 操作方法

- カードをクリック/タップすると裏返り、公式・意味・使う場面が表示されます。
- 「← 前へ」「次へ →」でカテゴリー内をループ送りできます（送るたびに表面へリセット）。
- 中央のドロップダウンでカテゴリーを切り替えられます。先頭の「すべて」を選ぶと全カードを id 順に通し表示します。
- キーボード: `←` / `→` で前後移動、`Space` / `Enter` でカードを反転（カードにフォーカス時）。

## カードの追加・編集

カードデータは <code>src/data/cards.json</code> に集約されています。**このファイルを編集するだけでカードを追加でき、コード側の変更は不要です。**

各カードのスキーマ（`src/types/Card.ts`）:

```ts
interface Card {
  id: number;        // 1始まりの連番。重複禁止
  category: Category; // 定義済みカテゴリーのいずれか
  title: string;      // 見出し（1テーマ、カテゴリー内で一意）
  formula: string;    // LaTeX文字列。用語カードなど公式がなければ空文字 ""
  meaning: string;    // 意味（1〜2文）
  usage: string[];    // 使う場面のタグ（1〜3個）
}
```

編集後は必ず検証を実行してください:

```bash
npm run validate
```

`npm run validate` は以下を確認し、1つでも失敗すると exit code 1 で終了します。

1. `cards.json` が `Card[]` の zod スキーマに適合する
2. `id` が 1〜N の連番かつ重複なし
3. 同一 `category` 内で `title` の重複がない
4. `category` ごとのカード数が最低枚数を満たす
5. 空でない `formula` が KaTeX でレンダリング可能（LaTeX 構文エラー検出）

## ディレクトリ構成

```
src/
  components/
    FlashCard.tsx
    CategorySelector.tsx
  data/
    cards.json
  pages/
    Home.tsx
  types/
    Card.ts
  styles/
  App.tsx
scripts/
  validate-cards.ts
```
