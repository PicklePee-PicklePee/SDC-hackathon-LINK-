"""Queue-based RunPod Serverless entry point; reuses the real CUDA worker.

No HTTP listener or shared bearer token is exposed here. RunPod authenticates
requests with its API key before delivering events to this handler.
"""
import fcntl
import hashlib
import json
import os
import threading
import time
import uuid
from pathlib import Path

os.environ["LINK_SERVERLESS"] = "1"
os.environ.setdefault("LINK_DATA_DIR", "/runpod-volume/link-data")

import worker  # noqa: E402
from fastapi import HTTPException  # noqa: E402
from pydantic import ValidationError  # noqa: E402

PROTOCOL = "link-worker-v1"


def envelope(data, workspace_id=None):
    return {"protocol": PROTOCOL, "workspaceId": workspace_id, "data": data}


def snapshot(job_id):
    with worker.LOCK:
        item = worker.JOBS[job_id]
        return {key: value for key, value in item.items() if not key.startswith("_")}


def dispatch(event, progress=None):
    data = event.get("input", {})
    workspace_id = data.get("workspaceId")
    operation = data.get("operation")
    try:
        # Ephemeral container storage must never silently look like persistence.
        if not os.path.ismount("/runpod-volume"):
            raise HTTPException(503, "Attach a persistent network volume at /runpod-volume before using this worker.")
        root = worker.ROOT.resolve()
        if not root.is_relative_to(Path("/runpod-volume")):
            raise HTTPException(503, "LINK_DATA_DIR must be inside /runpod-volume.")
        # This lock also guards against accidentally configuring multiple workers.
        with (worker.ROOT / "endpoint.lock").open("a") as lock:
            try:
                fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
            except BlockingIOError:
                raise HTTPException(409, "Endpoint storage is busy. Configure maximum workers=1 and concurrency=1.")
            if operation == "health":
                return envelope(worker.health())
            if operation == "search":
                request = worker.SearchRequest.model_validate(data)
                return envelope(worker.search(request), str(request.workspaceId))
            if operation == "chat":
                request = worker.ChatRequest.model_validate(data)
                return envelope(worker.chat(request), str(request.workspaceId))
            if operation not in ("index", "pipeline"):
                raise HTTPException(400, "Unknown Link worker operation. This is not an Ollama endpoint.")
            request = worker.JobRequest.model_validate({**data, "action": operation})
            workspace_id = str(request.workspaceId)
            if sum(len(doc.text.encode("utf-8")) for doc in request.documents) > 10000000:
                raise HTTPException(413, "Corpus exceeds the 10 MB worker limit.")
            # A repeated delivery of the SAME RunPod job must not repeat training.
            event_id = event.get("id")
            if not isinstance(event_id, str) or not event_id:
                raise HTTPException(400, "RunPod event ID is required.")
            local_id = str(uuid.UUID(hashlib.sha256(event_id.encode()).hexdigest()[:32]))
            saved = worker.ROOT / f"job-{local_id}.json"
            if saved.exists():
                previous = json.loads(saved.read_text())
                if previous["workspaceId"] != workspace_id:
                    raise HTTPException(409, "Job workspace does not match its saved execution.")
                worker.JOBS[local_id] = previous
                if previous["status"] in ("IN_QUEUE", "IN_PROGRESS"):
                    worker.update_job(local_id, status="FAILED", error="Worker stopped during this execution. It will not be automatically re-run.")
                return envelope(snapshot(local_id), workspace_id)
            worker.JOBS[local_id] = {
                "id": local_id, "workspaceId": workspace_id, "action": operation,
                "status": "IN_QUEUE", "_started": time.time(), "logs": [],
                "lossHistory": [], "epoch": None, "epochs": None, "loss": None, "gpu": None,
            }
            worker.update_job(local_id)
            stop = threading.Event()

            def report():
                while not stop.wait(5):
                    worker.update_job(local_id, gpu=worker.gpu_info())
                    if progress:
                        try:
                            progress(json.dumps(envelope(snapshot(local_id), workspace_id)))
                        except Exception:
                            # Progress transport failure must not repeat or abort compute.
                            print("Progress delivery unavailable; final telemetry remains persisted.", flush=True)

            reporter = threading.Thread(target=report, daemon=True)
            reporter.start()
            try:
                worker.execute_job(local_id, request)
            finally:
                stop.set()
                reporter.join(timeout=10)
            return envelope(snapshot(local_id), workspace_id)
    except HTTPException as error:
        return envelope({"workerError": error.detail, "statusCode": error.status_code}, workspace_id)
    except ValidationError:
        return envelope({"workerError": "Invalid Link worker request.", "statusCode": 422}, workspace_id)


import runpod  # noqa: E402


def handler(event):
    return dispatch(event, lambda update: runpod.serverless.progress_update(event, update))


# Top-level on purpose: executes at container startup and is detectable by RunPod's source scan.
runpod.serverless.start({"handler": handler})
