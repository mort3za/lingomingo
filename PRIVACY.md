# Privacy policy

Last change: 2026-11-11

LingoMingo is a free, open source Chrome extension to learn languages with YouTube. This page tells you which data the extension uses, where the data goes, and how to remove it.

## Summary

- LingoMingo has **no server**. The developer does not get, see or keep your data.
- LingoMingo has **no analytics, no tracking, no ads and no cookies**.
- Your data stays **in your browser**. It goes out only to YouTube, to the AI provider that you select, and, when you turn them on, to Chrome sync and to your own Google Drive.
- LingoMingo does **not sell** your data, and does not use it for a purpose other than the features on this page. The use of data follows the [Chrome Web Store User Data Policy](https://developer.chrome.com/docs/webstore/program-policies/user-data-faq), including the Limited Use requirements.

## Data in your browser

LingoMingo keeps this data in the extension storage of Chrome (`chrome.storage.local`), on your computer only:

| Data                                                                                        | Kept for                |
| ------------------------------------------------------------------------------------------- | ----------------------- |
| Settings: languages, vocabulary level, provider and model                                   | Until you change them   |
| API keys of AI providers                                                                    | Until you remove them   |
| Saved words and phrases, learning stages, review data                                       | Until you delete them   |
| Copies of subtitles and AI translations                                                     | 7 days                  |
| Copies of channel photos and video subtitle lists                                           | Some days, then renewed |
| IDs of deleted saved items, so a sync does not bring them back                              | 1 year                  |
| Google Drive sync state: file ID, last sync time, the e-mail address of your Google account | Until you disconnect    |

The Google access token of the Drive sync is kept in `chrome.storage.session`. Chrome deletes it when the browser closes.

When you remove the extension, Chrome deletes all of this data. Data in your Google Drive stays there (see below).

When you export your saved items (for example as a CSV file) or download a backup file, LingoMingo writes a file on your computer. You decide what to do with this file.

## Sync and backup

### Backup file

In Settings > Backup and sync, you can download a backup file and restore it. The file has your saved items, their review data, and your settings. API keys are in the file only when "Sync API keys too" is on. LingoMingo does not send the file anywhere.

### Chrome sync

LingoMingo keeps a copy of your settings in `chrome.storage.sync`. When Chrome sync is on, Chrome syncs this copy between the Chrome browsers of your Google account. API keys are in this copy only when "Sync API keys too" is on. Chrome deletes this copy when you remove the extension. Other browsers (for example Brave) keep it on your computer. The [Google privacy policy](https://policies.google.com/privacy) applies.

### Google Drive sync (optional)

The Drive sync is off until you click "Connect Google Drive" and sign in with Google. Then LingoMingo keeps one file in the hidden app data folder of **your own** Google Drive. The file has:

- Your saved words and phrases, their learning stages and review data.
- The IDs of saved items that you deleted, for 1 year.
- Your settings. API keys only when "Sync API keys too" is on.

What LingoMingo gets from your Google account:

- Access to its own app data folder only (scope `https://www.googleapis.com/auth/drive.appdata`). LingoMingo cannot see, read or change your other Drive files.
- The e-mail address of the account, from the Drive API. LingoMingo uses it only to renew the sign-in without a window, when your browser has more than one Google account. It stays in your browser.

The data goes **directly from your browser** to Google (`accounts.google.com`, `www.googleapis.com`). The developer does not get it. LingoMingo uses the data only to sync your saved items and settings between your browsers. It does not show ads, does not sell the data, and does not give it to other people or apps. No person reads it.

LingoMingo's use and transfer to any other app of information received from Google APIs will adhere to the [Google API Services User Data Policy](https://developers.google.com/terms/api-services-user-data-policy), including the Limited Use requirements.

To stop the sync and remove the data:

1. In Settings > Backup and sync, click "Disconnect". LingoMingo stops the sync and cancels its access token.
2. To delete the file: in Google Drive on the web, open Settings > Manage apps > LingoMingo > Options > "Delete hidden app data".
3. To remove the access of LingoMingo to your account: open <https://myaccount.google.com/connections> and remove LingoMingo.

## Data sent to other services

### YouTube (Google)

On YouTube pages, LingoMingo downloads the subtitles of the video that you watch. On the Media page, it downloads channel feeds, channel pages, video pages, thumbnail images and channel photos from `youtube.com` and the YouTube image servers (`i.ytimg.com`, `yt3.googleusercontent.com`). YouTube gets your IP address with these requests, like a usual visit to YouTube. When LingoMingo downloads subtitles on a YouTube page, the request includes your YouTube cookies, like YouTube's own player does.

The [Google privacy policy](https://policies.google.com/privacy) applies.

### Your AI provider (optional)

AI translation is off until you add an API key or a local model. When it is on, LingoMingo sends this data **directly from your browser** to the provider that you select, with your API key:

- Subtitle lines of the video, when YouTube has no human-made subtitles in your language.
- The word that you open in the word popup, and its sentence.
- On the Review page: your words in the Learning stage and their sentences, to get missing translations and example sentences.
- On the Saved items page: the saved word that you open, and its sentence, for the same reason. Also when you ask for more examples.
- Your study language and translation language.

LingoMingo does not send your name, e-mail, browser history or other pages.

The privacy policy of your provider applies:

- Claude (Anthropic): <https://www.anthropic.com/legal/privacy>
- OpenAI: <https://openai.com/policies/privacy-policy>
- xAI (Grok): <https://x.ai/legal/privacy-policy>
- DeepSeek: <https://cdn.deepseek.com/policies/en-US/deepseek-privacy-policy.html>
- Google Gemini: <https://policies.google.com/privacy> and <https://ai.google.dev/gemini-api/terms>. On the free tier, Google uses your requests to improve its products, and people at Google can read them.
- OpenRouter: <https://openrouter.ai/privacy>. OpenRouter sends your requests to the company that runs the model. Free models can keep your requests and use them for training.

With a local model (Ollama, llama.cpp, LM Studio), the data goes to the address that you set, usually your own computer.

## Permissions

| Permission                                                                                                                  | Why                                                |
| --------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| `storage`, `unlimitedStorage`                                                                                               | Keep settings, saved items and cached translations |
| `youtube.com`                                                                                                               | Show subtitles and the word popup on videos        |
| `api.anthropic.com`, `api.openai.com`, `api.x.ai`, `api.deepseek.com`, `generativelanguage.googleapis.com`, `openrouter.ai` | Call the AI provider that you select               |
| `localhost`, `127.0.0.1`                                                                                                    | Call a local AI model on your computer             |
| `identity`                                                                                                                  | Sign in with Google for the Drive sync             |
| `alarms`                                                                                                                    | Run the Drive sync at intervals                    |

## Remote code

LingoMingo runs only the code in its package. It does not download or run code from the internet. It downloads only data: subtitles, feeds, images and AI answers (text).

## Children

LingoMingo is not made for children under 13. It does not knowingly collect data from children.

## Changes

Changes to this policy are in this file. See its history on [GitHub](https://github.com/mort3za/lingomingo/commits/main/PRIVACY.md).

## Contact

Questions: open an issue on [GitHub](https://github.com/mort3za/lingomingo/issues).
