---
name: RunPod GitHub builder and capacity quirks
description: Build-context behaviour of RunPod's GitHub import and why first GPU verification stalled.
---

RunPod's GitHub builder runs `docker buildx build --file <repo>/runpod/Dockerfile <repo root>`: the context is the REPOSITORY ROOT, not the Dockerfile's directory.

**Why:** Builds failed with `"/worker.py": not found` when the Dockerfile used context-relative COPY.

**How to apply:** The runpod/Dockerfile fetches worker files from the public repo and verifies SHA-256 checksums; update checksums whenever a runpod/ file changes. Saving an endpoint or publishing a GitHub release did not start a rebuild; creating a new endpoint did.

Serverless GPU availability: A5000/3090/L4 were "Out of capacity" and a job stayed IN_QUEUE for 12+ minutes with no worker; only the 80 GB (H100, US$4.79/hr) tier got a worker, which appeared then vanished without taking the job. Cause not established (worker logs not yet seen). The user decided to defer GPU verification.
