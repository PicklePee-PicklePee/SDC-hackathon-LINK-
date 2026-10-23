# Connect RunPod GPU compute to Link

## Current setup: custom Serverless worker

The selected setup is a **custom queue-based Serverless worker** supporting indexing, retrieval, cited chat, and LoRA training. The Ollama template is an inference worker, not a replacement for this API. The regular-Pod instructions below remain available for legacy installations.

The Serverless integration is prepared in this repository but has **not been built on RunPod or GPU-tested**. No billable requests have been submitted by the app builder.

### 1. Build the custom worker image

Do not upload application secrets, company documents, or the whole Replit workspace into an image. Two build layouts are supported: the `runpod/` directory as a standalone context, or the existing application repository with the root-level `Dockerfile.runpod` and its Dockerfile-specific allowlist.

**RunPod GitHub builder (no Docker installation needed):**

1. Use the repository containing `runpod/` (the builder uses the repository root as context; see the build-failure note below).
2. Connect that specific repository in RunPod Settings → Connections → GitHub.
3. Choose Serverless → New Endpoint → Import Git Repository. Select the repository and its branch, with Dockerfile Path `Dockerfile`.
4. Select endpoint type **Queue**, not Load Balancer. This creates a new custom endpoint, not an Ollama template.

**Using an existing repository with a `runpod/` subdirectory:**

1. Keep the worker files inside `runpod/`. Add `Dockerfile.runpod` and `Dockerfile.runpod.dockerignore` at the repository root; do not overwrite another Dockerfile or the application's files.
2. In RunPod's GitHub import, select the repository and branch, then set **Dockerfile Path = `Dockerfile.runpod`**.
3. Both the Dockerfile and context are now at the repository root. The Dockerfile copies only the four required worker source/dependency files. Its adjacent, non-hidden `Dockerfile.runpod.dockerignore` excludes unrelated repository files from the build context.
4. Confirm both root-level files were uploaded before building. Merely selecting `runpod/Dockerfile` does not establish that a builder uses `runpod/` as the context.
5. A source scanner may warn that it cannot find `runpod.serverless.start()` despite the call being present in `runpod/handler.py`. Inspect the uploaded handler and build/worker logs; do not treat a source-scan warning or a successful image build as GPU verification.

**Observed build failure and workaround:** RunPod's builder log shows it runs `docker buildx build --file …/runpod/Dockerfile` with the **repository root** as the build context, so `COPY worker.py` failed (`"/worker.py": not found`). `runpod/Dockerfile` therefore copies nothing from the context: it fetches the four worker files from a pinned commit of the public repository and verifies their SHA-256 checksums. This requires a public repository. When any `runpod/` file changes, commit it, update `SRC_COMMIT` and the checksum ARGs in the Dockerfile, and rebuild.

Alternatively, build and push from an external machine with Docker using the `runpod/` directory as context:

    docker build --platform linux/amd64 -t YOUR_REGISTRY/link-worker:v1 runpod/
    docker push YOUR_REGISTRY/link-worker:v1

Then import that actual published image into RunPod. `YOUR_REGISTRY` is a placeholder, not a supplied image. No image has been built or pushed from this Replit workspace. Pin the resulting image digest after validation.

Official instructions: https://docs.runpod.io/serverless/workers/github-integration

### 2. Configure storage and compute deliberately

- Attach a **persistent network volume** mounted at `/runpod-volume`. The handler refuses to work without the mount. A temporary container directory is not sufficient.
- Set **maximum workers = 1**, **active/minimum workers = 0**, and handler concurrency = 1. The worker also uses a storage lock to reject overlapping operations. Do not enable concurrent processing or scale this initial design to multiple workers.
- Choose CUDA 12.4-compatible GPU hardware. The default small model reduces memory requirements, but actual model fit, training compatibility, and GPU capacity still need live validation.
- With the current CUDA 12.4 image, select **Previous generation** hardware if the console labels Latest generation as requiring CUDA 12.8 or newer. Do not select a newer GPU architecture merely because it has sufficient memory.
- The image defaults to `LINK_DATA_DIR=/runpod-volume/link-data`, `HF_HOME=/runpod-volume/huggingface`, and one synchronous handler. Optional `LINK_MODEL_ID` and `LINK_EMBED_MODEL` use the same defaults as the Pod below.
- Do not expose an HTTP port or set `RUNPOD_WORKER_TOKEN` for this handler. RunPod's queue API authenticates the server with a RunPod API key. FastAPI bearer authentication remains required if using the separate Pod HTTP mode.
- Review RunPod's build, storage, idle-worker, and GPU charges before creating infrastructure. Even with zero active workers, storage may be billed. Deployment/build steps may start test workers according to RunPod's settings.

The custom image handles requests itself; do not run `ollama serve` or Uvicorn as its start command.

### 3. Configure the application using the secure environment flow

- Non-secret `RUNPOD_WORKER_MODE=serverless`
- Non-secret `RUNPOD_WORKER_URL=https://api.runpod.ai/v2/YOUR_ENDPOINT_ID`
- Secret `RUNPOD_API_KEY`: a key with access to that endpoint, entered only in the secure secrets form.

The URL may also end with `/run` or `/runsync`; the server normalizes it. Never put an API key in a URL. A URL from the old Ollama endpoint will authenticate to RunPod, but will fail the custom Link protocol check when a worker request runs.

Restart the application after configuring these values. No `VITE_` keys are used. The API key remains server-side and is never returned by an application endpoint.

### 4. Verify in stages, with separate approval

1. Opening GPU control performs only `GET /health` against RunPod's API. **API REACHABLE is not GPU VERIFIED** and does not establish that the endpoint uses the custom image.
2. **Verify GPU (billable)** asks permission before submitting one diagnostic job. It checks the persistent mount, executes a CUDA kernel, and loads model configuration/tokenizer metadata. It reports real CUDA/PyTorch versions, GPU metrics where available, and model type. It does not download full model weights, index documents, or train; it cannot guarantee full model fit.
3. After explicit approval, use a small, synthetic workspace corpus for indexing. Verify real chunk counts and search results, then edit/delete a document and ensure the old revision no longer appears.
4. Test chat citations against current documents and a second workspace. Search and chat are also billable Serverless requests and can cold-start the worker.
5. Separately approve a pipeline run for two epochs of LoRA training. Record actual loss, epochs, elapsed time, GPU readings, and output/error status. Test a controlled training failure in an isolated endpoint/workspace, not by disrupting real user data.

Training/indexing use `/run` once and poll `/status/{id}`. Interactive diagnostics/search/chat also submit once, then poll, with bounded wait and best-effort cancellation on timeout. No submission is automatically retried. If a request times out before returning a job ID, inspect RunPod Requests before trying again; a job may have been accepted.

If polling an accepted interactive request fails, the server also attempts cancellation of that same job and includes its ID in the error. Cancellation is best-effort, not proof that compute stopped; if it cannot be confirmed, inspect RunPod Requests before another submission. With active workers set to zero, zero ready workers can be normal: the first approved diagnostic must allow a cold start rather than require an already-warm worker.

The handler publishes progress snapshots, persists job outcomes, and prevents re-executing a duplicate delivery of the same job ID. A fresh submission has a new ID and is a new billable job.

The app polls active jobs every 20 seconds even with no browser open, because RunPod retains async results for only 30 minutes. A prolonged application outage can still lose the provider's result window: such a job remains unresolved with an explicit telemetry error, rather than falsely reporting success or triggering a rerun. Inspect RunPod logs and persisted worker records before reconciling it.

Serverless `/run` payloads are limited to 10 MB including JSON; the application enforces a conservative 9.5 MB serialized job limit. The corpus and chunk limits listed below also apply.

## Legacy setup: regular GPU Pod

Set `RUNPOD_WORKER_MODE=pod` (or leave it unset) for this setup.

Link uses a regular GPU Pod, not a RunPod Serverless endpoint. No Pod changes or billable jobs have been started by the app builder.

## 1. Get access to your Pod

Use RunPod's Connect panel to open its terminal or configure SSH using a PUBLIC key. `ssh-keygen -t ed25519` creates a key pair; it is not a model worker. Keep the private key private. Never put either a private key or an API key in this app's chat.

## 2. Install the worker on the Pod

Copy the repository's `runpod/worker.py` and `runpod/requirements.txt` to the Pod. Use a persistent volume mounted at `/workspace` so jobs, vector indexes, and adapters survive process restarts.

In the Pod terminal:

    python -m pip install -r requirements.txt

Configure `RUNPOD_WORKER_TOKEN` as a strong random value (at least 32 characters) using the Pod's environment configuration. Use a password manager to generate it. Do not commit it to code or paste it into chat.

Optional Pod environment configuration:

- `LINK_DATA_DIR=/workspace/link-data`
- `LINK_MODEL_ID=Qwen/Qwen2.5-0.5B-Instruct` (default; a small instruction model)
- `LINK_EMBED_MODEL=sentence-transformers/all-MiniLM-L6-v2` (default)

The Pod must have a working CUDA-compatible PyTorch environment, outbound access to download these public models, sufficient disk, and enough available GPU memory. Model/GPU compatibility must be checked on your machine. This worker has not been executed against your Pod.

Start it on the Pod:

    python -m uvicorn worker:app --host 0.0.0.0 --port 8000 --workers 1

Use ONE worker process: jobs, GPU locks, and model state are coordinated in-process. The process should run under your Pod's process supervisor rather than an SSH session that disconnects. On restart, unfinished jobs are marked failed, not falsely resumed.

## 3. Expose the HTTP service securely

Expose HTTP port 8000 using the Pod's HTTP service configuration and copy the HTTPS service URL supplied by RunPod. Do not use an SSH command or the public SSH port as the worker URL.

All worker endpoints require the bearer token. Do not disable this authentication. Consider additional network restrictions and encryption/storage requirements before uploading real proprietary materials.

## 4. Configure the Link application server

In the application's Secrets interface, set:

- `RUNPOD_WORKER_URL`: the HTTPS service URL, without `/health` or `/jobs`.
- `RUNPOD_WORKER_TOKEN`: the SAME token configured on the Pod.

These are server-side only. Do not prefix them with `VITE_` or place them in frontend code. Restart the app after changing environment configuration.

## 5. Verify and run explicitly

Sign in, create a workspace, and open the owner GPU telemetry section. Use the connection test first.

- Indexing creates CUDA embeddings and an HNSW vector index on the Pod.
- The full pipeline indexes, then performs two epochs of LoRA training. It downloads the model if necessary and consumes GPU resources.
- Only explicitly submitting a GPU action starts a job. A connection test does not train or index.
- Actual worker logs, loss values, epochs, elapsed time, and GPU readings are polled. Missing metrics remain unavailable.
- While a GPU job is running, retrieval/chat may return a busy response rather than competing for memory.
- The API has no automatic retry for job submissions, to avoid duplicate compute.

Edits or deletions invalidate old document revisions for retrieval. Old fine-tuned adapters are not used when the current document set differs. Re-index after changing knowledge; re-train only when you choose.

## Operational limits and caveats

This initial worker supports up to 200 documents, 10 MB of corpus text, and 15,000 chunks per workspace job, one active GPU job per Pod, and one process. Text uploads in the app support TXT, Markdown, CSV, and JSON; PDF/DOCX ingestion is not implemented. Training, quizzes, and simulators use clearly labeled sample standards and must be replaced or reviewed before real company training.

LLM grounding is constrained by retrieval, source citations, server-side tenant/revision filters, and strict prompts; this is not a mathematical guarantee against hallucination. Review generated answers before high-stakes use. Retrieval similarity is not a factuality score.

Deleting a document removes it from app access and excludes it from searches immediately. A subsequent indexing job replaces the Pod's old index; adapters remain on your persistent volume until a subsequent training job replaces them. For legal erasure obligations, securely remove the relevant workspace directory on the Pod as part of your approved retention procedure.

Keep an operational record of costs and Pod uptime. Even when this app is not submitting jobs, a running RunPod GPU Pod may incur charges according to your RunPod configuration.
