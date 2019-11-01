import React from 'react'
import ReactDOM from 'react-dom'
import { NextComponentType } from 'next/dist/next-server/lib/utils'
import { Observable, Subject } from 'rxjs'
import Modal, { ModalProps } from 'antd/es/modal'
import { ButtonProps } from 'antd/es/button'
import Template from '@billypon/react-template'
import { Dictionary } from '@billypon/ts-types'

import { Component } from './react'

const destroyFns: Function[] = [ ]

export class ModalRenderError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ModalRenderError'
  }
}

export interface ModalXProps extends ModalProps {
  content?: React.ReactNode | Template | NextComponentType
  componentProps?: Dictionary
}

export { ModalXProps as ModalProps }

export default class ModalX<T = any> {
  private container: HTMLElement
  private createdContainer: HTMLElement

  afterClose: Subject<T> = new Subject<T>()

  constructor(public props: ModalXProps) {
    destroyFns.push(this.destroy)
    if (props.content instanceof Template) {
      const template = props.content as Template
      template.afterChange.subscribe(() => {
        if (this.container) {
          this.update()
        }
      })
    }
  }

  static close(): void {
    let fn = destroyFns.pop()
    while (fn) {
      fn()
      fn = destroyFns.pop()
    }
  }

  open(): void {
    if (this.container) {
      throw new ModalRenderError('modal have been opened')
    }

    const { getContainer } = this.props
    if (getContainer instanceof HTMLElement) {
      this.container = getContainer
    } else {
      switch (typeof getContainer) {
        case 'string':
          this.container = document.querySelector(getContainer)
          break
        case 'function':
          this.container = getContainer()
          break
      }
    }
    if (!this.container) {
      this.container = document.createElement('div')
      document.body.appendChild(this.container)
      this.createdContainer = this.container
    }

    this.render()
  }

  close(observable?: Observable<T>): void {
    this.destroy()
    if (observable) {
      observable.subscribe(result => {
        this.afterClose.next(result)
      })
    } else {
      this.afterClose.next(null)
    }
  }

  private destroy(): void {
    const index = destroyFns.findIndex(fn => fn === this.destroy)
    destroyFns.splice(index, 1)
    ReactDOM.unmountComponentAtNode(this.container)
    this.container = null
    if (this.createdContainer) {
      document.body.removeChild(this.createdContainer)
      this.createdContainer = null
    }
  }

  private render(): void {
    if (!this.container) {
      throw new ModalRenderError('modal have been closed')
    }
    let content = this.props.content
    if (content instanceof Template) {
      content = (content as Template).template
    } else if (!React.isValidElement(content)) {
      const ContentComponent = content as any
      content = <ContentComponent { ...this.props.componentProps } />
    }
    const modal = (
      <Modal
        { ...this.props }
        getContainer={ false }
        visible
        onCancel={ this.close.bind(this, undefined) }
      >
        { content }
      </Modal>
    )
    ReactDOM.render(modal, this.container)
  }

  update(): void {
    this.render()
  }
}

export class ModalComponent<P = { }, S = { }> extends Component<P & { modal: ModalX }, S> {
  protected readonly modal: ModalX

  constructor(props) {
    super(props)
    this.modal = props.modal
    this.beforeOpen()
    props.modal.open()
  }

  protected beforeOpen(): void {
  }

  protected getOkButtonProps(): ButtonProps {
    const { okButtonProps } = this.modal.props
    return {
      children: '确定',
      type: 'primary',
      onClick: () => !okButtonProps.loading ? this.close() : 0,
    }
  }

  protected getCancelButtonProps(): ButtonProps {
    return {
      children: '取消',
      onClick: () => this.modal.close(),
    }
  }

  protected setOkButtonLoading(loading: boolean): void {
    this.modal.props.okButtonProps.loading = loading
    this.modal.update()
  }

  protected close(state?: object): void {
    const observable = this.onClose(state)
    this.modal.close(observable)
  }

  protected onClose(state?: object): Observable<any> {
    return null
  }
}
