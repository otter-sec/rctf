from string import Template


RCTF_PLACEHOLDERS = frozenset({'RCTF_FLAGS', 'RCTF_EXPOSED_HOSTNAMES'})


def _interpolate_value(value: str, context: dict[str, str]) -> str:
    template = Template(value)
    if not RCTF_PLACEHOLDERS.intersection(template.get_identifiers()):
        return value
    return template.safe_substitute(context)


def interpolate_environment(env: dict[str, str], context: dict[str, str]) -> dict[str, str]:
    return {key: _interpolate_value(value, context) for key, value in env.items()}
