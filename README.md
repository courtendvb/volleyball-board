# Volleyball Board v2

バレーボールの試合分析やトレーニングのためのインタラクティブなボード描画ツールです。React + TypeScript + Konva.js を使用して、コート、プレイヤー、フォーメーション、矢印などの形状を描画できます。

## 機能

- コートの表示スタイル変更（全面、半面、センターエリアなど）
- プレイヤーの配置とフォーメーション管理
- 描画ツール（矢印、線、テキスト、四角形、円）
- アニメーション機能
- Undo/Redo
- チームカラーのカスタマイズ

## インストール

```bash
npm install
```

## 開発サーバーの起動

```bash
npm run dev
```

## ビルド

```bash
npm run build
```

## テスト

```bash
npm test
```

## 使用方法

1. コートタイプを選択してボードを表示。
2. 描画ツールで形状を追加。
3. プレイヤーをドラッグして配置。
4. アニメーションパネルで動きをシミュレート。

## 技術スタック

- React 19
- TypeScript
- Konva.js
- Vite
- ESLint

## 貢献

プルリクエストをお待ちしています。変更前にテストを実行してください。
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
