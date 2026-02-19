import asyncio

from instancer.core.cache import get_instance_expiration
from instancer.core.instancer.const import ContainerLabels


def get_label_expiration(labels: dict[str, str]) -> int | None:
    expires_at_str = labels.get(ContainerLabels.EXPIRES_AT)
    return int(expires_at_str) if expires_at_str else None


def get_instance_id(labels: dict[str, str]) -> str | None:
    return labels.get(ContainerLabels.INSTANCE_ID)


async def get_effective_expiration(labels: dict[str, str]) -> int | None:
    label_exp = get_label_expiration(labels)
    instance_id = get_instance_id(labels)

    if not instance_id:
        return label_exp

    redis_exp = await get_instance_expiration(instance_id)
    if redis_exp is None:
        return label_exp
    if label_exp is None:
        return redis_exp

    return max(label_exp, redis_exp)


async def get_effective_expirations_batch(labels_list: list[dict[str, str]]) -> list[int | None]:
    instance_ids = [get_instance_id(labels) for labels in labels_list]

    redis_tasks = [get_instance_expiration(iid) if iid else asyncio.sleep(0) for iid in instance_ids]
    redis_results = await asyncio.gather(*redis_tasks)

    result: list[int | None] = []
    for labels, redis_exp in zip(labels_list, redis_results, strict=True):
        label_exp = get_label_expiration(labels)

        if not isinstance(redis_exp, int):
            result.append(label_exp)
        elif label_exp is None:
            result.append(redis_exp)
        else:
            result.append(max(label_exp, redis_exp))

    return result
