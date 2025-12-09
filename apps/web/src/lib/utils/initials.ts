export function getInitials(name: string): string {
  const capitals = name.match(/[A-Z]/g)
  if (capitals && capitals.length >= 2) {
    return capitals.slice(0, 2).join('')
  }

  return name
    .split(/\s+/)
    .map(word => word.match(/[a-zA-Z0-9]/)?.[0] ?? '')
    .filter(Boolean)
    .join('')
    .slice(0, 2)
    .toUpperCase()
}
