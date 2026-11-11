# Google Drive sync: setup

The saved items sync through one file (`lingomingo-sync.json`) in the hidden app folder of the
user's Google Drive (scope `drive.appdata`). The app cannot see other Drive files. Sign-in uses
`chrome.identity.launchWebAuthFlow`, so it works in Chrome and Brave. The code is in
`src/background/drive-sync.ts`.

The Drive part of Settings shows only when `GOOGLE_CLIENT_ID` in `src/shared/drive.ts` is set.

## Make the OAuth client

1. Open <https://console.cloud.google.com/> and make a project (for example "LingoMingo").
2. APIs & Services > Library: turn on **Google Drive API**.
3. Google Auth Platform > Branding: app name "LingoMingo", support email, app logo (optional).
4. Audience: **External**. While the app is in "Testing", only test users can sign in (100 at
   most): add your Google accounts there. To let all users sign in, click **Publish app**.
5. Data access > Add or remove scopes: add `https://www.googleapis.com/auth/drive.appdata`.
   The console shows if the scope is "sensitive". A sensitive scope needs Google's verification
   before the app is published.
6. Clients > Create client > type **Web application**. Under "Authorized redirect URIs" add:
   - Store build: `https://ecodbdmdfdpodfiifnacmnahkdaijkln.chromiumapp.org/`
   - Unpacked build: `https://<unpacked-id>.chromiumapp.org/`. The ID is on
     `chrome://extensions`. It is different for each folder you load from. On the app page you can
     also run `chrome.identity.getRedirectURL()` in the DevTools console.
7. Copy the **Client ID** (`….apps.googleusercontent.com`) into `GOOGLE_CLIENT_ID`. It is not a
   secret. The app does not use the client secret.

## Test

1. `bun run build`, load `dist/` in Chrome and in Brave.
2. Settings > Backup and sync > **Connect Google Drive** in both.
3. Save a word in one browser. After about 30 seconds (or **Sync now** in the other browser),
   it is in the other browser. Then delete it, and check that the delete syncs too.
4. Brave: if no Google window opens, check `brave://settings/extensions` > "Allow Google login
   for extensions".

## How the sync works

- A change to the saved items starts a sync after 30 seconds. A sync also runs every 15 minutes,
  at browser start, and on **Sync now**.
- Per item, the newer `updatedAt` wins. A delete is kept as a tombstone (`deletedItems`) for one
  year, so another device does not bring the item back.
- The access token lasts one hour and is in `chrome.storage.session`. A new token comes without a
  window while the user is signed in to Google in that browser. Otherwise Settings shows
  "Sign in again".
