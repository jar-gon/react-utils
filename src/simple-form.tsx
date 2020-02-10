import React from 'react'
import Form, { FormComponentProps, ValidationRule } from 'antd/es/form'
import { GetFieldDecoratorOptions, WrappedFormUtils } from 'antd/es/form/Form'
import Checkbox from 'antd/es/checkbox'
import DatePicker from 'antd/es/date-picker'
import Input from 'antd/es/input'
import InputNumber from 'antd/es/input-number'
import Radio from 'antd/es/radio'
import Select from 'antd/es/select'
import axios from 'axios-observable'
import { Observable, Subject, never } from 'rxjs'
import { map } from 'rxjs/operators'
import Template from '@billypon/react-template'
import { Dictionary } from '@billypon/ts-types'

import { FormComponent, FormComponentState } from './form'
import { parseResponse } from './ajax'

function useNodeOrCallFunction(nodeOrFunction: React.ReactNode | ((...args: unknown[]) => React.ReactNode), ...args: unknown[]): React.ReactNode {
  if (nodeOrFunction) {
    if (nodeOrFunction instanceof Function) {
      return (nodeOrFunction as Function).apply(this, args)
    } else {
      return nodeOrFunction as React.ReactNode
    }
  }
}

interface SimpleFormProps {
  _ref: SimpleFormRef
  states: Dictionary<FormState>
  onSubmit: (values: Dictionary) => void
}

interface SimpleFormState {
  fields: Dictionary<FormField>
  hideFields: boolean
}

export class SimpleForm extends FormComponent<FormComponentProps & SimpleFormProps, FormComponentState & SimpleFormState> {
  constructor(props) {
    super(props)
    const { setFieldsValue, getFieldValue, validateFields, resetFields } = props.form
    Object.assign(this.state, { fields: this.initForm() })
    if (props._ref) {
      Object.assign(props._ref, {
        _submit: this.submitForm,
        _setFieldsValue: setFieldsValue,
        _getFieldValue: getFieldValue,
        _validateFields: validateFields,
        _resetFields: resetFields,
        _setFieldError: this.setErrors,
        _resetFieldError: (name: string) => this.errors[name] = null,
        _isLoading: () => this.state.loading,
        _setLoading: loading => this.setState({ loading }),
      })
    }
  }

  formInit() {
    this.setState({ hideFields: true })
  }

  protected getFormFields(states = this.props.states, prefix = '') {
    const fields: Dictionary<GetFieldDecoratorOptions> = { }
    Object.entries(states).forEach(([ name, state ]: [ string, FormState ]) => {
      if (!state.children) {
        fields[prefix + name] = {
          initialValue: state.value,
          rules: state.rules,
          validateFirst: true,
          preserve: true,
        }
        if (state.type === 'checkbox' && state.subtype !== 'group') {
          fields[prefix + name].valuePropName = 'checked'
        }
      } else {
        Object.assign(fields, this.getFormFields(state.children, `${ name }.`))
      }
    })
    return fields
  }

  protected initForm(states = this.props.states, prefix = ''): Dictionary<FormField> {
    const fields: Dictionary<FormField> = { }
    Object.entries(states).forEach(([ name, state ]: [ string, FormState ]) => {
      const {
        label,
        value,
        placeholder,
        type,
        subtype,
        rules,
        addition = { },
        disabled,
        hidden,
        helpText = { },
        extraText,
      } = state
      const render = state.render || { } as FormStateItemRender

      if (state.children) {
        fields[name] = { label, children: this.initForm(state.children) }
        return
      }

      addition.label = addition.label !== undefined ? addition.label : true
      addition.class = addition.class || { }
      ;[ 'item', 'label', 'control' ].forEach(x => addition.class[x] = addition.class[x] || '')
      Object.keys(helpText).forEach(x => {
        helpText[x] = typeof helpText[x] === 'function' ? helpText[x] : () => helpText[x] as string
      })
      const renderHelp = render.help
      const renderExtra = render.extra
      render.item = render.item || this.renderItem.bind(this)
      render.control = render.control || this.renderField.bind(this)
      if (renderHelp) {
        render.help = renderHelp instanceof Function ? renderHelp : () => renderHelp
      }
      if (renderExtra) {
        render.extra = renderExtra instanceof Function ? renderExtra : () => renderExtra
      }
      const afterChange = new Subject<any>()

      fields[name] = {
        label: !addition.label ? '' : type !== 'checkbox' || subtype === 'group' ? label : ' ',
        placeholder: placeholder === undefined ? label : (placeholder || ''),
        type: type || 'input',
        subtype: subtype || 'text',
        addition,
        disabled: typeof disabled === 'function' ? disabled : () => disabled,
        hidden: typeof hidden === 'function' ? hidden : () => hidden,
        extraText: extraText instanceof Function ? extraText : () => extraText,
        helpText: helpText as Dictionary<(state: object) => string>,
        render: render as FormFieldItemRender,
        afterChange,
        onChange: (event: React.ChangeEvent<HTMLFormType>) => afterChange.next(event.target.value),
      }

      if (type === 'select') {
        this.setSelectValidFn(prefix + name)
        const selectAddition: SelectAddition = addition || { }
        if (selectAddition.dataFrom) {
          if (typeof selectAddition.dataFrom === 'string') {
            axios.get(selectAddition.dataFrom).pipe(parseResponse).subscribe((items: SelectDataOption[]) => {
              selectAddition.data = items
              this.triggerUpdate()
            })
          } else if (selectAddition.dataFrom instanceof Observable) {
            selectAddition.dataFrom.subscribe(items => {
              selectAddition.data = items
              this.triggerUpdate()
            })
          } else if ([ 'query', 'param' ].every(x => !selectAddition.dataFrom[x])) {
            this.loadSelectData(selectAddition)
          } else {
            [ 'query', 'param' ].forEach(x => {
              if (selectAddition.dataFrom[x]) {
                this.initSelect(selectAddition, x)
              }
            })
          }
        }
      }
    })
    return fields
  }

  protected initSelect(addition: SelectAddition, name: string): void {
    const { getFieldValue } = this.props.form
    const params = addition.dataFrom[name]
    let load: boolean = true
    Object.keys(params).forEach(x => {
      const path = params[x]
      if (path[0] === '#') {
        const field = this.state.fields[path.substr(1)]
        if (field) {
          field.afterChange.subscribe(value => {
            params[x] = value
            if (value) {
              this.loadSelectData(addition)
            } else {
              addition.data = [ ]
            }
          })
        }
      }
      load = load && path[0] !== '#'
    })
    if (load) {
      this.loadSelectData(addition)
    }
  }

  protected loadSelectData(addition: SelectAddition): void {
    const dataFrom = addition.dataFrom as SelectDataFrom
    const { query, param, observe, parse } = dataFrom
    let url: string = dataFrom.url || addition.dataFrom as string
    if (url) {
      if (param) {
        Object.keys(param).forEach(x => url = url.replace(':' + x, param[x]))
      }
      let observable = axios.get(url, { params: query }).pipe(parseResponse)
      if (!observe) {
        observable = observable.pipe(map((result: any) => parse ? parse(result) : result as SelectDataOption[]))
      }
      observable.subscribe(items => {
        addition.data = items
        this.triggerUpdate()
      })
    }
  }

  protected formSubmit(values: Dictionary) {
    if (this.props.onSubmit) {
      this.props.onSubmit(values)
    }
  }

  protected renderItem(props: FormItemRenderProps): React.ReactNode {
    const { hideFields } = this.state
    const { name, field } = props
    const { addition, hidden, extraText, render } = field
    const renderExtra = render.extra || extraText
    const { FormItem } = this as any
    if (hideFields && hidden()) {
      return null
    }
    return <FormItem key={ name } name={ name } label={ field.label } help={ render.help } extra={ renderExtra } decorator={ addition.decorator }>{ field.render.control(props) }</FormItem>
  }

  protected renderField(props: FormItemRenderProps): React.ReactNode {
    const { field } = props
    let render: (props: FormItemRenderProps) => React.ReactNode
    switch (field.type) {
      case 'text':
        render = this.renderStatic
        break
      case 'input':
        render = this.renderInput
        break
      case 'input-number':
        render = this.renderInputNumber
        break
      case 'select':
        render = this.renderSelect
        break
      case 'checkbox':
        render = this.renderCheckbox
        break
      case 'radio':
        render = this.renderRadio
        break
      case 'datetime':
        render = this.renderDatetime
        break
    }
    return render && render(props)
  }

  protected renderStatic({ value, field }: FormItemRenderProps): React.ReactNode {
    return value
      ? <span className="ant-form-text">{ value }</span>
      : <span className="ant-form-text-placeholder">{ field.placeholder }</span>
  }

  protected renderInput(props: FormItemRenderProps): React.ReactNode {
    const { field, addition, validate } = props
    const inputAddition = addition as InputAddition
    if (!inputAddition.multiline) {
      const InputComponent = field.subtype !== 'password' ? Input : Input.Password
      const extraProps: Dictionary = field.subtype !== 'password' ? { } : { visibilityToggle: (inputAddition as InputPasswordAddition).toggle === true }
      extraProps.disabled = field.disabled()
      if (!(inputAddition.addonBefore || inputAddition.addonAfter || inputAddition.prefix || inputAddition.suffix)) {
        return <InputComponent
          type={ field.subtype }
          placeholder={ field.placeholder }
          size={ addition.size }
          maxLength={ inputAddition.maxLength }
          onBlur={ validate }
          { ...extraProps }
        />
      } else {
        return (
          <Input.Group size={ addition.size }>
            <InputComponent
              type={ field.subtype }
              placeholder={ field.placeholder }
              maxLength={ inputAddition.maxLength }
              addonBefore={ useNodeOrCallFunction(inputAddition.addonBefore, props) }
              addonAfter={ useNodeOrCallFunction(inputAddition.addonAfter, props) }
              prefix={ useNodeOrCallFunction(inputAddition.prefix, props) }
              suffix={ useNodeOrCallFunction(inputAddition.suffix, props) }
              onBlur={ validate }
              { ...extraProps }
            />
          </Input.Group>
        )
      }
    } else {
      return (
        <Input.TextArea
          placeholder={ field.placeholder }
          maxLength={ inputAddition.maxLength }
          onBlur={ validate }
        />
      )
    }
  }

  protected renderInputNumber(props: FormItemRenderProps): React.ReactNode {
    const { field, addition, validate } = props
    const inputNumberAddition = addition as InputNumberAddition
    return (
      <InputNumber
        size={ addition.size }
        formatter={ inputNumberAddition.formatter }
        disabled={ field.disabled() }
        onBlur={ validate }
      />
    )
  }

  protected renderSelect(props: FormItemRenderProps): React.ReactNode {
    const { field, addition, validate } = props
    const selectAddition = addition as SelectAddition
    return (
      <Select
        placeholder={ field.placeholder }
        size={ addition.size }
        allowClear={ selectAddition.allowClear }
        mode={ selectAddition.mode }
        maxTagCount = { selectAddition.maxTagCount }
        maxTagTextLength = { selectAddition.maxTagTextLength }
        disabled={ field.disabled() }
        onDropdownVisibleChange={ validate }
      >
        {
          selectAddition.data && selectAddition.data.map(option => {
            return <Select.Option key={ option.value } value={ option.value }>{ option.label }</Select.Option>
          })
        }
      </Select>
    )
  }

  protected renderCheckbox(props: FormItemRenderProps): React.ReactNode {
    const { field, addition, validate } = props
    const checkboxAddition = addition as CheckboxAddition
    if (field.subtype !== 'group') {
      return (
        <Checkbox
          disabled={ field.disabled() }
          onChange={ validate }
        >{ field.placeholder }</Checkbox>
      )
    } else {
      return (
        <Checkbox.Group
          options={ checkboxAddition.data }
          disabled={ field.disabled() }
          onChange={ validate }
        />
      )
    }
  }

  protected renderRadio(props: FormItemRenderProps): React.ReactNode {
    const { field, addition, validate } = props
    const radioAddition = addition as RadioAddition
    return (
      <Radio.Group
        size={ addition.size }
        options={ field.subtype !== 'button' && radioAddition.data }
        disabled={ field.disabled() }
        onChange={ validate }
      >
        {
          field.subtype == 'button' && radioAddition.data.map(option => {
            return <Radio.Button key={ option.value } value={ option.value }>{ option.label }</Radio.Button>
          })
        }
      </Radio.Group>
    )
  }

  protected renderDatetime(props: FormItemRenderProps): React.ReactNode {
    const { field, addition } = props
    const datePickerAddition = addition as DatePickerAddition
    return (
      <DatePicker.RangePicker
        format={ datePickerAddition.format }
        showTime={ field.subtype.includes('time') }
        disabled={ field.disabled() }
      />
    )
  }

  render() {
    if (!this.fields) {
      return null
    }
    const { FormX, submitForm, validFns } = this as any
    const { form } = this.props
    const { getFieldsValue } = form
    const values = getFieldsValue(Object.keys(this.state.fields))
    return (
      <FormX { ...this.props } onSubmit={ submitForm }>
        {
          Object.entries(this.state.fields).map(([ name, field ]: [ string, FormField ]) => {
            if (!field.children) {
              const value = values[name]
              const { addition } = field
              const validate = validFns[name]
              const props: FormItemRenderProps = { name, value, field, addition, validate, form }
              return field.render.item(props)
            } else {
              return (
                <div key={ name } className="form-group">
                  <div className="form-group-caption">{ field.label }</div>
                  {
                    Object.entries(field.children).map(([ subName, subField ]: [ string, FormField ]) => {
                      const fullName = `${ name }.${ subName }`
                      const value = values[fullName]
                      const { addition } = subField
                      const validate = validFns[fullName]
                      const props: FormItemRenderProps = { name: fullName, value, field: subField, addition, validate, form }
                      return subField.render.item(props)
                    })
                  }
                </div>
              )
            }
          })
        }
      </FormX>
    )
  }
}

export default Form.create({ name: 'simple-form' })(SimpleForm) as any

export interface FormState {
  label: string
  value?: any
  placeholder?: string
  type?: string
  subtype?: string
  rules?: ValidationRule[]
  addition?: FormStateAddition
  disabled?: boolean | (() => boolean)
  hidden?: boolean | (() => boolean)
  helpText?: Dictionary<string | ((state: object) => string)>
  extraText?: string | (() => string)
  render?: FormStateItemRender
  children?: Dictionary<FormState>
}

export interface FormField {
  label: string
  placeholder?: string
  type?: string
  subtype?: string
  addition?: FormStateAddition
  disabled?: () => boolean
  hidden?: () => boolean
  helpText?: Dictionary<(state: object) => string>
  extraText?: () => string
  render?: FormFieldItemRender
  afterChange?: Subject<any>
  onChange?: (event: React.ChangeEvent<HTMLFormType>) => void
  children?: Dictionary<FormField>
}

export interface FormItemRenderProps {
  name: string
  value: any
  field: FormField
  addition: FormStateAddition
  validate: () => void
  form: Omit<WrappedFormUtils, 'getFieldDecorator'>
}

export interface FormStateItemRender {
  item?: FormItemRenderFn
  control?: FormItemRenderFn
  help?: string | FormItemRenderFn
  extra?: string | FormItemRenderFn
}

export interface FormFieldItemRender {
  item?: FormItemRenderFn
  control?: FormItemRenderFn
  help?: FormItemRenderFn
  extra?: FormItemRenderFn
}

export type FormItemRenderFn = (props: FormItemRenderProps) => React.ReactNode

export class SimpleFormRef {
  _submit: () => void
  _setFieldsValue: (object: Object, callback?: Function) => void
  _getFieldValue: (name: string) => any
  _validateFields: (names?: string[], callback?: Function) => void
  _resetFields: () => void
  _setFieldError: (name: string, error: Dictionary) => void
  _resetFieldError: (name: string) => void
  _isLoading: () => boolean
  _setLoading: (loading: boolean) => Observable<void>

  submit = () => {
    if (this._submit) {
      this._submit()
    }
  }

  setFieldsValue = (object: Object, callback?: Function) => {
    if (this._setFieldsValue) {
      this._setFieldsValue(object, callback)
    }
  }

  getFieldValue = (name: string) => {
    return this._getFieldValue && this._getFieldValue(name)
  }

  validateFields = (names?: string[], callback?: Function) => {
    if (this._validateFields) {
      this._validateFields(names, callback)
    }
  }

  resetFields = () => {
    if (this._resetFields) {
      this._resetFields()
    }
  }

  setFieldError = (name: string, error: Dictionary) => {
    if (this._setFieldError) {
      this._setFieldError(name, error)
    }
  }

  resetFieldError = (name: string) => {
    if (this._resetFieldError) {
      this._resetFieldError(name)
    }
  }

  isLoading = () => {
    return this._isLoading && this._isLoading()
  }

  setLoading = (loading: boolean) => {
    if (this._setLoading) {
      return this._setLoading(loading)
    }
    return never()
  }
}

export type HTMLFormType = HTMLInputElement

export interface FormStateAddition {
  size?: 'small' | 'default' | 'large'
  label?: boolean
  validateFirst?: boolean
  class?: {
    item?: string
    label?: string
    control?: string
  }
  decorator?: boolean
}


export interface SelectDataOption<T = any> {
  label: string
  value: T
}

export interface SelectDataFrom<T = any> {
  url: string
  query?: Dictionary<string>
  param?: Dictionary<string>
  observe?: (observable: Observable<any>) => Observable<T[]>
  parse?: (result?: any) => T[]
}

export interface BaseSelectAddition<T = any> extends FormStateAddition {
  data?: SelectDataOption<T>[]
  dataFrom?: string | Observable<SelectDataOption<T>[]> | SelectDataFrom
}

export interface InputAddition extends FormStateAddition {
  maxLength?: number
  addonBefore?: string | FormItemRenderFn
  addonAfter?: string | FormItemRenderFn
  prefix?: string | FormItemRenderFn
  suffix?: string | FormItemRenderFn
  multiline?: boolean
}

export interface InputPasswordAddition extends InputAddition {
  toggle?: boolean
}

export interface InputNumberAddition extends FormStateAddition {
  formatter?: (value: number | string) => string
}

export interface SelectAddition<T = any> extends BaseSelectAddition {
  allowClear?: boolean
  mode?: 'multiple' | 'tags'
  maxTagCount?: number
  maxTagTextLength?: number
}

export interface CheckboxAddition<T = any> extends BaseSelectAddition {
}

export interface RadioAddition<T = any> extends BaseSelectAddition {
}

export interface DatePickerAddition extends FormStateAddition {
  format?: string
}

export function wrapItemTemplate({ template }: Template) {
  return (itemProps: FormItemRenderProps): React.ReactNode => {
    const element = template as React.ReactElement
    const elementProps = element.props
    const elementRender = (renderProps: { }) => {
      Object.assign(renderProps, {
        placeholder: itemProps.field.placeholder,
      })
      return elementProps.render(renderProps, itemProps)
    }
    return {
      ...element,
      props: {
        render: elementRender,
      },
    }
  }
}
