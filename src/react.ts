import React from 'react'
import { Observable } from 'rxjs'
import { shareReplay } from 'rxjs/operators'
import Template from '@billypon/react-template'

export class Component<P = { }, S = { }> extends React.Component<P, S> {
  readonly Template = Template

  constructor(props) {
    super(props)
    this.state = this.getInitialState() as S
  }

  getInitialState(): Partial<S> {
    return { }
  }

  setState<K extends keyof S>(
    state: ((prevState: Readonly<S>, props: Readonly<P>) => (Pick<S, K> | S | null)) | (Pick<S, K> | S | null),
  ): Observable<void> {
    const observable = new Observable<void>(observer => {
      super.setState(state, () => {
        observer.next()
        observer.complete()
      })
    }).pipe(shareReplay(1))
    observable.subscribe()
    return observable
  }

  triggerUpdate(): Observable<void> {
    return this.setState(this.state)
  }

  forceUpdate(): Observable<void> {
    const observable = new Observable<void>(observer => {
      super.forceUpdate(() => {
        observer.next()
        observer.complete()
      })
    }).pipe(shareReplay(1))
    observable.subscribe()
    return observable
  }
}
