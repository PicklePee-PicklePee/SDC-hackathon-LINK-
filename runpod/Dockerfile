# Use the runpod/ directory as build context, on RunPod's image builder or an
# external build host, not the app server.
FROM pytorch/pytorch:2.6.0-cuda12.4-cudnn9-devel
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends build-essential \
    && rm -rf /var/lib/apt/lists/*
COPY requirements.txt requirements-serverless.txt ./
RUN python -m pip install --no-cache-dir -r requirements-serverless.txt
COPY worker.py handler.py ./
ENV LINK_SERVERLESS=1 \
    LINK_DATA_DIR=/runpod-volume/link-data \
    HF_HOME=/runpod-volume/huggingface \
    PYTHONUNBUFFERED=1
CMD ["python", "-u", "handler.py"]
