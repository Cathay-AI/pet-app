# 寵物養成 App (Neko) 交接說明文件

本文件主要說明在 `feature/auth-login` 分支中所新增與修改的後端 API、資料庫 Schema、前端介面調整，以及環境變數配置，以便後續接手人員能夠順利進行開發與整合。

---

## 一、 專案變更概述 (Overview)

在此分支中，我們將原本完全仰賴前端 LocalStorage 及前端直接對 Supabase DB 進行操作的架構，**重構為經過後端（FastAPI）處理的雲端同步架構**。

* **安全性增強**：前端所有與伺服器之互動皆經過 FastAPI 後端進行權限校驗。前端透過 Supabase SDK 取得 JWT Token，並在每次調用 API 時透過 `Authorization: Bearer <token>` 標頭發送，後端由 FastAPI 解密驗證 Claim (`sub` 對應到 `auth.users` 的 ID) 來判定身分。
* **主要新增功能**：
  1. **完整註冊/登入/密碼重置流程**：提供前端帳密註冊、登入切換，以及忘記密碼、重設密碼頁面。
  2. **個人設定與專屬好友碼**：支援自訂暱稱 (username)、頭像、個人簡介 (bio)，且每個 Profile 在首次初始化時皆會生成唯一的專屬好友碼（例如 `NEKO-A3B7`）。
  3. **雙向好友系統**：可透過好友碼搜尋飼主、發送好友邀請、處理待審核邀請（同意/拒絕）、查看好友列表以及解除好友關係。
  4. **雲端寵物同步**：寵物的新增、狀態查詢、數值更新與排行榜全部 API 化，並於資料庫層面限制「每位使用者僅能擁有一隻寵物」。

---

## 二、 資料庫 Schema 結構

> [!IMPORTANT]
> **帳號與密碼儲存說明**
> 本專案的所有使用者帳號與密碼皆**託管於 Supabase Auth 內部的 `auth.users` 表**。
> 密碼在 Supabase 端進行雜湊加密與安全儲存，我們的自建後端（FastAPI）與應用程式資料表完全不經手、亦不儲存使用者的明文或加密密碼。
> 我們自建的 `public.profiles` 資料表只儲存公開設定檔（暱稱、頭像等），並以 UUID 關聯 `auth.users(id)`。

所有資料庫 Schema 皆透過 Supabase 的 SQL Migrations 進行管理，共有兩個遷移檔案：

### 1. `profiles` 表 (使用者設定檔)

* **目的**：與 Supabase 的內部 `auth.users` 進行 1:1 關聯，存儲應用程式層級的飼主資訊。
* **建表 SQL** ([001_neko_auth_pets.sql](file:///Users/cfh00903977/Project/pet-app/supabase/migrations/001_neko_auth_pets.sql))：
  ```sql
  create table if not exists public.profiles (
    id           uuid primary key references auth.users(id) on delete cascade,
    username     text not null check (char_length(username) between 1 and 24),
    friend_code  text unique,
    avatar       text check (
      avatar in ('cat_orange','cat_gray','cat_lavender','dog_brown','dog_gray','dog_blue')
    ),
    bio          text check (char_length(bio) <= 160),
    created_at   timestamptz not null default now(),
    updated_at   timestamptz not null default now()
  );
  ```
* **索引**：`profiles_friend_code_idx` 建於 `friend_code` 上，以利於好友碼搜尋。
* **RLS 政策**：
  * 所有 Profile 皆可被公開讀取 (`select using (true)`)。
  * 僅限本人可寫入/修改 (`auth.uid() = id`)。

### 2. `pets` 表 (寵物資料)

* **目的**：記錄每個帳號底下的寵物基本資料、即時狀態（飢餓值、清潔值、心情值、是否生病）與最後互動時間。
* **建表 SQL** ([001_neko_auth_pets.sql](file:///Users/cfh00903977/Project/pet-app/supabase/migrations/001_neko_auth_pets.sql))：
  ```sql
  create table if not exists public.pets (
    id            uuid primary key default gen_random_uuid(),
    user_id       uuid not null unique references public.profiles(id) on delete cascade, -- unique 確保 1:1 關係
    name          text not null check (char_length(name) between 1 and 24),
    type          text not null check (type in ('cat', 'dog')),
    color         text not null check (color in ('orange', 'brown', 'gray', 'blue', 'mint', 'lavender')),
    hunger        integer not null default 100 check (hunger between 0 and 100),
    cleanliness   integer not null default 100 check (cleanliness between 0 and 100),
    mood          integer not null default 100 check (mood between 0 and 100),
    is_sick       boolean not null default false,
    zero_since_at timestamptz,
    last_fed_at   timestamptz,
    last_bath_at  timestamptz,
    last_play_at  timestamptz,
    updated_at    timestamptz not null default now()
  );
  ```
* **索引**：
  * `pets_user_idx` 建立於 `user_id`。
  * `pets_public_rank_idx` 用於排行榜分頁排序最佳化。
* **RLS 政策**：
  * 排行榜需要公開，所以寵物資料允許所有人讀取 (`select using (true)`)。
  * 僅限本人能新增或修改屬於自己的寵物 (`auth.uid() = user_id`)。

### 3. `care_events` 表 (照顧事件記錄)

* **建表 SQL**：
  ```sql
  create table if not exists public.care_events (
    id         uuid primary key default gen_random_uuid(),
    pet_id     uuid not null references public.pets(id) on delete cascade,
    user_id    uuid not null references public.profiles(id) on delete cascade,
    type       text not null check (type in ('feed', 'bath', 'clean', 'play', 'treat')),
    metadata   jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now()
  );
  ```
* **RLS 政策**：僅限擁有者本人讀取與插入事件。

### 4. `friendships` 表 (好友關聯表)

* **目的**：存儲雙向好友申請與好友關係狀態。
* **建表 SQL** ([002_friendships.sql](file:///Users/cfh00903977/Project/pet-app/supabase/migrations/002_friendships.sql))：
  ```sql
  create table if not exists public.friendships (
    id           uuid primary key default gen_random_uuid(),
    requester_id uuid not null references public.profiles(id) on delete cascade,
    addressee_id uuid not null references public.profiles(id) on delete cascade,
    status       text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
    created_at   timestamptz not null default now(),
    updated_at   timestamptz not null default now(),
    constraint friendships_pair_unique unique (requester_id, addressee_id), -- 單一對應限制
    constraint friendships_no_self check (requester_id <> addressee_id)      -- 禁止加自己為好友
  );
  ```
* **RLS 政策**：
  * 查詢好友/申請：僅限參與此好友關係的兩者讀取 (`auth.uid() = requester_id or auth.uid() = addressee_id`)。
  * 送出申請：`requester_id` 必須為當前使用者。
  * 審核申請 (Update)：僅能由被邀請人修改狀態 (`auth.uid() = addressee_id`)。
  * 解除好友/撤銷申請：雙方皆可刪除此關聯資料列。

---

## 三、 環境變數配置 (.env)

為了使前後端以及 Supabase 認證服務正常對接，需要設置以下變數：

### 1. 前端環境變數 ([.env.local](file:///Users/cfh00903977/Project/pet-app/.env.local))

```bash
# Supabase 連線資訊 (前端 SDK 直接登入用)
NEXT_PUBLIC_SUPABASE_URL=https://<your-project-id>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-publishable-anon-key>

# FastAPI 後端 API 位址
NEXT_PUBLIC_BACKEND_URL=http://localhost:8000
```

### 2. 後端環境變數 (`backend/.env`)

```bash
# ─── Database (Supabase PostgreSQL) ──────────────────────────────────────────
# 使用非同步連線字串格式 (postgresql+asyncpg://...)
DATABASE_URL=postgresql+asyncpg://postgres.<your-project-id>:<your-db-password>@<your-db-host>:5432/postgres

# ─── Supabase 認證配置 ────────────────────────────────────────────────────────
SUPABASE_URL=https://<your-project-id>.supabase.co
SUPABASE_ANON_KEY=<your-publishable-anon-key>
# 可至 Supabase Dashboard > Settings > API > JWT Settings 中複製 JWT Secret
# 後端解密前端傳來的 Bearer JWT 時必需使用此 Secret
SUPABASE_JWT_SECRET=<your-supabase-jwt-secret>

# ─── App 運行環境 ────────────────────────────────────────────────────────────
APP_ENV=development
# CORS 跨來源白名單，有多個時以逗號分隔
APP_CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
FRONTEND_URL=http://localhost:3000
```

---

## 四、 後端 API 架構設計

後端採用 **FastAPI + SQLAlchemy 2.0 (Async)** 實作，並劃分成三個主模組：

### 1. 認證模組 (`app.auth`)

* `POST /api/v1/auth/profile/setup`：首次登入/註冊後的帳號初始化（冪等性）。若 `profiles` 尚無當前 UUID 的資料，會隨機生成 4 碼的大寫字母/數字後綴（例如 `NEKO-F8A2`）作為 `friend_code` 寫入資料庫。
* `GET /api/v1/auth/me`：回傳目前登入者的 Profile。

### 2. 使用者與好友模組 (`app.users`)

* `GET /api/v1/users/me/profile`：獲取當前使用者的詳細 Profile。
* `PATCH /api/v1/users/me/profile`：變更使用者暱稱 (username)、頭像 (avatar)、個人簡介 (bio)。
* `GET /api/v1/users/search?friend_code=...`：以好友代碼搜尋其他飼主，會回傳該使用者是否已是好友或處於邀請狀態。
* `GET /api/v1/users/me/friends`：列出所有已同意 (accepted) 的好友。
* `GET /api/v1/users/me/friends/pending`：列出所有發送給當前使用者的待處理 (pending) 好友邀請。
* `POST /api/v1/users/me/friends`：透過指定的好友碼發送好友申請。
* `PATCH /api/v1/users/me/friends/{friendship_id}`：回覆（`accept` 或 `decline`）某個好友申請。
* `DELETE /api/v1/users/me/friends/{friend_id}`：解除雙方好友關係。

### 3. 寵物養成模組 (`app.pets`)

* `POST /api/v1/pets`：新增寵物（類型限 cat/dog，顏色 6 選 1）。限制一帳號僅能養一隻。
* `GET /api/v1/pets/me`：獲取當前飼主的寵物資料。
* `PUT /api/v1/pets/me`：將前端最新的狀態數值同步至資料庫。
* `GET /api/v1/pets/leaderboard`：獲取健康分前 50 名的寵物列表，並一併查詢其擁有者的 username。
* `GET /api/v1/pets/{pet_id}`：獲取特定寵物（需為本人或已建立好友關係）。

---

## 五、 前端修改說明

前端變更主要涵蓋了認證 UI 擴充、向後端發送請求的封裝，以及新增個人檔案與好友管理的設定頁面：

### 1. HTTP 溝通機制封裝

* 檔案：[src/lib/nekoRepository.ts](file:///Users/cfh00903977/Project/pet-app/src/lib/nekoRepository.ts)
* 重構了 `apiFetch` 輔助函式。在呼叫後端 API 前，會自動透過 Supabase 的 `getSession()` 取得 JWT Token，並主動於 Header 加上 `Authorization: Bearer <token>`。
* 將 `loadCurrentNekoData` 與 `saveCurrentNekoData` 等核心讀寫方法，由原先直連 Supabase Client DB Upsert 改為呼叫 FastAPI 的 `/pets/me` 與 `/pets`。

### 2. 登入與註冊頁面 ([src/app/login/page.tsx](file:///Users/cfh00903977/Project/pet-app/src/app/login/page.tsx))

* 重新設計為 Tab 切換介面（「登入」與「註冊」）。
* **註冊 Tab**：新增「飼主名稱」、「電子信箱」、「密碼」、「確認密碼」的輸入欄位，防呆機制包含確認密碼一致性等。
* 成功註冊或登入後，會自動在 Promise 鏈中呼叫一次後端的 `setup_profile` 進行 DB 初始化。

### 3. 忘記密碼與密碼重設 ([src/app/forgot-password/page.tsx](file:///Users/cfh00903977/Project/pet-app/src/app/forgot-password/page.tsx) / [src/app/reset-password/page.tsx](file:///Users/cfh00903977/Project/pet-app/src/app/reset-password/page.tsx))

* 提供完整信箱重設連結發送，以及點擊信箱連結跳轉後進行新密碼設定的 UI 流程。
  Note : 現在無法使用寄信功能重置密碼，原本已經寫好用 resend 的 api 寄信，但 resend 要求前端要認證網域，現在暫時無法。

### 4. 設定與好友管理頁面 ([src/app/settings/page.tsx](file:///Users/cfh00903977/Project/pet-app/src/app/settings/page.tsx))

* 新創的完整操作頁面。功能包括：
  * 檢視目前使用者名稱、頭像、個人簡介，以及專屬的好友碼。
  * 提供「編輯個人檔案」的 Dialog 互動，允許自訂簡介與挑選像素頭像。
  * 好友系統控制台：
    * **好友碼搜尋區**：搜尋別人的代碼後可直接點擊發送邀請。
    * **好友邀請待處理區**：顯示傳入的申請，可點擊「接受」或「拒絕」。
    * **現有好友列表**：展示已確認的好友，並可一鍵解除好友。

### 5. 導覽與圖標擴充

* [BottomNav.tsx](file:///Users/cfh00903977/Project/pet-app/src/components/BottomNav.tsx)：將下方的 Navigation Tab 從 2 個擴充為 3 個（首頁、排行、設置），並修改了 grid 版面。
* [PixelIcon.tsx](file:///Users/cfh00903977/Project/pet-app/src/components/PixelIcon.tsx)：新增 `user` 像素圖標，用於設定頁面按鈕。
* [index.ts](file:///Users/cfh00903977/Project/pet-app/src/types/index.ts)：擴增 `PixelIconName` 類型支援 `"user"`。

### 6. 跳轉機制

* [rooms/[petId]/page.tsx](file:///Users/cfh00903977/Project/pet-app/src/app/rooms/[petId]/page.tsx) 與 [gacha/page.tsx](file:///Users/cfh00903977/Project/pet-app/src/app/gacha/page.tsx) 中加入登入重定向防護：當偵測到環境中已啟用雲端模式但目前為非登入狀態時，會自動引導使用者至 `/login` 進行認證。
* 調整 `/gacha` 生成新寵物時的初始 Hunger, Cleanliness, Mood 數值皆為 `100`（原本為較低的固定模擬數值）。

---

## 六、 接手啟動指南

如果要本地運行與開發此分支的功能，請依照以下順序配置與執行：

1. **Supabase 資料庫遷移（我已經建好了）**：
   確保 Supabase 已連線，並依序將 `supabase/migrations/` 下的 SQL 執行於你的資料庫。
2. **後端環境設定與啟動**：
   * 進入 `backend` 目錄。
   * 複製 `.env.example` 為 `.env`，並確保 `DATABASE_URL` 連線字串與 `SUPABASE_JWT_SECRET`（不可填錯，否則解密 token 會失敗）填寫正確。
   * 執行虛擬環境與啟動 FastAPI 服務：
     ```bash
     cd backend
     # 啟動後端伺服器 (若安裝了 uv 工具，亦可使用 uv run uvicorn ...)
     uvicorn app.main:app --reload
     ```
3. **前端環境設定與啟動**：
   * 在專案根目錄下，複製 `.env.example` 為 `.env.local`。
   * 填寫 Supabase 連線資訊與後端網址 `NEXT_PUBLIC_BACKEND_URL=http://localhost:8000`。
   * 啟動前端開發伺服器：
     ```bash
     npm run dev
     ```
4. **測試驗證重點**：
   * 點擊設定頁籤確認是否成功引導至 `/login`。
   * 註冊新帳密，並確認 Supabase 帳號生成時，`profiles` 表有沒有自動寫入對應的隨機 `friend_code`（可進 FastAPI 交互式文件 `http://localhost:8000/docs` 調用 `/auth/me` 查看）。
   * 編輯個人檔案（更換頭像與 bio），重開頁面確認狀態維持。
   * 同時註冊兩個帳號，測試「以好友碼搜尋」、「發送邀請」、「另一個帳號接受邀請」、「雙方出現在彼此的好友名單中」以及最後的「解除好友」之完整生命週期。
