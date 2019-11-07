import React from 'react'
import Table, { TableProps, ColumnProps } from 'antd/es/table'
import { PaginationProps } from 'antd/es/pagination'
import { Observable } from 'rxjs'
import { map } from 'rxjs/operators'
import { Dictionary } from '@billypon/ts-types'

import { Component } from './react'

interface ColumnRender {
  render?: (text: any, record: any, index: number) => React.ReactNode
  props?: {
    colSpan?: number
    rowSpan?: number
  }
}

export function TableX(props: TableProps<any>) {
  const children = (props.children as React.ReactElement<ColumnProps<any>>[]).map(element => {
    const elementProps = { ...element.props }
    return { ...element, props: elementProps }
  })
  const columns = props.columns || children.map(element => element.props)
  if (columns.length) {
    const renders: Dictionary<ColumnRender> = { }
    Object.entries(props).forEach(([ key, value ]) => {
      if (key.startsWith('column-')) {
        const [ _, indexOrKey, prop ] = key.split('-')
        let colIndex = parseInt(indexOrKey, 10)
        colIndex = !Number.isNaN(colIndex) ? colIndex : columns.findIndex((column) => column.key === indexOrKey)
        const column = columns[colIndex]
        if (column) {
          renders[colIndex] = renders[colIndex] || { props: { } }
          column.render = (text, record, index) => {
            const { render, props } = renders[colIndex] || { }
            return {
              children: render && (typeof render !== 'function' ? render : render(text, record, index)),
              props,
            }
          }
          if (!prop || prop === 'render') {
            renders[colIndex].render = value
          } else {
            renders[colIndex].props[prop] = value
          }
        }
      }
    })
  }

  return (
    <Table
      { ...props }
    >
      { children }
    </Table>
  )
}

export interface ListState<T = any> {
  items: T[]
  loading: boolean
}

export abstract class TableComponent<P = { }, S extends ListState = ListState, T = any> extends Component<P, S> {
  pageNumber = 1
  pageSize = 10
  totalCount = 0

  private TableX = (props: TableProps<T>) => {
    const dataSource = props.dataSource || this.state.items
    const pagination: PaginationProps = {
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
