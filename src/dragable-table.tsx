import React from 'react'
import { DndProvider, DragSource, DropTarget, DragSourceConnector, DropTargetConnector, DropTargetMonitor } from 'react-dnd'
import HTML5Backend from 'react-dnd-html5-backend'

import { Component } from './react'
import { TableX } from './table'

let dragingIndex = -1

export type DragableTableMoveRow = (dragIndex: number, hoverIndex: number) => void

export interface DragableTableDragDropProps {
  index: number
  handler: {
    moveRow: DragableTableMoveRow
  }
}

export interface DragableTableRowProps extends DragableTableDragDropProps {
  isOver: boolean
  className: string
  style: React.CSSProperties
  connectDragSource: Function
  connectDropTarget: Function
}

export class DragableTableRow extends Component<DragableTableRowProps> {
  render() {
    const { index, isOver, connectDragSource, connectDropTarget, ...props } = this.props
    const style = { ...props.style, cursor: 'move' }
    let { className } = props
    style.cursor = 'move'
    if (isOver) {
      let appendClass: string
      if (index > dragingIndex) {
        appendClass = 'drop-over-downward'
      } else if (index < dragingIndex) {
        appendClass = 'drop-over-upward'
      }
      if (appendClass) {
        if (className) {
          className += ' '
        }
        className += appendClass
      }
    }
    return connectDragSource(
      connectDropTarget(<tr { ...props } style={ style } className={ className } />)
    )
  }
}

export interface DragableTableProps {
  onMoveRow: DragableTableMoveRow
  table: Component
}

const tableComponents = {
  body: {
    row: DropTarget(
      'row',
      {
        drop(props: DragableTableDragDropProps, monitor: DropTargetMonitor) {
          const dragIndex = monitor.getItem().index
          const hoverIndex = props.index
          if (dragIndex === hoverIndex) {
            return
          }
          props.handler.moveRow(dragIndex, hoverIndex)
          monitor.getItem().index = hoverIndex
        }
      },
      (connect: DropTargetConnector, monitor: DropTargetMonitor) => ({
        connectDropTarget: connect.dropTarget(),
        isOver: monitor.isOver(),
      }),
    )(
      DragSource(
        'row',
        {
          beginDrag(props: DragableTableDragDropProps) {
            dragingIndex = props.index
            return { index: props.index }
          }
        },
        (connect: DragSourceConnector) => ({ connectDragSource: connect.dragSource() }),
      )(DragableTableRow)
    )
  }
}

export default class DragableTable<T = { }, S = { }> extends Component<DragableTableProps & T, S> {
  protected onRow = (record: unknown, index: number): DragableTableDragDropProps => ({ index, handler: { moveRow: this.props.onMoveRow } })

  render() {
    const { table, ...props } = this.props
    const Table = (table || TableX) as any
    return (
      <DndProvider backend={ HTML5Backend }>
        <Table { ...props } components={ tableComponents } onRow={ this.onRow } />
      </DndProvider>
    )
  }
}
