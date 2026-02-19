import re
from functools import lru_cache


UNITS_TO_NS: dict[str, int] = {
    'ns': 1,
    'us': 1_000,
    'ms': 1_000_000,
    's': 1_000_000_000,
    'm': 60 * 1_000_000_000,
    'h': 3600 * 1_000_000_000,
}
SEGMENT_RE: re.Pattern[str] = re.compile(r'(\d+(?:\.\d+)?)(ns|us|ms|s|m|h)')

UNITS_TO_BYTES: dict[str, int] = {
    'b': 1,
    'k': 1024,
    'ki': 1024,
    'kib': 1024,
    'kb': 1000,
    'm': 1024**2,
    'mi': 1024**2,
    'mib': 1024**2,
    'mb': 1000**2,
    'g': 1024**3,
    'gi': 1024**3,
    'gib': 1024**3,
    'gb': 1000**3,
    't': 1024**4,
    'ti': 1024**4,
    'tib': 1024**4,
    'tb': 1000**4,
}
UNIT_ALTS = '|'.join(sorted(UNITS_TO_BYTES.keys(), key=len, reverse=True))  # type: ignore[no-matching-overload]
MEM_SEGMENT_RE: re.Pattern[str] = re.compile(rf'(\d+(?:\.\d+)?)(?:({UNIT_ALTS}))?')


def _sanitize(s: str) -> tuple[int, str | None]:
    s = s.strip()
    if not s:
        return 0, None

    sign = -1 if s[0] == '-' else 1
    if s[0] in '+-':
        s = s[1:]

    s = s.replace(' ', '').lower()
    if s in ('0', '0.0', '0.'):
        return 0, None

    return sign, s


@lru_cache(maxsize=128)
def parse_nano_sec(s: str) -> int:
    sign, new_s = _sanitize(s)
    if new_s is None:
        return 0

    parts = SEGMENT_RE.findall(new_s)
    if not parts or ''.join(a + b for a, b in parts) != new_s:
        return 0

    return int(sign * int(sum(float(a) * UNITS_TO_NS[b] for a, b in parts)))


@lru_cache(maxsize=128)
def parse_memory_bytes(s: str) -> int:
    sign, new_s = _sanitize(s)
    if new_s is None:
        return 0

    parts = MEM_SEGMENT_RE.findall(new_s)
    if not parts or ''.join(a + (b or '') for a, b in parts) != new_s:
        return 0

    return int(sign * int(sum(float(a) * UNITS_TO_BYTES.get(b or 'b', 1) for a, b in parts)))
