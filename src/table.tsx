import React from 'react'
import Table, { TableProps } from 'antd/es/table'
import { PaginationProps } from 'antd/es/pagination'
import { Observable } from 'rxjs'
import { map } from 'rxjs/operators'

import { Component } from './react'

function getTableX<T = any>(getPagination?: () => PaginationProps) {
  return function (props: TableProps<T>, getPagination?: () => PaginationProps) {
    if (props.columns) {
      Object.entries(props).forEach(([ key, value ]) => {
        if (key.startsWith('column-')) {
          const dataIndex = key.substr(7)
          const render = typeof value === 'string' ? () => value : value
          let index = parseInt(dataIndex, 10)
          if (Number.isNaN(index)) {
            index = props.columns.findIndex((column) => column.dataIndex === dataIndex)
          }
          if (index >= 0) {
            props.columns[index].render = render
          }
        }
      })
    }
    const pagination = this.getPagination ? this.getPagination() : null
    return (
      <Table
        { ...props }
        dataSource={ props.dataSource || this.state.items }
        loading={ !(props.dataSource || this.state.items) }
        rowKey={ props.rowKey || (x => (x as any).id) }
        pagination={ pagination }
      />
    )
  }
}

export interface ListState<T = any> {
  items: T[]
  loading: boolean
}

export abstract class TableComponent<P = { }, S extends ListState = ListState, T = any> extends Component<P, S> {
  pageNumber = 1
  pageSize = 10
  totalCount = 0

  private TableX = getTableX<T>(this.getPagination.bind(this)).bind(this)

  componentDidMount() {
    this.loadItems()
  }

  loadItems(): void {
    this.setState({ loading: true })
    this.onLoadItems().subscribe(items => this.setState({ items, loading: false }))
  }

  protected abstract onLoadItems(): Observable<T[]>

  protected getPagination(): PaginationProps {
    return {
      current: this.pageNumber,
      pageSize: this.pageSize,
      total: this.totalCount,
      onChange: this.changePage.bind(this),
    }
  }

  protected changePage(page: number): void {
    this.pageNumber = page
    this.loadItems()
  }
}
