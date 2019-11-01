import { ValidatorFn } from '../form'

export function test(fn: (value: any) => boolean): ValidatorFn {
  return function (rule, value, callback) {
    if (fn(value)) {
      callback()
    } else {
      callback(rule.message)
    }
  }
}

export function requiredBy(getFn: () => any, testFn?: (value: any, fieldValue: any) => boolean): ValidatorFn {
  return function (rule, value, callback) {
    let valid: boolean = !!value
    if (!valid) {
      const fieldValue = getFn()
      valid = !testFn ? !fieldValue : testFn(value, fieldValue)
    }
    callback(valid ? undefined : rule.message)
  }
}

export function equalWith(getFn: () => any): ValidatorFn {
  return function (rule, value, callback) {
    callback(value === getFn() ? undefined : rule.message)
  }
}
