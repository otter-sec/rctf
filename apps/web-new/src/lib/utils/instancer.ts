import { ExposeKind, InstanceStatus } from '@rctf/types'

/**
 * A single exposed endpoint as returned inside the instance-status response
 * (`GoodInstanceStatus.data.endpoints[]`). Mirrors `EndpointSchema`.
 */
export type InstancerEndpoint = {
  kind: ExposeKind
  host: string
  port: number
  title?: string
  text?: string
}

/**
 * A presentation-ready endpoint: the label to show, the formatted connection
 * string, an optional protocol tag (absent for RAW), and the exact text the
 * copy button writes to the clipboard.
 */
export type FormattedEndpoint = {
  label: string
  value: string
  protocolTag?: string
  copyValue: string
}

// HTTP(S) URLs elide the default port but keep any non-standard one; TCP and
// TCP+SSL render a ready-to-paste command; RAW trusts the server-provided text.
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

/**
 * Formats one instancer endpoint for display.
 *
 * @param endpoint - The raw endpoint entry from the instance-status response.
 * @param index - The endpoint's position within the list (0-based).
 * @param total - The number of endpoints, used to number untitled ones.
 */
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

/**
 * Adaptive poll interval (ms) for the instance-status query, or `false` to stop
 * polling. Transitional states poll fast; steady states poll slowly; a stopped
 * or unknown instance is not polled at all.
 */
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
