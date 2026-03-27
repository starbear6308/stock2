# 📊 投資組合儀表板

Stock Portfolio Dashboard — React + Tailwind CSS + Vite

## 快速開始

```bash
# 1. 安裝依賴
npm install

# 2. 設定 API URL
#    打開 src/App.jsx，第 4 行填入你的 GAS Web App URL：
#    const API_URL = "https://script.google.com/macros/s/你的ID/exec";

# 3. 本地開發
npm run dev

# 4. 打包
npm run build
```

## 部署到 Vercel

### 方法 A：GitHub 連結
1. 將此專案推到 GitHub
2. 到 [vercel.com](https://vercel.com) 匯入這個 repo
3. Vercel 會自動偵測 Vite 設定並部署

### 方法 B：CLI 部署
```bash
npm i -g vercel
vercel --prod
```

### 方法 C：拖曳部署
1. 執行 `npm run build`
2. 到 [vercel.com](https://vercel.com) → New Project → 拖入 `dist` 資料夾

## 後端需求

需要搭配 **Stock Portfolio v5.gs** 部署在 Google Apps Script 上。

GAS 部署方式：
1. Apps Script → 貼上 v5 程式碼
2. 部署 → 新增部署 → 網頁應用程式
3. 執行身分：自己 / 存取權：任何人
4. 取得 URL 填入前端的 `API_URL`

## 技術棧

- **前端**: React 18 + Tailwind CSS v4 + Vite 6
- **後端**: Google Apps Script (JSON API)
- **資料**: Google Sheets
- **股價 API**: TWSE / GOOGLEFINANCE / Fugle / Yahoo / Alpha Vantage
