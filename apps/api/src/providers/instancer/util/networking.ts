// RFC 1123
export const HOSTNAME_REGEX = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i

// 1-65535, tcp/udp/sctp
export const PORT_REGEX =
  /^(?:[1-9]\d{0,3}|[1-5]\d{4}|6[0-4]\d{3}|65[0-4]\d{2}|655[0-2]\d|6553[0-5])(?:\/(?:tcp|udp|sctp))?$/

// hostname:ipv4
export const EXTRA_HOST_REGEX =
  /^[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?:(?:(?:25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)\.){3}(?:25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)$/i

// domain name
export const DNS_DOMAIN_REGEX = /^[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$/i
