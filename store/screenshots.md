# Update the screenshots

How to make new images for the Chrome Web Store (`store/*.png`) and the README (`docs/screenshot.jpg`).

There are two steps:

1. Take raw screenshots of the extension in a headless browser.
2. Put each raw screenshot in a frame with a heading (`tools/compose.html`), then take a screenshot of that page.

The `store/tools/` folder has the frame page and small scripts that click in the extension UI. Raw screenshots go to `store/tools/shots/` and frame output goes to `store/tools/out/`. Git ignores both folders.

## 1. Start the browser

Follow "Testing the extension in a browser" in `AGENTS.md`: download Chrome for Testing to a temp folder, run `bun run build`, then open the browser headless with the session name `lm`:

```sh
CFT="<temp>/cft/chrome/<version>/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing"
agent-browser --session lm --executable-path "$CFT" --extension "$PWD/dist" \
  --args "--headless=new,--disable-blink-features=AutomationControlled,--lang=en-US" \
  --user-agent "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/155.0.0.0 Safari/537.36" \
  open chrome://extensions
agent-browser --session lm eval "chrome.management.getAll().then(a=>a.map(e=>e.id+' '+e.name).join(';'))"
```

The app page screenshots use a 1280×790 viewport at 2× scale (2560×1580 px). The YouTube shot uses 1600×988 at 1.6× (also 2560×1580 px), see step 3.

```sh
agent-browser --session lm set viewport 1280 790 2
```

## 2. Set the settings

The profile is new each time. On an app page (not `#/settings`, it can write its own state back), set German as the study language, DeepSeek as the AI provider, level 3000, and pin the German channels:

```sh
E=<extension id>
agent-browser --session lm open "chrome-extension://$E/src/app/index.html#/media"
agent-browser --session lm eval "chrome.storage.local.get('settings').then(({settings}) => chrome.storage.local.set({settings: {...(settings||{}), studyLang:'de', nativeLang:'en', provider: 'deepseek', deepseekKey: '$(tr -d '[:space:]' < TOKEN_DEEPSEEK)', vocabLevels: {de: 3000}, hideShorts: true, pinnedChannels: ['UCbxb2fqe9oNgglAoYqsYOtQ','UCMIgOXM2JEQ2Pv2d0_PVfcg','UCIofxT-750lLxxdA5xSTafw','UCXntXBt2YKBO1xDni0EgjXA','UCsxqCqZHE6guBCdSUEWpPsg','UC5ZnpdkQIit8TWhGVDiDnQQ','UCwRH985XgMYXQ6NxXDo8npw','UCZHpIFMfoJJ_1QxNGLJTzyA','UCA3mpqm67CpJ13YfA8qAnow','UCyHDQ5C6z1NDmJ4g6SerW8g','UCLLibJTCy3sXjHLVaDimnpQ','UCLoWcRy-ZjA-Erh0p_VDLjQ','UC1XrG1M_hw8103zO2x-oivg','UC5NOEUbkLheQcaaRldYW5GA']}})).then(() => 'ok')"
```

## 3. YouTube screenshot (`shots/yt.png`)

The video is "Dein Hirn macht dich jeden Tag 2 Stunden blind" (Dinge Erklärt – Kurzgesagt). The line is "Du nimmst sie aber nicht getrennt, sondern gleichzeitig als zusammenhängenden Moment" at 129.3 s. The word is "nimmst": its popup has an **Expression** block (wahrnehmen – to perceive).

The Expression block makes the popup about 390 px tall. In a 1280×790 window it does not fit above or below the subtitle bar (it goes under the YouTube header or under the page below the video). So this shot uses a bigger window with the same shape. It gives the same 2560×1580 px image:

```sh
agent-browser --session lm set viewport 1600 988 1.6
```

1. Open `https://www.youtube.com/watch?v=ICFZy5JN0yM`. Wait about 12 s, then take a test screenshot. If the cookie banner shows, click "Reject the use of cookies and other data for the purposes described" (find the ref with `snapshot -i`) and open the video again.
2. Wait until the ad is done. This loop mutes the video, skips the ad, and stops on the main video:

   ```sh
   for i in $(seq 1 25); do r=$(agent-browser --session lm eval "(()=>{const p=document.querySelector('#movie_player');const v=document.querySelector('video');if(!p||!v)return 'none';v.muted=true;if(v.paused)v.play().catch(()=>{});document.querySelector('.ytp-skip-ad-button, .ytp-ad-skip-button-modern')?.click();return p.classList.contains('ad-showing')?'AD':'MAIN'})()"); echo "$r"; case "$r" in *MAIN*) break;; esac; sleep 3; done
   ```

3. Mark words so the subtitles show the word colors and the saved page has rows. Each call opens the word popup from the side panel, waits for the AI meaning, and clicks the button:

   ```sh
   T=store/tools
   for w in "nimmst Learn" "getrennt Learn" "gleichzeitig Known" "zusammenhängenden Learn" "verarbeiten Learn" "Gegenwart Learn" "Reize Learn" "Wärme Known" "Finger Known" "Vergangenheit Learn" "Verspätung Learn" "Moment Known" "Dunkelheit Learn" "Löffel Learn" "Milch Known" "Kaffee Known"; do bash $T/mark.sh $w; done
   agent-browser --session lm eval "$(cat $T/close-popup.js)"   # Escape does not close the popup
   ```

4. Go to the line, hide the player controls, save the sentence, open the popup, and scroll the side panel:

   ```sh
   agent-browser --session lm eval "window.__lmT=129.3; window.__lmWord='nimmst'"
   agent-browser --session lm eval "$(cat $T/clean.js)"; sleep 3
   agent-browser --session lm eval "$(cat $T/save-sentence.js)"   # must return ★
   agent-browser --session lm eval "$(cat $T/word.js)"; sleep 8   # "no word" → wait and run again
   agent-browser --session lm eval "$(cat $T/current.js)"; sleep 2
   agent-browser --session lm eval "$(cat $T/scroll-panel.js)"; sleep 2
   agent-browser --session lm screenshot $T/shots/yt.png
   sips -g pixelHeight $T/shots/yt.png   # 1581 → crop: sips --cropOffset 0 0 -c 1580 2560 $T/shots/yt.png
   agent-browser --session lm set viewport 1280 790 2   # back to the size for the app pages
   ```

Check: the popup is above the bar and fully inside the video, it shows the meaning, the Expression block, the examples and the buttons. The bar star is yellow, and the current line is at the top of the side panel.

To use a different word, first check that the AI gives it an Expression. This clicks the word in the side panel and prints the Expression block or `none`. The AI decides this from the sentence, so not every verb gets one (for example "fühlt" gave the wrong "sich fühlen"):

```sh
check() { agent-browser --session lm eval "window.__lmWord='$1'" >/dev/null; agent-browser --session lm eval "$(cat $T/click-word.js)" >/dev/null; for i in $(seq 1 30); do sleep 1; r=$(agent-browser --session lm eval "(()=>{const roots=[...document.querySelectorAll('lingomingo-root')].map(h=>h.shadowRoot);if(roots.some(r=>r.querySelector('.animate-pulse')))return 'loading';const e=roots.flatMap(r=>[...r.querySelectorAll('div')]).find(d=>d.textContent==='Expression');return e?e.parentElement.innerText.replace(/\n/g,' | '):'none'})()"); [ "$r" != '"loading"' ] && break; done; echo "$1 → $r"; agent-browser --session lm eval "$(cat $T/close-popup.js)" >/dev/null; }
for w in nimmst hältst trifft; do check $w; done
```

`click-word.js` and `mark.sh` click the first match in the side panel, so a word that is in many lines can test a different line.

## 4. App page screenshots

```sh
agent-browser --session lm open "chrome-extension://$E/src/app/index.html#/saved-items"; sleep 3
agent-browser --session lm screenshot $T/shots/saved.png
agent-browser --session lm open "chrome-extension://$E/src/app/index.html#/review"; sleep 3
agent-browser --session lm press Space; sleep 2          # show the answer side of the card
agent-browser --session lm screenshot $T/shots/review.png
agent-browser --session lm open "chrome-extension://$E/src/app/index.html#/settings"; sleep 3
# click the "Change level" button (ref from snapshot -i)
agent-browser --session lm screenshot $T/shots/vocab.png
agent-browser --session lm open "chrome-extension://$E/src/app/index.html#/media"; sleep 4
# click the "Dinge Erklärt – Kurzgesagt" channel button (ref from snapshot -i)
```

For the media page, wait until the thumbnails and the red "CC" badges show (up to 60 s; badges load a few at a time) before `screenshot $T/shots/media.png`. Use Dinge Erklärt: its videos have human-made German subtitles, so the badges match the heading. Other channels can show only "Auto CC".

## 5. Make the frames

Headings and captions are in `store/tools/compose.html`. Change them there if the UI changes (for example, a new button).

```sh
C=$PWD/store/tools; mkdir -p $C/out
shoot() { agent-browser --session lm set viewport $2 $3 1 >/dev/null; agent-browser --session lm open "about:blank" >/dev/null; agent-browser --session lm open "file://$C/compose.html#$1" >/dev/null; sleep 3; agent-browser --session lm screenshot $4 >/dev/null; }
for n in 1 2 3 4 5; do shoot $n 1280 800 $C/out/screenshot-$n.png; done
shoot small 440 280 $C/out/promo-small-440x280.png
shoot marquee 1400 560 $C/out/promo-marquee-1400x560.png
cp $C/out/*.png store/
sips -s format jpeg -s formatOptions 82 $C/shots/yt.png --out docs/screenshot.jpg
agent-browser --session lm close
```

Look at each output image before you commit. The store needs 24-bit PNG (no alpha); `file store/*.png` must say `8-bit/color RGB`.

## Known issues

- In headless mode the settings dialog backdrop stops about 16 px above the bottom edge, so a thin strip at the bottom of `vocab.png` is not dimmed. The frame makes it small, so we keep it.
- The word popup has no height limit and does not move to stay in view. When it is taller than the room above or below the word, it goes under the YouTube header, or the page below the video (title, description) draws over it. This is why the YouTube shot uses a bigger window.
