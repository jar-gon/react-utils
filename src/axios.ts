import Axios from 'axios-observable'
import { AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios'

import { browser, logPattern } from './common'
import { publicRuntimeConfig } from './config'

const debugLog = console.log
const infoLog = console.info
const warnLog = console.warn
const errorLog = console.error

const indents = { 2: '  ' }

function logConfig(config: AxiosRequestConfig, logger = debugLog): void {
  const { url, method, data, params, headers } = config
  if (url) {
    logger('url:', url)
  }
  if (method) {
    logger('method:', method)
  }
  if (data) {
    logger('data:', data)
  }
  if (params) {
    logger('params:', params)
  }
  if (headers) {
    logger('headers:', headers)
  }
}

function logResponse(response: AxiosResponse, logger = debugLog): void {
  const { status, statusText, data, headers } = response
  if (status) {
    logger('status:', status)
  }
  if (statusText) {
    logger('statusText:', statusText)
  }
  if (data) {
    logger('data:', data)
  }
  if (headers) {
    logger('headers:', headers)
  }
}

function logError(error: AxiosError): void {
  const { name, message } = error
  if (name) {
    errorLog('name:', name)
  }
  if (message) {
    errorLog('message:', message)
  }
}

function getConfigLog({ method, url, baseURL }: AxiosRequestConfig): string {
  return `${ method.toUpperCase() } ${ (baseURL && url.substr(0, baseURL.length) !== baseURL ? baseURL : '') + url }`
}

function logServerErrorData(name: string, data: object, indent = 2): void {
  let indentStr = indents[indent]
  if (!indentStr) {
    indentStr = Array.from({ length: indent }, () => ' ').join('')
    indents[indent] = indentStr
  }
  console.error('-----')
  console.error(`${ indentStr }${ name }:`)
  console.error(JSON.stringify(data, null, indent).replace(/^/gm, indentStr))
}

function logServerError({ config, response }: AxiosError): void {
  const { url, method, data, params, headers } = config
  console.error(`[${ (new Date).toLocaleString() }] ${ method.toUpperCase() } ${ url }`)
  logServerErrorData('headers', headers)
  if (params) {
    logServerErrorData('params', params)
  }
  if (data) {
    logServerErrorData('data', data)
  }
  if (response) {
    logServerErrorData('response', response.data)
  }
}

function useInterceptors(axios: Axios): void {
  axios.interceptors.request.use(config => {
    const log = `[debug] ${ getConfigLog(config) }`
    if (browser && logPattern.test(log)) {
      console.groupCollapsed(log)
      logConfig(config)
      console.groupEnd()
    }
    return config
  }, error => {
    const { config } = error
    const log = `[fatal] ${ getConfigLog(config) }`
    if (browser && logPattern.test(log)) {
      console.group(log)
      debugLog(error)
      console.groupEnd()
    } else if (!browser) {
      logServerError(error)
    }
    return Promise.reject(null)
  })

  axios.interceptors.response.use(response => {
    const { config } = response
    const log = `[info] ${ getConfigLog(config) }`
    if (browser && logPattern.test(log)) {
      console.groupCollapsed(log)
      logResponse(response, infoLog)
        // config
        console.groupCollapsed('config')
        logConfig(response.config, infoLog)
        console.groupEnd()
      console.groupEnd()
    }
    return response
  }, error => {
    const { config, response } = error
    const log = `[error] ${ getConfigLog(config) }`
    if (browser && logPattern.test(log)) {
      console.group(log)
      // logError(error)
        // response
        if (error.response) {
          console.group('response')
          logResponse(error.response, errorLog)
          console.groupEnd()
        }
        // config
        console.groupCollapsed('config')
        logConfig(error.config)
        console.groupEnd()
      console.groupEnd()
    } else if (!browser) {
      logServerError(error)
    }
    return Promise.reject(response && response.data)
  })
}

useInterceptors(Axios as any)

export { useInterceptors }
