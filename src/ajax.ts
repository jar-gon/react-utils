import { AxiosObservable } from 'axios-observable/lib/axios-observable.interface'
import { Observable } from 'rxjs'
import { map } from 'rxjs/operators'

export function parseResponse<T = any>(observable: AxiosObservable<T>): Observable<T> {
  return observable.pipe(map(({ data }) => data))
}
