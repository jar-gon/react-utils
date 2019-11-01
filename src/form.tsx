import React from 'react'
import Form, { FormComponentProps, ValidationRule } from 'antd/es/form'
import { GetFieldDecoratorOptions } from 'antd/es/form/Form'
import { Dictionary } from '@billypon/ts-types'

import { Component } from './react'

export interface FormComponentState {
  loading: boolean
}

export class FormComponent<P extends FormComponentProps = FormComponentProps, S extends FormComponentState = FormComponentState> extends Component<P, S> {
  fields: Dictionary<(node: React.ReactNode) => React.ReactNode> = { }
  errors: Dictionary<string[]> = { }
  validFns: Dictionary<() => void> = { }
  inited: boolean

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

  handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    this.props.form.validateFields((err, values) => {
      if (!err) {
        Object.keys(this.fields).forEach(id => this.errors[id] = null)
        this.formSubmit(values)
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

  componentDidMount() {
    const { getFieldDecorator, validateFields } = this.props.form
    Object.entries(this.getFormFields()).forEach(([ id, options ]) => {
      this.fields[id] = getFieldDecorator(id, options)
      this.validFns[id] = () => {
        validateFields([ id ], err => {
          this.errors[id] = err && err[id].errors.map(({ message }) => message)
        })
      }
    })
    this.inited = true
    this.formInit()
    this.triggerUpdate()
  }

  getFormFields(): Dictionary<GetFieldDecoratorOptions> {
    return null
  }

  formInit(): void {
  }

  formSubmit(values: Dictionary): void {
  }
}

export type ValidatorFn<T = any> = (rule: ValidationRule, value: T, callback: (err?: React.ReactNode | React.ReactNode[]) => void) => void
