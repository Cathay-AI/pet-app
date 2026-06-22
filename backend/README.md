# Neko Pet App - 後端開發指南 (FastAPI)

這是 Neko 寵物養成 App 的後端專案。由 3 位後端開發者共同協作，並提供 API 給 3 位前端開發者介接。

## 技術棧 (Tech Stack)

* **框架**：FastAPI
* **資料庫**：Supabase
* **套件/虛擬環境管理**：`uv` 
* **測試框架**：`pytest` + `pytest-asyncio`

---

## 本地開發快速開始

### 1. 安裝環境與依賴

推薦使用超快的 Python 套件管理器 [uv](https://github.com/astral-sh/uv)：

```bash
# 建立虛擬環境並安裝所有依賴項目
uv venv
uv sync
```

如果不使用 `uv`，可以使用傳統方式：

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt # 或使用 pyproject.toml 安裝
```

### 2. 環境變數設定

複製專案目錄下的 `.env.example` 為 `.env`：

```bash
cp .env.example .env
```

修改 `.env` 中的 `DATABASE_URL`。例如，如果你本地有運行 PostgreSQL：

```ini
DATABASE_URL=postgresql+asyncpg://postgres:password@localhost:5432/pet_app
JWT_SECRET_KEY=your-dev-secret-key-change-it
APP_CORS_ORIGINS=http://localhost:3000
```

> **提示**：FastAPI 在啟動時會透過 `Base.metadata.create_all` 自動檢查並在資料庫建立所需的資料表（`users`、`pets`、`refresh_tokens`），無需手動執行 SQL。

### 3. 啟動開發伺服器

使用以下指令啟動 FastAPI（預設運行在 `http://localhost:8000`）：

```bash
# 使用 uv 啟動
uv run uvicorn app.main:app --reload

# 或已啟用虛擬環境時直接使用 uvicorn
uvicorn app.main:app --reload
```

啟動後可以造訪：

* **API 文件 (Swagger UI)**：[http://localhost:8000/docs](http://localhost:8000/docs)
* **API 文件 (ReDoc)**：[http://localhost:8000/redoc](http://localhost:8000/redoc)

---



## 執行單元測試

後端配有完整測試，包含註冊、登入、寵物創建唯一性校驗等。執行以下指令運行測試：

```bash
uv run pytest
```
