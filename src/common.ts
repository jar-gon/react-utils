import router from 'next/router'
import qs from 'qs'
import { Dictionary } from '@billypon/ts-types'

export const dev = process.env.NODE_ENV !== 'production'
export const browser = process.browser

export function getQueryParams(): Dictionary<string> {
  return qs.parse(window.location.search.substr(1))
}

export function redirectToLogin(current?: string): void {
  const { pathname, search } = window.location
  const params = { redirect: pathname + search }
  router.replace(`/login${ params.redirect !== current ? `?${ qs.stringify(params) }` : '' }`)
}

export function redirectToLogout(current?: string): void {
  const { pathname, search } = window.location
  const params = { redirect: pathname + search }
  router.replace(`/logout${ params.redirect !== current ? `?${ qs.stringify(params) }` : '' }`)
}

export const logPattern = !process.browser || !localStorage.log ? /^$/ : new RegExp(
  localStorage.log
    .replace(/\*/g, '.*')
    .replace(/\[/g, '\\[')
    .replace(/\]/g, '\\]')
)
