import React from 'react'
import Table, { TableProps } from 'antd/es/table'
import { PaginationProps } from 'antd/es/pagination'
import { Observable } from 'rxjs'
import { map } from 'rxjs/operators'

import { Component } from './react'

export function TableX(props: TableProps<any>) {
  if (props.columns) {
    Object.entries(props).forEach(([ key, value ]) => {
      if (key.startsWith('column-')) {
        key = key.substr(7)
        let index = parseInt(key, 10)
        if (Number.isNaN(index)) {
          index = props.columns.findIndex((column) => column.key === key)
        }
        if (index >= 0) {
          props.columns[index].render = typeof value === 'string' ? () => value : value
        }
      }
    })
  }

  return (
    <Table
      { ...props }
    >
      { props.children }
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
