# RunPod's GitHub builder reported that worker.py and handler.py were missing
# from its build context while requirements*.txt were present. To make the
# build independent of that context, the two Python sources are fetched from a
# pinned commit of the public repository and verified by SHA-256.
# If the repository becomes private, or the sources change, update the commit
# and checksums below together (sha256sum runpod/worker.py runpod/handler.py).
FROM pytorch/pytorch:2.6.0-cuda12.4-cudnn9-devel
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends build-essential curl ca-certificates \
    && rm -rf /var/lib/apt/lists/*
COPY requirements.txt requirements-serverless.txt ./
RUN python -m pip install --no-cache-dir -r requirements-serverless.txt
ARG SRC_COMMIT=93e22f687dd43a957817677ba72bf93634a5b21e
ARG WORKER_SHA256=2d05714f3284e9d0903973e40ebeaebea86dbc19be9cceeaddfc53e3b7b98ab6
ARG HANDLER_SHA256=685a067b7cfcb0178ecb6a53b729cb84855e434b4e6ddc263d369dbbba407354
RUN base="https://raw.githubusercontent.com/PicklePee-PicklePee/SDC-hackathon-LINK-/${SRC_COMMIT}/runpod" \
    && curl -fsSL --retry 3 -o worker.py "${base}/worker.py" \
    && curl -fsSL --retry 3 -o handler.py "${base}/handler.py" \
    && echo "${WORKER_SHA256}  worker.py" | sha256sum -c - \
    && echo "${HANDLER_SHA256}  handler.py" | sha256sum -c -
ENV LINK_SERVERLESS=1 \
    LINK_DATA_DIR=/runpod-volume/link-data \
    HF_HOME=/runpod-volume/huggingface \
    PYTHONUNBUFFERED=1
CMD ["python", "-u", "handler.py"]
