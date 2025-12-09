// registry/repo:tag@digest
export const IMAGE_REGEX =
  /^(?:(?:[a-z0-9](?:[a-z0-9._-]*[a-z0-9])?(?::[0-9]+)?\/)?[a-z0-9](?:[a-z0-9._-]*[a-z0-9])?(?:\/[a-z0-9](?:[a-z0-9._-]*[a-z0-9])?)*)(?::[a-z0-9][a-z0-9._-]{0,127})?(?:@sha256:[a-f0-9]{64})?$/i

// 512m, 1g, 1024
export const MEMORY_SIZE_REGEX = /^[1-9]\d*[bkmgBKMG]?$/

// 30s, 5m, 1h, 100ms
export const DURATION_REGEX = /^(?:0|[1-9]\d*)(?:ns|us|µs|ms|s|m|h)$/

// volume:/path:options
export const VOLUME_MOUNT_REGEX =
  /^[a-z0-9][a-z0-9_.-]*:\/[^:]*(?::(?:ro|rw|z|Z|shared|slave|private|rshared|rslave|rprivate|nocopy|delegated|cached)(?:,(?:ro|rw|z|Z|shared|slave|private|rshared|rslave|rprivate|nocopy|delegated|cached))*)?$/i

// containers, volumes, networks
export const NAME_REGEX = /^[a-z0-9][a-z0-9_.-]*$/i

// service name
export const SERVICE_NAME_REGEX = /^[a-z][a-z0-9_-]*$/i

// reverse DNS notation
export const LABEL_KEY_REGEX =
  /^[a-z0-9](?:[a-z0-9._-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9._-]*[a-z0-9])?)*$/i
