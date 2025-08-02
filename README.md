# CloudCAD - 測量CADシステム

React + TypeScript + Mantine UIで構築された現代的な測量CADアプリケーション

## 特徴

- 🗺️ **地理院地図統合**: MapLibre GLを使用した地理院タイル表示
- 📍 **座標管理**: 基準点・制御点・境界点の統合管理
- 🏠 **地番管理**: 地番・地目・面積データの管理
- 👥 **地権者管理**: 土地所有者情報の管理
- 📊 **SIMファイル対応**: 測量機器との座標データ交換
- 🗾 **平面直角座標系**: 13系（北海道東部）対応

## 技術スタック

- **Frontend**: React 19, TypeScript, Mantine UI
- **地図**: MapLibre GL, 地理院タイル
- **座標変換**: proj4js
- **ビルドツール**: Vite
- **状態管理**: React Hooks

## セットアップ

### 前提条件
- Node.js v20以上
- npm

### インストール

```bash
# リポジトリをクローン
git clone https://github.com/yourusername/CloudCAD.git
cd CloudCAD

# フロントエンド依存関係をインストール
cd frontend
npm install

# 開発サーバー起動
npm run dev
```

### 利用可能なスクリプト

```bash
npm run dev      # 開発サーバー起動
npm run build    # プロダクションビルド
npm run preview  # ビルド結果のプレビュー
npm run lint     # ESLintチェック
```

## 主要機能

### 1. プロジェクト管理
- 測量プロジェクトの作成・編集
- プロジェクトテンプレート
- タスク・メンバー管理

### 2. 座標・地番管理
- 地理院地図上での座標点表示
- 地番ポリゴンの表示・編集
- 複数選択フィルター機能
- SIM読込・書込機能

### 3. 地図機能
- 地理院タイル（標準・淡色・白地図・航空写真）
- 平面直角座標系からの座標変換
- ズーム・パン・フルスクリーン操作

### 4. データ管理
- 座標データのフィルタリング・検索
- 地番・地権者情報の管理
- CSV/SIMファイルエクスポート

## ディレクトリ構造

```
CloudCAD/
├── frontend/
│   ├── src/
│   │   ├── components/        # Reactコンポーネント
│   │   │   ├── coordinates/   # 座標管理
│   │   │   ├── projects/      # プロジェクト管理
│   │   │   ├── viewer/        # 地図ビューワー
│   │   │   └── lots/          # 地番管理
│   │   ├── utils/             # ユーティリティ関数
│   │   │   ├── coordinateTransform.ts
│   │   │   └── mockDataGenerator.ts
│   │   └── types/             # TypeScript型定義
│   ├── package.json
│   └── vite.config.ts
└── README.md
```

## 開発者向け情報

### 座標系について
- デフォルト: 平面直角座標系第13系（北海道東部）
- 緯度経度変換: proj4jsライブラリ使用
- 地図中心: 釧路市周辺

### 地図設定
- 地理院タイルURL: `https://cyberjapandata.gsi.go.jp/xyz/{type}/{z}/{x}/{y}.{ext}`
- 対応タイル: std, pale, blank, seamlessphoto

## ライセンス

MIT License

## 貢献

1. このリポジトリをフォーク
2. 機能ブランチを作成 (`git checkout -b feature/新機能`)
3. 変更をコミット (`git commit -am '新機能を追加'`)
4. ブランチにプッシュ (`git push origin feature/新機能`)
5. プルリクエストを作成

## サポート

質問や問題がある場合は、Issuesを作成してください。