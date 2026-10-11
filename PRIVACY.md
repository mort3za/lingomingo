# Privacy policy

Last change: 2026-10-11

LingoMingo is a free, open source Chrome extension to learn languages with YouTube. This page tells you which data the extension uses, where the data goes, and how to remove it.

## Summary

- LingoMingo has **no server**. The developer does not get, see or keep your data.
- LingoMingo has **no analytics, no tracking, no ads and no cookies**.
- Your data stays **in your browser**. It goes out only to YouTube and to the AI provider that you select.
- LingoMingo does **not sell** your data, and does not use it for a purpose other than the features on this page. The use of data follows the [Chrome Web Store User Data Policy](https://developer.chrome.com/docs/webstore/program-policies/user-data-faq), including the Limited Use requirements.

## Data in your browser

LingoMingo keeps this data in the extension storage of Chrome (`chrome.storage.local`), on your computer only:

| Data                                                      | Kept for                |
| --------------------------------------------------------- | ----------------------- |
| Settings: languages, vocabulary level, provider and model | Until you change them   |
| API keys of AI providers                                  | Until you remove them   |
| Saved words and phrases, learning stages, review data     | Until you delete them   |
| Copies of subtitles and AI translations                   | 7 days                  |
| Copies of channel photos and video subtitle lists         | Some days, then renewed |

The data is not synced to other devices. When you remove the extension, Chrome deletes all of it.

When you export your saved items (for example as a CSV file), LingoMingo writes a file on your computer. You decide what to do with this file.

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

## Remote code

LingoMingo runs only the code in its package. It does not download or run code from the internet. It downloads only data: subtitles, feeds, images and AI answers (text).

## Children

LingoMingo is not made for children under 13. It does not knowingly collect data from children.

## Changes

Changes to this policy are in this file. See its history on [GitHub](https://github.com/mort3za/lingomingo/commits/main/PRIVACY.md).

## Contact

Questions: open an issue on [GitHub](https://github.com/mort3za/lingomingo/issues).
