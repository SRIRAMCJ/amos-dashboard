#!/bin/bash
cd "$(dirname "$0")"
/home/z/.venv/bin/uvicorn server:app --host 0.0.0.0 --port 8083