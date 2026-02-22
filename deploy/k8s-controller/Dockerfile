FROM --platform=$BUILDPLATFORM golang:1.24 AS builder
ARG TARGETOS
ARG TARGETARCH
ARG TARGETVARIANT

WORKDIR /workspace
COPY apps/k8s-controller/go.mod go.mod
COPY apps/k8s-controller/go.sum go.sum
RUN go mod download

COPY apps/k8s-controller/ .
RUN CGO_ENABLED=0 GOOS=${TARGETOS:-linux} GOARCH=${TARGETARCH} GOARM=${TARGETVARIANT#v} go build -o manager cmd/main.go

FROM gcr.io/distroless/static:nonroot
WORKDIR /
COPY --from=builder /workspace/manager .
USER 65532:65532

ENTRYPOINT ["/manager"]
