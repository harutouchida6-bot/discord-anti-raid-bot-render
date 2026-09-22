# Discord 荒らし対策BOT

短時間の大量メッセージ、同一内容の連投、大量URL投稿を検知し、対象ユーザーを10分タイムアウトします。
管理者・モデレーターは監視対象外です。

Render設定:
- Root Directory: 空欄
- Build Command: npm install
- Start Command: node src/index.js
- 環境変数: DISCORD_TOKEN / CLIENT_ID / LOG_CHANNEL_ID（任意）

Discord Developer Portalで Message Content Intent と Server Members Intent を有効にしてください。
