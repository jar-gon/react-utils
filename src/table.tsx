import React, { ReactElement } from 'react'
import Table, { TableProps, ColumnProps } from 'antd/es/table'
import { PaginationProps } from 'antd/es/pagination'
import { Observable } from 'rxjs'
import { isFragment } from 'react-is'
import { Dictionary } from '@billypon/ts-types'

import { Component } from './react'

interface CellType {
  colSpan?: number
  rowSpan?: number
}

interface RenderedCell {
  props?: CellType
  children?: React.ReactNode
}

interface TableXColumnProps extends ColumnProps<any> {
  renderProps?: CellType
}

export function TableX(props: TableProps<any>) {
  let columns = props.children as ReactElement[]
  if (!Array.isArray(columns)) {
    columns = [ columns as ReactElement ]
  }
  columns = (columns.map(x => !isFragment(x) ? x : (x as ReactElement).props.children) as any)
    .flat()
    .filter(Boolean)
  const children = (columns as ReactElement<ColumnProps<any>>[]).map(element => {
    const elementProps = { ...element.props }
    return { ...element, props: elementProps }
  })
  const columnProps = (props.columns || children.map(element => element.props)) as TableXColumnProps[]
  if (columnProps.length) {
    const cells: RenderedCell[] = [ ]
    Object.entries(props).filter(([ key ]) => key.startsWith('column-')).forEach(([ key, value ]) => {
      const [ _, indexOrKey, prop ] = key.split('-')
      let columnIndex = parseInt(indexOrKey, 10)
      columnIndex = !Number.isNaN(columnIndex) ? columnIndex : columnProps.findIndex((column) => column.key === indexOrKey)
      const column = columnProps[columnIndex]
      if (column) {
        let cell = cells[columnIndex]
        if (!cell) {
          const columnRender = (column.render || { }) as RenderedCell
          cells[columnIndex] = { children: columnRender.children || columnRender, props: column.renderProps || { } }
          cell = cells[columnIndex]
          column.render = (text, record, index) => {
            const render = cell.children
            return {
              props: cell.props,
              children: render && (typeof render !== 'function' ? render : render(text, record, index)),
            }
          }
        }
        if (!prop) {
          cell.children = value
        } else {
          cell.props[prop] = value
        }
      }
    })
    columnProps.filter((column, index) => column.renderProps && !cells[index]).forEach(column => {
      const columnRender = (column.render || { }) as RenderedCell
      const render = columnRender.children || columnRender
      column.render = (text, record, index) => ({
        props: column.renderProps,
        children: render && (typeof render !== 'function' ? render : render(text, record, index)),
      })
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

export interface ListProps<T = any> {
  rowKey: string
  onLoad: (pageSize: number, pageNumber: number) => Observable<T[]>
}

export interface ListState<T = any> {
  items: T[]
  loading: boolean
}

export class TableComponent<P = ListProps, S extends ListState = ListState, T = any> extends Component<P, S> {
  pageNumber = 1
  pageSize = 10
  totalCount = 0
  pagination = true
  showSizeChanger = true

  private TableX = (props: TableProps<T>) => {
    const dataSource = props.dataSource || this.state.items
    const pagination: PaginationProps = this.pagination && {
      current: this.pageNumber,
      pageSize: this.pageSize,
      total: this.totalCount,
      showSizeChanger: this.showSizeChanger,
      onChange: this.changePage,
      onShowSizeChange: this.changeSize,
    }
    return (
      <TableX
        { ...props }
        dataSource={ dataSource }
        loading={ !dataSource }
        pagination={ pagination }
      >
        { props.children }
      </TableX>
    )
  }

  protected changePage = (page: number) => {
    this.pageNumber = page
    this.loadItems()
  }

  protected changeSize = (current: number, size: number) => {
    this.pageSize = size
    this.loadItems()
  }

  componentDidMount() {
    this.loadItems()
  }

  loadItems(): void {
    this.setState({ loading: true })
    this.onLoadItems().subscribe(items => this.setState({ items, loading: false }))
  }

  protected onLoadItems(): Observable<T[]> {
    const { onLoad } = this.props as any
    return onLoad && onLoad(this.pageSize, this.pageNumber)
  }

  render() {
    const { TableX } = this
    const { rowKey } = this.props as any
    return (
      <TableX rowKey={ rowKey }>{ this.props.children }</TableX>
    )
  }
}
