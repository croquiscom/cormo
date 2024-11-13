#!/bin/bash

docker build --platform linux/amd64 -t croquiscom/postgis-pgvector:16-3.5-0.7.3 .
docker push croquiscom/postgis-pgvector:16-3.5-0.7.3
