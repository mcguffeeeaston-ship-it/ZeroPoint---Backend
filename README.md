# ZeroPoint by Nyxa

![Banner](https://media.discordapp.net/attachments/1554638209974018068/1565867939456880820/image.png?ex=6ae677a9&is=6ae52629&hm=39e4b12de39f1e514f42713fcc144efa24fb9ac1db112537ec857170313e03a7&=&format=webp&quality=lossless&width=1440&height=778)

[![Maintained with Bun](https://img.shields.io/badge/maintained%20with-bun-ac98ff.svg?style=for-the-badge&logo=bun)](https://bun.sh/)

**ZeroPoint by Nyxa** is a universal open-source Fortnite backend written in TypeScript powered by **Bun**, **Hono**, and **MongoDB**. Designed to default to **Season 9** with support for both Chapter 1 and Chapter 2.

---

## Features

- [x] **Matchmaking Engine**: Queue simulation (Connecting -> Waiting -> Queued -> SessionAssignment -> Join)
- [x] **XMPP Broker**: Full XMPP protocol over WebSocket with SASL PLAIN, bind, session, whispers, party invites, and presence syncing
- [x] **Dual-Port Support**: Primary port (3551) with automatic dedicated port 80 XMPP binding
- [x] **ZeroPoint MCP Operations**:
  - `QueryProfile` (Athena, Common Core, Campaign, Creative, Metadata)
  - `ClientQuestLogin` (Daily quest login & seasonal progress)
  - `EquipBattleRoyaleCustomization` & `SetCosmeticLockerSlot` (Full cosmetics & variant support)
  - `SetBattleRoyaleBanner` (Banner icon and color customizing)
  - `SetItemFavoriteStatus` & `SetItemFavoriteStatusBatch`
  - `MarkItemSeen`
  - `PurchaseCatalogEntry` (Storefront and Battle Pass purchasing)
  - `ClaimMfaEnabled` (Boogie Down reward & V-Bucks)
  - `GiftCatalogEntry` & `RemoveGiftBox` (Gifting items to friends)
  - `BulkEquipBattleRoyaleCustomization`
  - `SetMtxPlatform`
- [x] **Cosmetics & Locker**: Instant unlock for all skins, pickaxes, gliders, emotes, wraps, and music packs
- [x] **Storefront & Catalog**: Dynamic seasonal catalogs with default Season 9 storefronts and MTX currency store
- [x] **Timeline & Calendar**: Season 9 event flags, shop countdowns, and active events
- [x] **Cloud Storage**: System INI configs branded with ZeroPoint by Nyxa (`DefaultEngine.ini`, `DefaultGame.ini`, `DefaultRuntimeOptions.ini`)
- [x] **Saving ClientSettings**: Cloud save & load for user `ClientSettings.Sav`
- [x] **Party System**: Full support for both Party V1 and Party V2
- [x] **Friends System**: Live friend requests, mutual acceptance, deletion, and presence
- [x] **Hardware Banning (HWID)**: Ban check and hardware identification
- [x] **Save The World (STW)**: Campaign profile, daily rewards, card packs, and founder items
- [x] **Competitive Arena**: Leaderboards, holds, and tournament endpoints
- [x] **Frictionless Auth**: Automatic account creation on first login

---

## Requirements

- [**Bun**](https://bun.sh) (v1.0+)
- [**MongoDB**](https://www.mongodb.com/try/download/community)

---

## Quick Start

1. **Install dependencies**:
   Run `install-packages.bat` or:
   ```cmd
   bun install
   ```

2. **Configure environment** (`.env`):
   ```env
   PORT=3551
   WS_PORT=80
   MONGODB=mongodb://127.0.0.1:27017/zeropoint
   JWT_SECRET=zeropoint-by-nyxa-secure-auth-secret-key-1337
   SEASON=9
   GRANT_ALL_COSMETICS=true
   DEFAULT_VBUCKS=999999
   GAMESERVER_IP=127.0.0.1
   GAMESERVER_PORT=7777
   ```

3. **Start the backend**:
   Run `start.bat` or:
   ```cmd
   bun src/index.ts
   ```
