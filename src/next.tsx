import React from 'react'
import router from 'next/router'
import { NextComponentType } from 'next/dist/next-server/lib/utils'

import { browser, redirectToLogin } from './common'

export function withAuthentication(check: () => boolean) {
  return (Component: NextComponentType): any => {
    return class extends React.Component {
      private logined: boolean

      constructor(props) {
        super(props)
        if (browser && !check()) {
          redirectToLogin()
        } else {
          this.logined = true
        }
      }

      static getInitialProps = Component.getInitialProps

      render() {
        return this.logined ? <Component { ...this.props } /> : null
      }
    }
  }
}

export function RedirectComponent(url: string | (() => string)) {
  return () => {
    if (browser) {
      router.replace(url instanceof Function ? url() : url)
    }
    return null
  }
}
