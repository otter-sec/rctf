export const hasPermission = (userPerms, requiredPerms) => {
  return (userPerms & requiredPerms) === requiredPerms
}

export const isAdmin = userPerms => {
  return userPerms > 0
}

export const getStoredPermissions = () => {
  return parseInt(localStorage.getItem(`userPerms`) || '0', 0)
}
