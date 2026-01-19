#!/bin/bash
set -xe

export IMG="europe-west1-docker.pkg.dev/sandbox-476301/challenge-registry/rctf-instancer:latest" # TODO: push to ghcr

make build-installer IMG="$IMG"
docker build -t $IMG .
docker push $IMG
