import { AxiosObservable } from 'axios-observable/lib/axios-observable.interface'
import { Observable } from 'rxjs'
import { map, shareReplay } from 'rxjs/operators'
import { ObservablePipe } from '@billypon/rxjs-types'
import 'reflect-metadata'

import { parseResponse } from './ajax'

const meta = Symbol('api')

function getSymbol(target: Function): symbol {
  return Reflect.getMetadata(meta, target) || Symbol('class')
}

export type GetBaseUrlFn = () => string

export type GetPipesFn = (options: ApiCallOptions, pipes: ObservablePipe[]) => ObservablePipe[]

export interface ApiClassOptions {
  port: number
  getBaseUrl?: GetBaseUrlFn
  getPipes?: GetPipesFn
}

export interface ApiCallOptions {
  share: boolean
  cache: boolean
  raw: boolean
}

export function ApiClass({ port, getBaseUrl, getPipes }: ApiClassOptions) {
  return (target: Function) => {
    const symbol = getSymbol(target)
    const { prototype } = target
    Object.getOwnPropertyNames(prototype).filter(x => x !== 'constructor').forEach(x => {
      const opts: ApiCallOptions = Reflect.getMetadata(symbol, target, x) || { }
      const pipes: ObservablePipe[] = [ ]
      if (opts.cache) {
        pipes.push(shareReplay(1))
      }
      const fn = prototype[x]
      prototype[x] = function () {
        const observable: AxiosObservable<any> = fn.apply(this, arguments)
        return observable.pipe.apply(observable, [ parseResponse, ...(getPipes ? getPipes(opts, pipes) : pipes) ])
      }
    })
    prototype.getBaseUrl = getBaseUrl || (() => '')
  }
}

export function ApiCall({ share = true, cache = true, raw = false } = { } as ApiCallOptions) {
  return function (target: Function, name: string) {
    const symbol = getSymbol(target.constructor)
    const opts: ApiCallOptions = { share, cache, raw }
    Reflect.defineMetadata(symbol, opts, target.constructor, name)
  }
}
