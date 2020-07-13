import React from 'react'
import Form, { FormComponentProps, ValidationRule } from 'antd/es/form'
import { GetFieldDecoratorOptions, WrappedFormUtils } from 'antd/es/form/Form'
import Checkbox from 'antd/es/checkbox'
import DatePicker from 'antd/es/date-picker'
import Input from 'antd/es/input'
import InputNumber from 'antd/es/input-number'
import Radio from 'antd/es/radio'
import Select from 'antd/es/select'
import Switch from 'antd/es/switch'
import { getValueFromEvent } from 'rc-form/es/utils'
import axios from 'axios-observable'
import { Observable, Subject, never } from 'rxjs'
import { map } from 'rxjs/operators'
import Template from '@billypon/react-template'
import { Dictionary, StringDictionary } from '@billypon/ts-types'

import { FormComponent, FormComponentState } from './form'
import { parseResponse } from './ajax'
import { getParentNode } from './common'

function useNodeOrCallFunction(nodeOrFunction: React.ReactNode | ((...args: unknown[]) => React.ReactNode), ...args: unknown[]): React.ReactNode {
  if (nodeOrFunction) {
    if (nodeOrFunction instanceof Function) {
      return (nodeOrFunction as Function).apply(this, args)
    } else {
      return nodeOrFunction as React.ReactNode
    }
  }
}

interface RenderTextProps {
  value?: unknown
  placeholder?: string
  html?: boolean
}

class RenderText extends React.Component<RenderTextProps> {
  render() {
    const { value, placeholder, html } = this.props
    return [ undefined, null ].includes(value)
      ? <span className="ant-form-text-placeholder">{ placeholder }</span>
      : !html
        ? <span className="ant-form-text">{ value }</span>
        : <span className="ant-form-text" dangerouslySetInnerHTML={{ __html: value.toString() }}></span>
  }
}

interface SimpleFormProps {
  _ref: SimpleFormRef
  states: FormStates
  onSubmit: (values: Dictionary) => void
}

interface SimpleFormState {
  fields: FormFields
  hideFields: boolean
}

export class SimpleForm extends FormComponent<FormComponentProps & SimpleFormProps, FormComponentState & SimpleFormState> {
  constructor(props) {
    super(props)
    const { setFieldsValue, getFieldValue, getFieldsValue, validateFields, resetFields } = props.form
    Object.assign(this.state, { fields: this.initForm() })
    if (props._ref) {
      Object.assign(props._ref, {
        _submit: this.submitForm,
        _setFieldsValue: setFieldsValue,
        _getFieldValue: getFieldValue,
        _getFieldsValue: getFieldsValue,
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
        let valuePropName: string
        if (state.type === 'switch') {
          valuePropName = 'checked'
        } else if (state.type === 'checkbox' && state.subtype !== 'group') {
          valuePropName = 'checked'
        }
        if (valuePropName) {
          fields[prefix + name].valuePropName = valuePropName
        }
      } else {
        Object.assign(fields, this.getFormFields(state.children, `${ name }.`))
      }
    })
    return fields
  }

  protected initForm(states = this.props.states, prefix = ''): FormFields {
    const fields: FormFields = { }
    Object.entries(states).forEach(([ name, state ]: [ string, FormState ]) => {
      const {
        label,
        value,
        type,
        subtype,
        placeholder,
        rules,
        addition = { },
        disabled,
        hidden,
        helpText = { },
        extraText,
        onChange,
      } = state
      const render = state.render || { } as FormStateItemRender

      if (state.children) {
        fields[name] = { label, children: this.initForm(state.children) }
        return
      }

      addition.label = addition.label !== undefined ? addition.label : true
      addition.class = addition.class || { }
      ;[ 'item', 'label', 'control' ].forEach(x => {
        const className = addition.class[x]
        addition.class[x] = (!Array.isArray(className) ? className as string : (className as string[]).join(' ')) || ''
      })
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
        type: type || 'input',
        subtype: subtype || 'text',
        placeholder: placeholder === undefined ? label : (placeholder || ''),
        addition,
        disabled: typeof disabled === 'function' ? disabled : () => disabled,
        hidden: typeof hidden === 'function' ? hidden : () => hidden,
        extraText: extraText instanceof Function ? extraText : () => extraText,
        helpText: helpText as Dictionary<(state: object) => string>,
        render: render as FormFieldItemRender,
        afterChange,
        onChange: (event: unknown, ...args: unknown[]) => {
          const value = getValueFromEvent(event)
          afterChange.next(value)
          if (onChange) {
            onChange(value, ...args)
          }
        },
      }

      switch (type) {
        case 'select':
          this.setSelectValidFn(prefix + name)
          this.initSelect(addition)
          break
        case 'checkbox':
          if (subtype === 'group') {
            this.initSelect(addition)
          }
          break
        case 'radio':
          this.initSelect(addition)
          break
      }
    })
    return fields
  }

  protected initSelect(addition: BaseSelectAddition = { }): void {
    if (addition.dataFrom) {
      if (typeof addition.dataFrom === 'string') {
        axios.get(addition.dataFrom).pipe(parseResponse).subscribe((items: SelectDataOption[]) => {
          addition.data = items
          this.triggerUpdate()
        })
      } else if (addition.dataFrom instanceof Observable) {
        addition.dataFrom.subscribe(items => {
          addition.data = items
          this.triggerUpdate()
        })
      } else if ([ 'query', 'param' ].every(x => !addition.dataFrom[x])) {
        this.loadSelectData(addition)
      } else {
        [ 'query', 'param' ].forEach(x => {
          if (addition.dataFrom[x]) {
            setTimeout(() => this.observeSelect(addition, x))
          }
        })
      }
    }
  }

  protected observeSelect(addition: BaseSelectAddition, name: string): void {
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

  protected loadSelectData(addition: BaseSelectAddition): void {
    const dataFrom = addition.dataFrom as SelectDataFrom
    const { query, param, from, parse } = dataFrom
    let url: string = dataFrom.url || addition.dataFrom as string
    let observable: Observable<any>
    if (url) {
      if (param) {
        Object.keys(param).forEach(x => url = url.replace(':' + x, param[x]))
      }
      observable = from ? from(query, url) : axios.get(url, { params: query }).pipe(parseResponse)
    } else if (from) {
      observable = from(query)
    }
    if (observable) {
      if (parse) {
        observable = observable.pipe(map(parse))
      }
      observable.subscribe((items: SelectDataOption[]) => {
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
    const label: React.ReactNode = !addition.class.label ? field.label : <div className={ addition.class.label as string }>{ field.label }</div>
    let control = field.render.control(props) as React.ReactElement
    if (addition.class.control) {
      const controlClass = addition.class.control as string
      const controlProps = control.props
      control = {
        ...control,
        props: {
          ...controlProps,
          className: controlProps.className ? `${ controlProps.className } ${ controlClass }` : controlClass,
        },
      }
    }
    return <FormItem key={ name } name={ name } label={ label } help={ render.help } extra={ renderExtra } className={ addition.class.item as string } decorator={ addition.decorator }>{ control }</FormItem>
  }

  protected renderField(props: FormItemRenderProps): React.ReactNode {
    const { field } = props
    let render: (props: FormItemRenderProps) => React.ReactNode
    switch (field.type) {
      case 'text':
        render = this.renderText
        break
      case 'input':
        render = this.renderInput
        break
      case 'input-number':
        render = this.renderInputNumber
        break
      case 'select':
        render = this.renderSelect.bind(this)
        break
      case 'checkbox':
        render = this.renderCheckbox
        break
      case 'radio':
        render = this.renderRadio
        break
      case 'switch':
        render = this.renderSwitch
        break
      case 'datetime':
        render = this.renderDatetime
        break
    }
    return render && render(props)
  }

  protected renderText({ field, addition }: FormItemRenderProps): React.ReactNode {
    const textAddition = addition as TextAddition
    return <RenderText placeholder={ field.placeholder } html={ textAddition.html } />
  }

  protected renderInput(props: FormItemRenderProps): React.ReactNode {
    const { field, addition, validate } = props
    const inputAddition = addition as InputAddition
    if (!inputAddition.multiline) {
      const InputComponent = field.subtype !== 'password' ? Input : Input.Password
      const extraProps: Dictionary = field.subtype !== 'password' ? { } : { visibilityToggle: (inputAddition as InputPasswordAddition).toggle === true }
      extraProps.disabled = field.disabled()
      return <InputComponent
        type={ field.subtype }
        placeholder={ field.placeholder }
        size={ addition.size }
        maxLength={ inputAddition.maxlength }
        readOnly={ inputAddition.readonly }
        addonBefore={ useNodeOrCallFunction(inputAddition.addonBefore, props) }
        addonAfter={ useNodeOrCallFunction(inputAddition.addonAfter, props) }
        prefix={ useNodeOrCallFunction(inputAddition.prefix, props) }
        suffix={ useNodeOrCallFunction(inputAddition.suffix, props) }
        onChange={ field.onChange }
        onBlur={ validate }
        { ...extraProps }
      />
    } else {
      return (
        <Input.TextArea
          placeholder={ field.placeholder }
          maxLength={ inputAddition.maxlength }
          readOnly={ inputAddition.readonly }
          onChange={ field.onChange }
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
        min={ inputNumberAddition.min }
        max={ inputNumberAddition.max }
        step={ inputNumberAddition.step }
        formatter={ inputNumberAddition.formatter }
        parser={ inputNumberAddition.parser }
        disabled={ field.disabled() }
        onChange={ field.onChange }
        onBlur={ validate }
      />
    )
  }

  protected renderSelect(props: FormItemRenderProps): React.ReactNode {
    const { name, field, addition } = props
    const selectAddition = addition as SelectAddition
    let getPopupContainer: (triggerNode: HTMLElement) => HTMLElement
    if (selectAddition.getPopupContainer) {
      switch (selectAddition.getPopupContainer) {
        case 'body':
          break // use default
        case 'parent':
          getPopupContainer = getParentNode
          break
        default:
          getPopupContainer = selectAddition.getPopupContainer as (triggerNode: HTMLElement) => HTMLElement
          break
      }
    }
    const validate = this.validFns[`${ name }_dropdown`]
    return (
      <Select
        placeholder={ field.placeholder }
        size={ addition.size }
        allowClear={ selectAddition.allowClear }
        showSearch={ selectAddition.showSearch }
        optionFilterProp={ selectAddition.optionFilterProp }
        mode={ selectAddition.mode }
        maxTagCount = { selectAddition.maxTagCount }
        maxTagTextLength = { selectAddition.maxTagTextLength }
        disabled={ field.disabled() }
        getPopupContainer={ getPopupContainer }
        onChange={ field.onChange }
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
    const { field, addition } = props
    const checkboxAddition = addition as CheckboxAddition
    if (field.subtype !== 'group') {
      return (
        <Checkbox
          disabled={ field.disabled() }
          onChange={ field.onChange }
        >{ field.placeholder }</Checkbox>
      )
    } else {
      return (
        <Checkbox.Group
          options={ checkboxAddition.data }
          disabled={ field.disabled() }
          onChange={ field.onChange }
        />
      )
    }
  }

  protected renderRadio(props: FormItemRenderProps): React.ReactNode {
    const { field, addition } = props
    const radioAddition = addition as RadioAddition
    return (
      <Radio.Group
        size={ addition.size }
        options={ field.subtype !== 'button' && radioAddition.data }
        disabled={ field.disabled() }
        onChange={ field.onChange }
      >
        {
          field.subtype == 'button' && radioAddition.data && radioAddition.data.map(option => {
            return <Radio.Button key={ option.value } value={ option.value } disabled={ option.disabled }>{ option.label }</Radio.Button>
          })
        }
      </Radio.Group>
    )
  }

  protected renderSwitch(props: FormItemRenderProps): React.ReactNode {
    const { field, addition } = props
    return (
      <Switch
        size={ addition.size !== 'large' ? addition.size : 'default' }
        disabled={ field.disabled() }
        onChange={ field.onChange }
      />
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
        onChange={ field.onChange }
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

export type FormStateType = 'text' | 'input' | 'input-number' | 'select' | 'checkbox' | 'radio' | 'switch' | 'datetime' | string

export interface FormState {
  label: string
  value?: any
  type?: FormStateType
  subtype?: string
  placeholder?: string
  rules?: ValidationRule[]
  addition?: FormStateAddition
  disabled?: boolean | (() => boolean)
  hidden?: boolean | (() => boolean)
  helpText?: Dictionary<string | ((state: object) => string)>
  extraText?: string | (() => string)
  render?: FormStateItemRender
  onChange?: (...args: unknown[]) => void
  children?: FormStates
}

export type FormStates = Dictionary<FormState>

export interface FormField {
  label: string
  type?: FormStateType
  subtype?: string
  placeholder?: string
  addition?: FormStateAddition
  disabled?: () => boolean
  hidden?: () => boolean
  helpText?: Dictionary<(state: object) => string>
  extraText?: () => string
  render?: FormFieldItemRender
  onChange?: (...args: unknown[]) => void
  afterChange?: Subject<any>
  children?: FormFields
}

export type FormFields = Dictionary<FormField>

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
  protected _submit: () => void
  protected _setFieldsValue: (object: Object, callback?: Function) => void
  protected _getFieldValue: (name: string) => any
  protected _getFieldsValue: () => any
  protected _validateFields: (names?: string[], callback?: Function) => void
  protected _resetFields: () => void
  protected _setFieldError: (name: string, error: Dictionary) => void
  protected _resetFieldError: (name: string) => void
  protected _isLoading: () => boolean
  protected _setLoading: (loading: boolean) => Observable<void>

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

  getFieldsValue = () => {
    return this._getFieldsValue && this._getFieldsValue()
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
    item?: string | string[]
    label?: string | string[]
    control?: string | string[]
  }
  decorator?: boolean
}

export interface SelectDataOption<T = any> {
  label: string
  value: T
  disabled?: boolean
}

export interface SelectDataFrom<T = any> {
  url?: string
  query?: StringDictionary
  param?: StringDictionary
  from?: (query: StringDictionary, url?: string) => Observable<unknown>
  parse?: (result?: unknown) => T[]
}

export interface BaseSelectAddition<T = any> extends FormStateAddition {
  data?: SelectDataOption<T>[]
  dataFrom?: string | Observable<SelectDataOption<T>[]> | SelectDataFrom
}

export interface TextAddition extends FormStateAddition {
  html?: boolean
}

export interface InputAddition extends FormStateAddition {
  maxlength?: number
  readonly?: boolean
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
  min?: number
  max?: number
  step?: number | string
  formatter?: (value: number | string) => string
  parser?: (value: string) => number
}

export interface SelectAddition<T = any> extends BaseSelectAddition {
  allowClear?: boolean
  showSearch?: boolean
  optionFilterProp?: 'value' | 'children'
  mode?: 'multiple' | 'tags'
  maxTagCount?: number
  maxTagTextLength?: number
  getPopupContainer?: 'body' | 'parent' | ((triggerNode: HTMLElement) => HTMLElement)
}

export interface CheckboxAddition<T = any> extends BaseSelectAddition {
}

export interface RadioAddition<T = any> extends BaseSelectAddition {
}

export interface DatePickerAddition extends FormStateAddition {
  format?: string
}

export function wrapItemTemplate(getTemplate: Template | (() => Template)) {
  return (itemProps: FormItemRenderProps): React.ReactNode => {
    const template = getTemplate instanceof Template ? getTemplate : getTemplate()
    if (!template) {
      return ''
    }
    const element = template.template as React.ReactElement
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
