import React from 'react'
import Form, { FormComponentProps as OriginFormComponentProps, ValidationRule } from 'antd/es/form'
import { GetFieldDecoratorOptions, WrappedFormUtils } from 'antd/es/form/Form'
import { Dictionary } from '@billypon/ts-types'

import { Component } from './react'

export interface FormItemProps {
  name: string
  label: string
  help: React.ReactNode | (() => React.ReactNode)
  extra: React.ReactNode | (() => React.ReactNode)
  decorator: boolean
  children: React.ReactNode
}

export class FormX {
  fields: Dictionary<(node: React.ReactNode) => React.ReactNode> = { }
  errors: Dictionary<string[]> = { }
  validFns: Dictionary<(state?: any) => void> = { }

  private FormX = ({ children, ...props }) => {
    return (
      <Form { ...props }>
        { children }
        <button type="submit" hidden />
      </Form>
    )
  }

  private FormItem = ({ name, label, help, extra, decorator, children }: FormItemProps) => {
    if (!help) {
      help = this.getItemHelp(name)
    } else if (typeof help === 'function') {
      help = help()
    }
    if (typeof extra === 'function') {
      extra = extra()
    }
    return children && (
      <Form.Item label={ label } validateStatus={ this.errors[name] && 'error' } help={ help } extra={ extra }>
        { decorator !== false ? this.fields[name](children) : children }
      </Form.Item>
    )
  }

  private FormField = ({ name, children }) => {
    return children && this.fields[name](children)
  }

  private submitForm = (event?: React.SyntheticEvent<HTMLElement>) => {
    if (event && event.type === 'submit') {
      event.preventDefault()
    }
    this.form.validateFields((err, values) => {
      if (!err) {
        Object.keys(this.fields).forEach(name => this.errors[name] = null)
        this.submitCallback(values)
      } else {
        Object.keys(this.fields).forEach(name => this.setErrors(name, err))
      }
    })
  }

  private getItemHelp = (name: string): React.ReactNode => {
    const errors = this.errors[name]
    return errors && errors[0]
  }

  private setSelectValidFn(...fields: string[]): void {
    fields.forEach(x => {
      const fn = this.validFns[x]
      this.validFns[`${ x }_dropdown`] = (open: boolean) => {
        if (!open) {
          setTimeout(() => {
            fn()
            if (this.triggerUpdate) {
              this.triggerUpdate()
            }
          })
        }
      }
    })
  }

  constructor(
    private form: WrappedFormUtils,
    getFormFields: () => Dictionary<GetFieldDecoratorOptions>,
    private submitCallback: (values: Dictionary) => void,
    context?: object,
    private triggerUpdate?: () => void,
  ) {
    const { getFieldDecorator, validateFields } = form
    Object.entries(getFormFields()).forEach(([ name, options ]) => {
      this.fields[name] = getFieldDecorator(name, options)
      this.validFns[name] = () => {
        validateFields([ name ], err => this.setErrors(name, err))
      }
    })
    if (context) {
      [ 'fields', 'errors', 'validFns', 'submitForm', 'getItemHelp', 'setSelectValidFn', 'FormX', 'FormItem', 'FormField' ].forEach(x => context[x] = this[x])
    }
  }

  private setErrors(name: string, errors: Dictionary): void {
    let err: Dictionary = errors
    name.split('.').forEach(x => err = err && err[x])
    this.errors[name] = err && err.errors.map(({ message }) => message)
  }
}

export interface FormComponentProps extends OriginFormComponentProps {
  lazyInit: boolean
}

export interface FormComponentState {
  loading: boolean
}

export class FormComponent<P extends OriginFormComponentProps = OriginFormComponentProps, S extends FormComponentState = FormComponentState> extends Component<FormComponentProps & P, S> {
  fields: Dictionary<(node: React.ReactNode) => React.ReactNode>
  errors: Dictionary<string[]>
  validFns: Dictionary<() => void>

  submitForm: (event?: React.SyntheticEvent<HTMLElement>) => void
  protected getItemHelp: (name: string) => React.ReactNode
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
  }
}

export type ValidatorFn<T = any> = (rule: ValidationRule, value: T, callback: ValidationCallback) => void

export type ValidationCallback = (err?: React.ReactNode | React.ReactNode[]) => void
