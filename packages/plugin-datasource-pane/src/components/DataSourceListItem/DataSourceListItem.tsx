// TODO 抽离 renderItem
import React, { PureComponent, Component, CSSProperties } from 'react';
import { Button, Icon, Checkbox, Tag, Balloon } from '@alifd/next';
import { RuntimeDataSourceConfig as DataSourceConfig } from '@alilc/lowcode-datasource-types';
import cn from 'classnames';
import { DragSource, DropTarget, ConnectDragSource, ConnectDragPreview, ConnectDropTarget } from 'react-dnd';
import _uniqueId from 'lodash/uniqueId';
import type { DataSourceInfoTag } from '../../types';
import { DataSourcePanelMode } from '../../pane';
import { generateClassName } from '../../utils/misc';
import { DataSourcePaneContext } from '../../utils/panel-context';

import './list-item.scss';

export const ListDndTypes = {
  DATASOURCE_ITEM: 'DATASOURCE_ITEM',
};

function defaultRenderInfoTags(dataSource: DataSourceConfig): DataSourceInfoTag[] {
  return [
    {
      type: 'primary',
      content: dataSource.type,
    },
  ];
}

interface DataSourceListItemDragHandlerProps {}

class DataSourceListItemDragHandler extends PureComponent<DataSourceListItemDragHandlerProps> {
  render() {
    return (
      <Button size="small" text>
        <Icon type="list" />
      </Button>
    );
  }
}

export interface IDataSourceListItemOperation {
  title: string;
  type: string;
  disabled?: boolean;
  visible?: boolean;
  icon: string;
}

export interface DataSourceListItemProps {
  className?: string;
  style?: CSSProperties;
  dataSource: DataSourceConfig & { typeTitle: string };
  operations: IDataSourceListItemOperation[];
  connectDragSource: any;
  connectDragPreview: any;
  connectDropTarget: any;
  onOperationClick?: (operationType: string, dataSourceId: string) => void;
  isDragging: boolean;
  isOver: boolean;
  dropResult: any;
  /**
   * 迁移说明：这三个回调原先声明的形参与真实实现/调用点不符
   * （DataSourceList.handleDragOver 只收 1 个 id，handleDrop 不收参数），
   * 按实际实现修正签名，避免类型与运行时行为不一致。
   */
  onStartDrag?: (id: string) => void;
  onDragOver?: (dragOverId: string) => void;
  onDrop?: () => void;
  mode: DataSourcePanelMode;
  onToggleSelect?: (id: string) => void;
  selected: boolean;
  renderInfoTags: (dataSource: DataSourceConfig) => DataSourceInfoTag[];
}

export class DataSourceListItem extends Component<DataSourceListItemProps> {
  static contextType = DataSourcePaneContext;

  // React 19：使用 static contextType 的类需显式声明 context 类型，否则 this.context 为 unknown
  declare context: React.ContextType<typeof DataSourcePaneContext>;

  componentDidUpdate(prevProps: DataSourceListItemProps) {
    if (prevProps.dropResult !== this.props.dropResult) {
      if (this.props.dropResult?.moved) {
        this.handleDragEnd();
      }
    }
    if (
      prevProps.isDragging !== this.props.isDragging &&
      this.props.isDragging
    ) {
      this.props.onStartDrag?.(this.props.dataSource.id);
    }
    if (prevProps.isOver !== this.props.isOver && this.props.isOver) {
      // console.log('is over 2', this.props.dataSource.id);
      this.props.onDragOver?.(this.props.dataSource.id);
    }
  }

  handleDragEnd = () => {
    // 排序结果已由 onDragOver 写入父组件 state，这里只需触发保存
    this.props.onDrop?.();
  };

  handleExportCheckChange = () => {
    this.props.onToggleSelect?.(this.props.dataSource.id);
  };

  render() {
    const {
      operations,
      dataSource,
      className,
      style,
      onOperationClick,
      isDragging,
      mode,
      selected,
      renderInfoTags = defaultRenderInfoTags,
    } = this.props;

    // 拖拽中，需要向右偏移 8p，避免覆盖（React style 用 undefined 表示无内联样式）
    const offsetStyle = mode === DataSourcePanelMode.SORTING ? { marginLeft: '8px' } : undefined;

    return this.props?.connectDropTarget?.(
      this.props?.connectDragPreview?.(
        <div
          className={cn(
            generateClassName('list-item'),
            {
              [generateClassName('list-item-dragging')]: isDragging,
              [generateClassName('list-item-sort')]: mode === DataSourcePanelMode.SORTING,
              [generateClassName('list-item-export')]: mode === DataSourcePanelMode.EXPORTING,
            },
            className,
          )}
          style={style}
        >
          {mode === DataSourcePanelMode.SORTING &&
            this.props.connectDragSource?.(
              <span className={generateClassName('list-item-drag-handle')}>
                <DataSourceListItemDragHandler />
              </span>,
            )}
          {mode === DataSourcePanelMode.EXPORTING && (
            <Checkbox
              className={generateClassName('list-item-export-checkbox')}
              checked={selected}
              onChange={this.handleExportCheckChange}
            />
          )}
          <div className={generateClassName('list-item-title')} style={offsetStyle}>
            <div
              className={generateClassName('list-item-id')}
              title={dataSource.id}
            >
              {dataSource.id}
            </div>
            {
              <div className={generateClassName('list-item-operations')}>
                {operations?.map((operation) => {
                  // TODO 获取不到 dataSourceTypes
                  // if (!this.context.dataSourceTypes?.find((i: any) => i.type === dataSource.type) && operation.type !== 'remove') return null;
                  return (
                    operation.visible && (
                      <DataSourceListItemOperation
                        key={operation.type}
                        dataSourceId={dataSource.id}
                        onOperationClick={onOperationClick}
                        title={operation.title}
                        icon={operation.icon}
                        type={operation.type}
                      />
                    )
                  );
                })}
              </div>
            }
          </div>
          <div className={generateClassName('list-item-desc')} style={offsetStyle}>
            {renderInfoTags(dataSource)?.map?.((tag: DataSourceInfoTag) => {
              if (tag.tooltip === true) {
                return (
                  <Balloon.Tooltip
                    key={_uniqueId('ds-tag-')}
                    delay={100}
                    trigger={
                      <Tag
                        style={{ maxWidth: tag.maxWidth || 120 }}
                        size="small"
                        type={tag.type || 'normal'}
                        color={tag.color}
                      >
                        {tag.content}
                      </Tag>
                    }
                  >
                    {tag.tooltipContent || tag.content}
                  </Balloon.Tooltip>
                );
              }
              return (
                <Tag
                  key={_uniqueId('ds-tag-')}
                  style={{ maxWidth: tag.maxWidth || 120 }}
                  size="small"
                  type={tag.type || 'normal'}
                  color={tag.color}
                >
                  {tag.content}
                </Tag>
              );
            }) ?? null}
          </div>
        </div>,
      ),
    );
  }
}

interface DataSourceListItemOperationProps {
  dataSourceId: string;
  title: string;
  icon?: string;
  type: string;
  // 可选：与父组件 DataSourceListItemProps.onOperationClick 保持一致，
  // 且本组件内部本就以 onOperationClick?.() 方式调用
  onOperationClick?: (operationType: string, dataSourceId: string) => void;
}

export class DataSourceListItemOperation extends PureComponent<DataSourceListItemOperationProps> {
  handleOperationClick = () => {
    const { type, dataSourceId, onOperationClick } = this.props;
    onOperationClick?.(type, dataSourceId);
  };
  render() {
    const { icon, title } = this.props;
    if (!icon) {
      return (
        <Button
          key={title}
          size="small"
          onClick={this.handleOperationClick}
          text
        >
          {title}
        </Button>
      );
    }
    return (
      <Balloon.Tooltip
        key={icon}
        delay={100}
        trigger={
          <Button iconSize="small" className={generateClassName('item-operate')} onClick={this.handleOperationClick} text>
            <Icon type={icon} />
          </Button>
        }
      >
        {title}
      </Balloon.Tooltip>
    );
  }
}
/** 拖拽中的数据项：beginDrag 产出，drop/isDragging 消费 */
interface DataSourceDragItem {
  id: string;
}

/** drop 返回的结果，DataSourceListItem 通过 dropResult prop 读取 */
interface DataSourceDropResult {
  moved: boolean;
  from: string;
  to: string;
}

interface DragCollectedProps {
  connectDragSource: ConnectDragSource;
  connectDragPreview: ConnectDragPreview;
  isDragging: boolean;
}

interface DropCollectedProps {
  connectDropTarget: ConnectDropTarget;
  dropResult: DataSourceDropResult | null;
  isOver: boolean;
}

// DragSource/DropTarget 的 spec 回调形参需要显式泛型才能推断出 props 与 monitor 类型，
// 否则 props 会退化为 {} 导致 `props.dataSource` 报错
const DraggableDataSourceListItem = DragSource<
  DataSourceListItemProps,
  DragCollectedProps,
  DataSourceDragItem,
  DataSourceDropResult
>(
  ListDndTypes.DATASOURCE_ITEM,
  {
    canDrag(_props) {
      return true;
    },

    isDragging(props, monitor) {
      // If your component gets unmounted while dragged
      // (like a card in Kanban board dragged between lists)
      // you can implement something like this to keep its
      // appearance dragged:
      return monitor.getItem()?.id === props?.dataSource?.id;
    },

    beginDrag(props, _monitor, _component): DataSourceDragItem {
      // Return the data describing the dragged item
      return { id: props?.dataSource?.id };
    },

    endDrag(_props, monitor, _component) {
      if (!monitor.didDrop()) {
        // You can check whether the drop was successful
        // or if the drag ended but nobody handled the drop
        return;
      }

      // When dropped on a compatible target, do something.
      // Read the original dragged item from getItem():
      const item = monitor.getItem();

      // You may also read the drop result from the drop target
      // that handled the drop, if it returned an object from
      // its drop() method.
      const dropResult = monitor.getDropResult();

      // This is a good place to call some Flux action
      // CardActions.moveCardToList(item.id, dropResult.listId)
      void item;
      void dropResult;
    },
  },
  (connect, monitor) => {
    return {
      connectDragSource: connect.dragSource(),
      connectDragPreview: connect.dragPreview(),
      isDragging: monitor.isDragging(),
    };
  },
)(DataSourceListItem);

export const DroppableDataSourceListItem = DropTarget<
  DataSourceListItemProps,
  DropCollectedProps,
  DataSourceDragItem,
  DataSourceDropResult
>(
  ListDndTypes.DATASOURCE_ITEM,
  {
    drop: (props, monitor, _component) => {
      if (monitor.didDrop()) {
        return undefined;
      }
      const item = monitor.getItem();
      return { moved: true, from: item.id, to: props?.dataSource?.id };
    },
  },
  (connect, monitor) => {
    return {
      connectDropTarget: connect.dropTarget(),
      dropResult: monitor.getDropResult(),
      isOver: monitor.isOver(),
    };
  },
)(DraggableDataSourceListItem);
