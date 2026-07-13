// CAP_*
export const CAPABILITIES = [
  'ALL',
  'AUDIT_CONTROL',
  'AUDIT_READ',
  'AUDIT_WRITE',
  'BLOCK_SUSPEND',
  'BPF',
  'CHECKPOINT_RESTORE',
  'CHOWN',
  'DAC_OVERRIDE',
  'DAC_READ_SEARCH',
  'FOWNER',
  'FSETID',
  'IPC_LOCK',
  'IPC_OWNER',
  'KILL',
  'LEASE',
  'LINUX_IMMUTABLE',
  'MAC_ADMIN',
  'MAC_OVERRIDE',
  'MKNOD',
  'NET_ADMIN',
  'NET_BIND_SERVICE',
  'NET_BROADCAST',
  'NET_RAW',
  'PERFMON',
  'SETFCAP',
  'SETGID',
  'SETPCAP',
  'SETUID',
  'SYS_ADMIN',
  'SYS_BOOT',
  'SYS_CHROOT',
  'SYS_MODULE',
  'SYS_NICE',
  'SYS_PACCT',
  'SYS_PTRACE',
  'SYS_RAWIO',
  'SYS_RESOURCE',
  'SYS_TIME',
  'SYS_TTY_CONFIG',
  'SYSLOG',
  'WAKE_ALARM',
] as const

// ulimit resource names
export const ULIMIT_NAMES = [
  'core',
  'cpu',
  'data',
  'fsize',
  'locks',
  'memlock',
  'msgqueue',
  'nice',
  'nofile',
  'nproc',
  'rss',
  'rtprio',
  'rttime',
  'sigpending',
  'stack',
] as const

// name or uid, optionally with :group
export const USER_REGEX =
  /^(?:[a-z_][a-z0-9_-]*|[0-9]+)(?::[a-z_][a-z0-9_-]*|:[0-9]+)?$/i

// /path/to/file
// oxlint-disable-next-line no-control-regex -- container paths must explicitly reject NUL bytes
export const ABSOLUTE_PATH_REGEX = /^\/(?:[^/\u0000]+\/?)*$/

// environment variable name
export const ENV_VAR_REGEX = /^[a-zA-Z_][a-zA-Z0-9_]*$/

// net.ipv4.ip_forward
export const SYSCTL_KEY_REGEX = /^[a-z][a-z0-9_]*(?:\.[a-z][a-z0-9_]*)*$/i
