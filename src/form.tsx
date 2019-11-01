import React from 'react'
import Form, { FormComponentProps, ValidationRule } from 'antd/es/form'
import { GetFieldDecoratorOptions, WrappedFormUtils } from 'antd/es/form/Form'
import { Dictionary } from '@billypon/ts-types'

import { Component } from './react'

export class FormX {
  fields: Dictionary<(node: React.ReactNode) => React.ReactNode> = { }
  errors: Dictionary<string[]> = { }
  validFns: Dictionary<() => void> = { }

  FormX = ({ children, ...props }) => {
    return (
      <Form { ...props }>
        { children }
        <button type="submit" hidden />
      </Form>
    )
  }

  FormItem = ({ name, label, children }) => {
    return children && (
      <Form.Item label={ label } validateStatus={ this.errors[name] && 'error' } help={ this.getItemHelp(name) }>
        { this.fields[name](children) }
      </Form.Item>
    )
  }

  FormField = ({ name, children }) => {
    return children && this.fields[name](children)
  }

  onSubmit = (event?: React.FormEvent<HTMLFormElement>) => {
    if (event) {
      event.preventDefault()
    }
    this.form.validateFields((err, values) => {
      if (!err) {
        Object.keys(this.fields).forEach(id => this.errors[id] = null)
        this.submitCallback(values)
      } else {
        Object.keys(this.fields).forEach(id => {
          this.errors[id] = err[id] && err[id].errors.map(({ message }) => message)
        })
      }
    })
  }

  getItemHelp = (name: string): React.ReactNode => {
    const errors = this.errors[name]
    return errors && errors[0]
  }

  constructor(
    private form: WrappedFormUtils,
    getFormFields: () => Dictionary<GetFieldDecoratorOptions>,
    private submitCallback: (values: Dictionary) => void,
    context?: object,
  ) {
    const { getFieldDecorator, validateFields } = form
    Object.entries(getFormFields()).forEach(([ id, options ]) => {
      this.fields[id] = getFieldDecorator(id, options)
      this.validFns[id] = () => {
        validateFields([ id ], err => {
          this.errors[id] = err && err[id].errors.map(({ message }) => message)
        })
      }
    })
    if (context) {
      [ 'fields', 'errors', 'validFns', 'FormX', 'FormItem', 'FormField', 'getItemHelp', 'onSubmit' ].forEach(x => context[x] = this[x])
    }
  }
}

export interface FormComponentState {
  loading: boolean
}

export class FormComponent<P extends FormComponentProps = FormComponentProps, S extends FormComponentState = FormComponentState> extends Component<P, S> {
  fields: Dictionary<(node: React.ReactNode) => React.ReactNode>
  errors: Dictionary<string[]>
  validFns: Dictionary<() => void>

  onSubmit: (event?: React.FormEvent<HTMLFormElement>) => void
  getItemHelp: (name: string) => React.ReactNode

  inited: boolean

  componentDidMount() {
    new FormX(this.props.form, this.getFormFields, this.formSubmit, this)
    this.inited = true
    this.formInit()
    this.triggerUpdate()
  }

  protected getFormFields(): Dictionary<GetFieldDecoratorOptions> {
    return null
  }

  protected formInit(): void {
  }

  protected formSubmit(values: Dictionary): void {
  }
}

export type ValidatorFn<T = any> = (rule: ValidationRule, value: T, callback: (err?: React.ReactNode | React.ReactNode[]) => void) => void
