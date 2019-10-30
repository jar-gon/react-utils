import { Dictionary } from '@billypon/ts-types'

import { publicRuntimeConfig } from '../config'

declare const noCaptcha: any

export class NoCaptcha {
  captcha: any
  captchaData: NoCaptchaData

  constructor(opts: Dictionary, callback?: (data: NoCaptchaData) => void) {
    Object.assign(opts, {
      callback: (data: NoCaptchaData) => {
        data.scene = opts.scene
        this.captchaData = data
        if (callback) {
          callback(data)
        }
      },
    })
    this.captcha = new noCaptcha(opts, callback)
  }

  upLang(lang: string, langData: Dictionary): void {
    this.captcha.upLang(lang, langData)
  }

  reload(): void {
    this.captcha.reload()
  }

  get data(): NoCaptchaData {
    return this.captchaData
  }
}

export interface NoCaptchaData {
  csessionid: string
  scene: string
  sig: string
  token: string
  value: string
}
