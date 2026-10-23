# RunPod's GitHub builder runs `docker buildx build --file runpod/Dockerfile <repo root>`,
# i.e. the build context is the REPOSITORY ROOT, not runpod/. Context-relative COPY of
# worker files therefore fails ("/worker.py": not found). This Dockerfile copies nothing
# from the context: it fetches the worker files from a pinned commit of the public
# repository and verifies each by SHA-256.
# When any runpod/ file changes: commit it, then update SRC_COMMIT and the checksums
# (sha256sum runpod/*.py runpod/requirements*.txt) and create a new release.
FROM pytorch/pytorch:2.6.0-cuda12.4-cudnn9-devel
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends build-essential curl ca-certificates \
    && rm -rf /var/lib/apt/lists/*
ARG SRC_COMMIT=93e22f687dd43a957817677ba72bf93634a5b21e
ARG WORKER_SHA256=2d05714f3284e9d0903973e40ebeaebea86dbc19be9cceeaddfc53e3b7b98ab6
ARG HANDLER_SHA256=685a067b7cfcb0178ecb6a53b729cb84855e434b4e6ddc263d369dbbba407354
ARG REQUIREMENTS_SHA256=3928b143fabd4797d4989bc53255fc95c72006160b0e531c389c062632dadc1b
ARG REQUIREMENTS_SERVERLESS_SHA256=b89fd7ca3ef3f3f4dd4c65fe24882aaeaa8db44b5a98935fa0ebd9aee599cdbf
RUN base="https://raw.githubusercontent.com/PicklePee-PicklePee/SDC-hackathon-LINK-/${SRC_COMMIT}/runpod" \
    && for f in worker.py handler.py requirements.txt requirements-serverless.txt; do \
         curl -fsSL --retry 3 -o "$f" "${base}/$f"; done \
    && printf '%s  worker.py\n%s  handler.py\n%s  requirements.txt\n%s  requirements-serverless.txt\n' \
         "${WORKER_SHA256}" "${HANDLER_SHA256}" "${REQUIREMENTS_SHA256}" "${REQUIREMENTS_SERVERLESS_SHA256}" | sha256sum -c -
RUN python -m pip install --no-cache-dir -r requirements-serverless.txt
ENV LINK_SERVERLESS=1 \
    LINK_DATA_DIR=/runpod-volume/link-data \
    HF_HOME=/runpod-volume/huggingface \
    PYTHONUNBUFFERED=1
CMD ["python", "-u", "handler.py"]
