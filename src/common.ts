import router from 'next/router'
import qs from 'qs'
import { Dictionary } from '@billypon/ts-types'

export const dev = process.env.NODE_ENV !== 'production'
export const browser = process.browser

export function getQueryParams(): Dictionary<string> {
  return qs.parse(window.location.search.substr(1))
}

export function buildUrl({ origin = '', path, query, hash = ''}: { origin?: string; path: string; query?: Dictionary; hash?: string }): string {
  return `${ origin }${ path }${ query ? `?${ qs.stringify(query) }` : '' }${ hash ? `#${ hash }` : '' }`
}

export function getPathAndQuery(): string {
  const { pathname, search } = window.location
  return pathname + search
}

export function getLoginUrl(currentUrl?: string): string {
  const redirectUrl = getPathAndQuery()
  return buildUrl({
    path: '/login',
    query: redirectUrl !== currentUrl ? { redirect: redirectUrl } : null,
  })
}

export function getLogoutUrl(currentUrl?: string): string {
  const redirectUrl = getPathAndQuery()
  return buildUrl({
    path: '/logout',
    query: redirectUrl !== currentUrl ? { redirect: redirectUrl } : null,
  })
}

export function redirectToLogin(current?: string): void {
  router.push(getLoginUrl(current))
}

export function replaceToLogin(current?: string): void {
  router.replace(getLoginUrl(current))
}

export function redirectToLogout(current?: string): void {
  router.push(getLogoutUrl(current))
}

export function replaceToLogout(current?: string): void {
  router.replace(getLogoutUrl(current))
}

export function getParentNode(triggerNode: HTMLElement): HTMLElement {
  return triggerNode.parentNode as HTMLElement
}
