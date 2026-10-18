# usage: mark.sh word button
S=$(dirname "$0")
agent-browser --session lm eval "window.__lmWord='$1'; window.__lmBtn='$2'" >/dev/null
r=$(agent-browser --session lm eval "$(cat $S/click-word.js)")
[ "$r" != '"clicked"' ] && { echo "$1 $r"; exit; }
for i in $(seq 1 40); do sleep 1; r=$(agent-browser --session lm eval "$(cat $S/click-btn.js)"); [ "$r" = '"ok"' ] && break; done
echo "$1 $r"
