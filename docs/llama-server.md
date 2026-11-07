# Optional local Gemma with llama-server

Set one switch in `.env` for either development or production Compose:

```env
CHATBOT_ENABLED=false
LLAMA_BASE_URL=http://llama-server:8080/v1
QDRANT_URL=http://qdrant:6333
LLAMA_MODEL=gemma-4-e2b-it-qat
LLAMA_TIMEOUT_MS=180000
```

Run `yarn docker:dev` or `yarn docker:prod`. With `CHATBOT_ENABLED=false`
(the default), chatbot endpoints/jobs are disabled and neither Qdrant nor
llama-server starts. Health and readiness checks skip Qdrant. These commands also
stop existing AI services when switching off, without deleting cached models or
indexed courses. Set `CHATBOT_ENABLED=true` and rerun the
same command to start both AI services and enable the API.

The launcher reads `.env`, respecting exported environment overrides, and selects
the Compose `chatbot` profile from this switch. No second enable flag is needed.
Use `yarn docker:dev:down` to stop the stack, including inference, regardless of
the current switch. Direct `docker compose` commands do not run the launcher:
without `--profile chatbot`, they do not start AI services even if the switch is
true. Requires Docker Compose 2.20 or later for optional dependencies.

`LLAMA_BASE_URL` is passed through to both backend containers. For a backend
running on the host, set it to `http://localhost:8080/v1` and set
`QDRANT_URL=http://localhost:6333` instead. The host backend
does not manage Docker; start inference with
`node scripts/compose.cjs dev up -d qdrant llama-server` only when the switch is true.

The official pinned `ghcr.io/ggml-org/llama.cpp:server` CPU image serves
`gemma-4-e2b-it-qat` through an OpenAI-compatible API. First startup downloads
about 3.35 GB into the persistent `llama-models` volume. No inference requests
leave the machine. The host API binds only to `127.0.0.1:8080`; containers use
`http://llama-server:8080/v1`. Context is 8192 tokens, with one generation slot
and reasoning disabled. `--no-mmproj` skips the multimodal projector download.

Recommendations use `GET /api/chatbot/recommend/stream`. Requests queue at the
single inference slot; the 180-second provider timeout includes that wait.
Client disconnects abort inference. There is no fixed admission limit, and local
burst results are not a production capacity guarantee. The frontend does not
automatically reconnect or repeat inference after errors.
