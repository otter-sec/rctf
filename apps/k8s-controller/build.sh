#!/bin/bash
set -xe

# TODO: delete this file after ghcr image is publicly available with the manifest
export IMG="europe-west1-docker.pkg.dev/sandbox-476301/challenge-registry/rctf-instancer:latest"

make build-installer IMG="$IMG"
docker build -f deploy/docker/k8s-controller.Dockerfile -t $IMG .
docker push $IMG
