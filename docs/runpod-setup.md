# Connect your existing RunPod GPU Pod to Link

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
