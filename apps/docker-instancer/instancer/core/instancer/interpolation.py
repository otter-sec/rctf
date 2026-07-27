from string import Template


RCTF_PLACEHOLDERS = frozenset({'RCTF_FLAGS', 'RCTF_EXPOSED_HOSTNAMES'})


def interpolate_environment(env: dict[str, str], context: dict[str, str]) -> dict[str, str]:
    if not any(RCTF_PLACEHOLDERS.intersection(Template(value).get_identifiers()) for value in env.values()):
        return env
    return {key: Template(value).safe_substitute(context) for key, value in env.items()}
