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

export function redirectToLogin(current?: string, replace = false): void {
  const redirect = getRedirectParam()
  router.push(`/login${ redirect !== current ? `?${ qs.stringify({ redirect }) }` : '' }`)
}

export function replaceToLogin(current?: string): void {
  redirectToLogin(current, true)
}

export function redirectToLogout(current?: string, replace = false): void {
  const redirect = getRedirectParam()
  router.push(`/logout${ redirect !== current ? `?${ qs.stringify({ redirect }) }` : '' }`)
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
