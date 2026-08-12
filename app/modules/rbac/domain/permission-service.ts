import { hasPermission } from '../infrastructure/permission-repository'
import type { Resource, Action } from './constants'

export async function checkPermission(
  roleName: string,
  resource: Resource,
  action: Action,
): Promise<boolean> {
  return hasPermission(roleName, resource, action)
}

export async function checkPermissionWithBypass(
  roleName: string,
  resource: Resource,
  action: Action,
): Promise<boolean> {
  if (roleName === 'admin') return true
  return hasPermission(roleName, resource, action)
}
