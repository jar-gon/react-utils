import React from 'react'
import { NextComponentType } from 'next/dist/next-server/lib/utils'

import { browser, redirectToLogin } from './common'

export function withAuthentication(check: () => boolean) {
  return (Component: NextComponentType) => {
    return class extends React.Component {
      constructor(props) {
        super(props)
        if (browser && !check()) {
          redirectToLogin()
        }
      }

      static getInitialProps = Component.getInitialProps

      render() {
        return browser ? <Component { ...this.props } /> : null
      }
    }
  }
}
