from datetime import UTC, datetime


def timestamp_milliseconds() -> int:
    return int(datetime.now(tz=UTC).timestamp() * 1000)
