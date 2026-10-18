#!/usr/bin/env bash
# Starts llama-server with Gemma 4 26B-A4B (Q4_K_M) for the "Local model" provider. It uses the
# gemma4:26b file of Ollama when there is one, so nothing is downloaded again. Else it downloads
# the model from Hugging Face once (about 17 GB).
# Thinking is off: short translations do not need it. One slot: the extension sends one request
# at a time to a local model.
# In Settings, pick "Local model", address http://localhost:8080/v1, model gemma4.
# Run: bun run llama
set -euo pipefail

if ! command -v llama-server >/dev/null; then
  echo "llama-server is not installed. Install llama.cpp: brew install llama.cpp" >&2
  echo "(other systems: https://github.com/ggml-org/llama.cpp#quick-start)" >&2
  exit 1
fi

# The same quantization as Ollama: Q4_K_M with an importance matrix. No vision part.
model=(-hf bartowski/google_gemma-4-26B-A4B-it-GGUF:Q4_K_M --no-mmproj)

# Model folders of Ollama: user install, Linux service install.
for dir in ${OLLAMA_MODELS:+"$OLLAMA_MODELS"} "$HOME/.ollama/models" /usr/share/ollama/.ollama/models; do
  manifest="$dir/manifests/registry.ollama.ai/library/gemma4/26b"
  [ -f "$manifest" ] || continue
  # The model file name changes with each pull: read it from the manifest.
  digest=$(bun -e '
    const m = await Bun.file(process.argv[1]).json()
    console.log(m.layers.find((l) => l.mediaType === "application/vnd.ollama.image.model").digest)
  ' "$manifest")
  model=(-m "$dir/blobs/${digest/:/-}")
  break
done

exec llama-server "${model[@]}" --alias gemma4 --port 8080 -c 8192 -np 1 --reasoning off
