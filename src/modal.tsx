import React from 'react'
import ReactDOM from 'react-dom'
import { NextComponentType } from 'next/dist/next-server/lib/utils'
import { Observable, Subject } from 'rxjs'
import Modal, { ModalProps } from 'antd/es/modal'
import { FormProps } from 'antd/es/form'
import { GetFieldDecoratorOptions } from 'antd/es/form/Form'
import { TableProps } from 'antd/es/table'
import { PaginationProps } from 'antd/es/pagination'
import { ButtonProps } from 'antd/es/button'
import { of } from 'rxjs'
import Template from '@billypon/react-template'
import { Dictionary } from '@billypon/ts-types'

import { Component } from './react'
import { FormX, FormComponentProps, FormComponentState } from './form'
import SimpleForm, { SimpleFormRef, FormStates } from './simple-form'
import { ListState, TableX } from './table'

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

  cancelUpdate: boolean = false

  afterClose: Subject<T> = new Subject<T>()
  afterCancel: Subject<boolean> = new Subject<boolean>()

  constructor(public props: ModalXProps) {
    destroyFns.push(this.destroy)
    this.cancel = this.cancel.bind(this)
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
      this.afterClose.next(undefined)
    }
  }

  cancel(): void {
    this.destroy()
    this.afterCancel.next(this.cancelUpdate)
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
    if (!content) {
      return
    } else if (content instanceof Template) {
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
        onCancel={ this.cancel }
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

    const okProps = this.getOkButtonProps()
    const cancelProps = this.getCancelButtonProps()
    Object.assign(this.modal.props, {
      okButtonProps: okProps,
      okText: okProps.children,
      onOk: okProps.onClick,
      cancelButtonProps: cancelProps,
      cancelText: cancelProps.children,
      onCancel: cancelProps.onClick,
    } as Partial<ModalProps>)

    this.modal.update()
  }

  protected getOkButtonProps(): ButtonProps {
    const { props } = this.modal
    return {
      children: '确定',
      type: 'primary',
      onClick: () => !props.okButtonProps.loading ? this.close() : 0,
    }
  }

  protected getCancelButtonProps(): ButtonProps {
    return {
      children: '取消',
      onClick: () => this.modal.cancel(),
    }
  }

  protected setOkButtonLoading(loading: boolean): void {
    const { props } = this.modal
    props.okButtonProps.loading = loading
    this.modal.update()
  }

  protected setTitle(title: string): void {
    const { props } = this.modal
    props.title = title
    this.modal.update()
  }

  protected getTitle(): string {
    const { title } = this.modal.props
    return title as string
  }

  protected close(state?: any): void {
    const { props } = this.modal
    const observable = this.onClose(state)
    if (props.okButtonProps.loading) {
      observable.subscribe(
        result => {
          this.modal.close(of(result))
        },
        () => {
          this.setOkButtonLoading(false)
        },
      )
    } else {
      this.modal.close(observable)
    }
  }

  protected onClose(state?: any): Observable<any> {
    return null
  }
}

export abstract class SimpleFormModalComponent<P = { }, S extends FormComponentState = FormComponentState> extends ModalComponent<P, S> {
  form = new SimpleFormRef()
  states: FormStates
  formProps: FormProps

  constructor(props) {
    super(props)
    this.states = this.getFormStates()
    this.formProps = this.getFormProps()
    this.onSubmit = this.onSubmit.bind(this)
  }

  protected abstract getFormStates(): FormStates

  protected getFormProps(): FormProps {
    return null
  }

  protected close() {
    this.form.submit()
  }

  protected onSubmit(values: Dictionary): void {
    if (this.state.loading) {
      return
    }
    const { props } = this.modal
    const observable = this.onClose(values)
    if (props.okButtonProps.loading) {
      this.setState({ loading: true })
      observable.subscribe(
        result => {
          this.modal.close(of(result))
        },
        () => {
          this.setOkButtonLoading(false)
          this.setState({ loading: false })
        },
      )
    } else {
      this.modal.close(observable)
    }
  }

  render() {
    return <SimpleForm { ...this.formProps } _ref={ this.form } states={ this.states } onSubmit={ this.onSubmit } />
  }
}

export class FormModalComponent<P = { }, S extends FormComponentState = FormComponentState> extends ModalComponent<FormComponentProps & P, S> {
  fields: Dictionary<(node: React.ReactNode) => React.ReactNode>
  errors: Dictionary<string[]>
  validFns: Dictionary<() => void>

  submitForm: () => void
  protected getItemHelp: (name: string) => React.ReactNode
  protected updateFieldsStatus: (err: unknown) => void
  protected setErrors: (name: string, errors: Dictionary) => void
  protected setSelectValidFn: (...fields: string[]) => void

  constructor(props) {
    super(props)
    if (!props.lazyInit) {
      this.createForm()
    }
  }

  componentDidMount() {
    if (this.props.lazyInit) {
      this.createForm()
      this.triggerUpdate()
    }
    this.formInit()
  }

  protected createForm(): void {
    const getFormFields = () => this.getFormFields()
    const formSubmit = values => this.formSubmit(values)
    new FormX(this.props.form, getFormFields, formSubmit, this, this.triggerUpdate.bind(this))
  }

  protected getFormFields(): Dictionary<GetFieldDecoratorOptions> {
    return null
  }

  protected formInit(): void {
  }

  protected formSubmit(values: Dictionary): void {
    if (this.state.loading) {
      return
    }
    const { props } = this.modal
    const observable = this.onClose(values)
    if (props.okButtonProps.loading) {
      this.setState({ loading: true })
      observable.subscribe(
        result => {
          this.modal.close(of(result))
        },
        () => {
          this.setOkButtonLoading(false)
          this.setState({ loading: false })
        },
      )
    } else {
      this.modal.close(observable)
    }
  }

  protected close() {
    this.submitForm()
  }
}

export abstract class TableModalComponent<P = { }, S extends ListState = ListState, T = any> extends ModalComponent<P, S> {
  pageNumber = 1
  pageSize = 10
  totalCount = 0
  pagination = true

  private TableX = (props: TableProps<T>) => {
    const dataSource = props.dataSource || this.state.items
    const pagination: PaginationProps = this.pagination && {
      current: this.pageNumber,
      pageSize: this.pageSize,
      total: this.totalCount,
      onChange: this.changePage,
    }
    return (
      <TableX
        { ...props }
        dataSource={ dataSource }
        loading={ !dataSource }
        pagination = { pagination }
      >
        { props.children }
      </TableX>
    )
  }

  private changePage = (page: number) => {
    this.pageNumber = page
    this.loadItems()
  }

  componentDidMount() {
    this.loadItems()
  }

  loadItems(): void {
    this.setState({ loading: true })
    this.onLoadItems().subscribe(items => this.setState({ items, loading: false }))
  }

  protected abstract onLoadItems(): Observable<T[]>
}
