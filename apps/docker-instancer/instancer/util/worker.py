import contextlib

from filelock import FileLock, Timeout


class Worker:
    def __init__(self) -> None:
        self.lock = FileLock('worker-instancer.lock')
        with contextlib.suppress(Timeout):
            self.lock.acquire(blocking=False)

    @property
    def is_first(self) -> bool:
        if self.lock is None:
            return False
        return self.lock.is_locked


worker = Worker()
