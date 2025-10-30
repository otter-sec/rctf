export const hasPermission = (userPerms, requiredPerms) => {
  return (userPerms & requiredPerms) === requiredPerms
}

export const hasChallsReadPermission = () => {
  return getStoredPermissions() > 0
}

export const hasChallsWritePermission = () => {
  return getStoredPermissions() > 1
}

export const getStoredPermissions = () => {
  return parseInt(localStorage.getItem(`userPerms`) || '0', 0)
}
