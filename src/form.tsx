import React from 'react'
import Form, { FormComponentProps } from 'antd/es/form'
import { GetFieldDecoratorOptions } from 'antd/es/form/Form'
import { Dictionary } from '@billypon/ts-types'
import { autobind } from '@billypon/react-decorator'

import { Component } from './react'

export interface FormComponentState {
  loading: boolean
}

export class FormComponent<P extends FormComponentProps = FormComponentProps, S extends FormComponentState = FormComponentState> extends Component<P, S> {
  fields: Dictionary<(node: React.ReactNode) => React.ReactNode> = { }
  errors: Dictionary<string[]> = { }
  validFns: Dictionary<() => void> = { }
  inited: boolean

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
    this.triggerUpdate().subscribe(() => this.formInit())
  }

  @autobind()
  FormX({ children, ...props }): React.ReactNode {
    return (
      <Form { ...props }>
        { children }
        <button type="submit" hidden />
      </Form>
    )
  }

  @autobind()
  FormItem({ name, label, children }): React.ReactNode {
    return children && (
      <Form.Item label={ label } validateStatus={ this.errors[name] && 'error' } help={ this.errors[name] }>
        { this.fields[name](children) }
      </Form.Item>
    )
  }

  @autobind()
  FormField({ name, children }): React.ReactNode {
    return children && this.fields[name](children)
  }

  @autobind()
  handleSubmit(event: React.FormEvent<HTMLFormElement>): void {
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

  getFormFields(): Dictionary<GetFieldDecoratorOptions> {
    return null
  }

  formInit(): void {
  }

  formSubmit(values: Dictionary): void {
  }
}
