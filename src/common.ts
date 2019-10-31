import router from 'next/router'
import qs from 'qs'
import { Dictionary } from '@billypon/ts-types'

export const dev = process.env.NODE_ENV !== 'production'
export const browser = process.browser

export function getQueryParams(): Dictionary<string> {
  return qs.parse(window.location.search.substr(1))
}

export function getRedirectParam(): string {
  const { pathname, search } = window.location
  return pathname + search
}

export function buildUrl({ origin = '', path, query, hash = ''}: { origin?: string; path: string; query?: Dictionary; hash?: string }): string {
  return `${ origin }${ path }${ query ? `?${ qs.stringify(query) }` : '' }${ hash ? `#${ hash }` : '' }`
}

export function redirectToLogin(current?: string, replace = false): void {
  const redirect = getRedirectParam()
  const url = buildUrl({
    path: '/login',
    query: redirect !== current ? { redirect } : null,
  })
  router.push(url)
}

export function replaceToLogin(current?: string): void {
  redirectToLogin(current, true)
}

export function redirectToLogout(current?: string, replace = false): void {
  const redirect = getRedirectParam()
  const url = buildUrl({
    path: '/logout',
    query: redirect !== current ? { redirect } : null,
  })
  router.push(url)
}

export function replaceToLogout(current?: string): void {
  redirectToLogout(current, true)
}

export const logPattern = !process.browser || !localStorage.log ? /^$/ : new RegExp(
  localStorage.log
    .replace(/\*/g, '.*')
    .replace(/\[/g, '\\[')
    .replace(/\]/g, '\\]')
)
