import { ExposeKind, InstanceStatus } from '@rctf/types'

export type InstancerEndpoint = {
  kind: ExposeKind
  host: string
  port: number
  title?: string
  text?: string
}

export type FormattedEndpoint = {
  label: string
  value: string
  protocolTag?: string
  copyValue: string
}

function endpointValue(endpoint: InstancerEndpoint): string {
  const { kind, host, port, text } = endpoint
  if (kind === ExposeKind.HTTP) {
    return port === 80 ? `http://${host}` : `http://${host}:${port}`
  }
  if (kind === ExposeKind.HTTPS) {
    return port === 443 ? `https://${host}` : `https://${host}:${port}`
  }
  if (kind === ExposeKind.TCP) {
    return `nc ${host} ${port}`
  }
  if (kind === ExposeKind.TCP_SSL) {
    return `ncat --ssl ${host} ${port}`
  }
  return text ?? ''
}

export function formatEndpoint(
  endpoint: InstancerEndpoint,
  index: number,
  total: number
): FormattedEndpoint {
  const value = endpointValue(endpoint)
  const label =
    endpoint.title ?? (total > 1 ? `Endpoint ${index + 1}` : 'Endpoint')
  const protocolTag =
    endpoint.kind === ExposeKind.RAW
      ? undefined
      : endpoint.kind === ExposeKind.TCP_SSL
        ? 'TCP+SSL'
        : endpoint.kind
  return { label, value, protocolTag, copyValue: value }
}

export function instancePollInterval(
  status: InstanceStatus | undefined
): number | false {
  if (
    status === InstanceStatus.STARTING ||
    status === InstanceStatus.STOPPING
  ) {
    return 2000
  }
  if (status === InstanceStatus.RUNNING || status === InstanceStatus.ERRORED) {
    return 10000
  }
  return false
}
