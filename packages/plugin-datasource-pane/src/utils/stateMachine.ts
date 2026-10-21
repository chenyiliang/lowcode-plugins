import {
  createActor,
  assign,
  setup,
  type Actor,
  type SnapshotFrom,
  type AnyStateMachine,
} from 'xstate';
import { RuntimeDataSourceConfig as DataSourceConfig } from '@alilc/lowcode-datasource-types';
import _uniqueId from 'lodash/uniqueId';
import { DataSourceType } from '../types';

export interface DataSourcePaneStateContext {
  dataSourceList: DataSourceConfig[];
  dataSourceListFilter: {
    /**
     * 按数据源类型名过滤（与 DataSourceConfig.type 比较，故为 string）。
     *
     * 迁移说明：原声明写的是 `type?: DataSourceType`（一个对象类型），但面板所有读写方
     * 用的都是 `dataSourceType` 字段且与字符串比较，`type` 从未被使用——属既有的
     * 类型声明与实现不一致。这里按真实实现改名为 `dataSourceType?: string`。
     */
    dataSourceType?: string;
    keyword: string;
    renderKey: number;
  };
  detail: {
    visible: boolean;
    title?: string;
    target?: string;
    ok?: boolean;
    okText?: string;
    cancelText?: string;
    data?: any;
  };
  sort: {
    dataSourceList: DataSourceConfig[];
  };
  export: {
    selectedDataSourceIdList: string[];
  };
}

/**
 * 面板状态机事件全集。
 *
 * 迁移说明：xstate v4 的 `createMachine<TContext, TEvent>` 泛型在 v5 被移除，
 * 改由 `setup({ types })` 声明；且 v5 会严格校验 `assign` 里访问的 event 字段，
 * 因此这里补全了此前缺失的 payload 字段（原代码在 assign 里读取 event.payload /
 * event.dataSourceId 等，但联合类型中并未声明，属于既有的类型漏洞）。
 */
export type DataSourcePaneStateEvent =
  | { type: 'UPDATE_DS'; payload: DataSourceConfig[] }
  | { type: 'FINISH_IMPORT'; payload: DataSourceConfig[] }
  | { type: 'SHOW_EXPORT_DETAIL'; payload?: any }
  | { type: 'SHOW_IMPORT_DETAIL'; pluginName: string }
  | { type: 'START_EXPORT' }
  | { type: 'START_SORT' }
  | { type: 'START_CREATE'; dataSourceType: DataSourceType }
  | { type: 'DETAIL_CANCEL' }
  | { type: 'START_EDIT'; dataSourceId: string; dataSourceTypes: DataSourceType[] }
  | { type: 'FILTER_CHANGE'; payload: Partial<DataSourcePaneStateContext['dataSourceListFilter']> }
  | { type: 'FINISH_SORT' }
  | { type: 'SORT_UPDATE' }
  | { type: 'FINISH_EXPORT' }
  | { type: 'FINISH_CREATE'; payload: DataSourceConfig[] }
  | { type: 'FINISH_EDIT'; payload: DataSourceConfig }
  | { type: 'REMOVE'; dataSourceId: string }
  | { type: 'SAVE_SORT'; payload: DataSourceConfig[] }
  | { type: 'CANCEL_SORT' }
  | { type: 'START_VIEW'; dataSourceId: string; dataSourceTypes: DataSourceType[] }
  | { type: 'START_DUPLICATE'; dataSourceId: string; dataSourceTypes: DataSourceType[] }
  | { type: 'EXPORT.toggleSelect'; dataSourceId: string };

export type DataSourcePaneMachine = ReturnType<typeof createStateMachine>;

export type DataSourcePaneSnapshot = SnapshotFrom<DataSourcePaneMachine>;

/**
 * 与 xstate v4 的 State 对齐的快照类型。
 *
 * v5 的 snapshot **不再提供** `changed` 与 `event` 字段（已实测确认二者均为 undefined），
 * 而本面板的 onSchemaChange 逻辑依赖它们，因此由 createDataSourceService 包装补齐。
 */
export type DataSourcePaneState = DataSourcePaneSnapshot & {
  /** 相对上一次快照是否发生了状态转移（v4 语义） */
  changed: boolean | undefined;
  /** 触发本次快照的事件（v4 语义），初始为 { type: 'xstate.init' } */
  event: DataSourcePaneStateEvent | { type: 'xstate.init' };
};

/** v4 `interpret(machine)` 返回值的等价物（含 v4 快照字段） */
export interface DataSourcePaneService {
  getSnapshot(): DataSourcePaneState;
  send(event: DataSourcePaneStateEvent | string): void;
  subscribe(listener: (state: DataSourcePaneState) => void): { unsubscribe(): void };
  start(): DataSourcePaneService;
  stop(): DataSourcePaneService;
}

const INIT_EVENT = { type: 'xstate.init' } as const;

export const createStateMachine = (dataSourceList: DataSourceConfig[] = []) =>
  setup({
    types: {} as {
      context: DataSourcePaneStateContext;
      events: DataSourcePaneStateEvent;
    },
  }).createMachine({
    id: 'dataSourcePane',
    initial: 'idle',
    context: {
      dataSourceList,
      dataSourceListFilter: {
        dataSourceType: undefined,
        keyword: '',
        renderKey: 1,
      },
      detail: {
        visible: false,
        target: 'idle',
      },
      sort: {
        dataSourceList: [],
      },
      export: {
        selectedDataSourceIdList: [],
      },
    },
    states: {
      idle: {
        on: {
          UPDATE_DS: {
            actions: assign({
              dataSourceList: ({ event }) => event.payload,
            }),
          },
        },
      },
      sort: {
        on: {
          CANCEL_SORT: 'idle',
          SAVE_SORT: {
            actions: assign({
              sort: ({ event }) => ({ dataSourceList: event.payload }),
            }),
          },
          FINISH_SORT: {
            target: 'idle',
            actions: assign({
              dataSourceList: ({ context }) => context.sort.dataSourceList,
            }),
          },
        },
      },
      exit: {
        type: 'final',
      },
      export: {
        on: {
          FINISH_EXPORT: {
            target: 'idle',
            actions: assign({
              export: () => ({ selectedDataSourceIdList: [] }),
            }),
          },
          'EXPORT.toggleSelect': {
            actions: assign({
              export: ({ context, event }) => {
                const { selectedDataSourceIdList } = context.export;
                const index = selectedDataSourceIdList.indexOf(event.dataSourceId);
                if (index !== -1) {
                  return {
                    selectedDataSourceIdList: selectedDataSourceIdList
                      .slice(0, index)
                      .concat(selectedDataSourceIdList.slice(index + 1)),
                  };
                }
                return {
                  selectedDataSourceIdList: context.export.selectedDataSourceIdList.concat(
                    event.dataSourceId,
                  ),
                };
              },
            }),
          },
          SHOW_EXPORT_DETAIL: {
            target: 'detail.export',
            actions: assign({
              detail: ({ event }) => ({
                visible: true,
                title: '导出',
                // okText: '创建',
                target: 'export',
                data: event.payload,
              }),
            }),
          },
        },
      },
      detail: {
        initial: 'idle',
        on: {
          DETAIL_CANCEL: {
            target: 'idle',
            actions: assign({
              detail: {
                visible: false,
              },
            }),
          },
        },
        states: {
          idle: {},
          view: {},
          import: {
            on: {
              FINISH_IMPORT: {
                target: 'idle',
                actions: assign({
                  dataSourceList: ({ context, event }) => {
                    // 直接 concat 会出现重复
                    const filterDataSourceList = context.dataSourceList.filter((item) => {
                      return !event.payload.find(
                        (dataSource: DataSourceConfig) => dataSource.id === item.id,
                      );
                    });

                    return filterDataSourceList.concat(event.payload);
                  },
                  detail: {
                    visible: false,
                  },
                }),
              },
            },
          },
          export: {},
          create: {
            on: {
              /* FINISH_CREATE: {
                            target: 'idle',
                            actions: assign({
                                dataSourceList: (context, event) => {
                                    return context.dataSourceList.concat(event.payload);
                                },
                                detail: {
                                    visible: false
                                }
                            })
                        }, */
            },
          },
          edit: {
            on: {
              /* FINISH_EDIT: {
                            type: 'idle',
                            actions: assign({
                                dataSourceList: (context, event) => {
                                    const nextDataSourceList = [...context.dataSourceList];
                                    const id = context.detail.data.dataSourceId;
                                    const dataSourceUpdateIndex = _findIndex(nextDataSourceList, (dataSource) => dataSource.id === id);
                                    nextDataSourceList[dataSourceUpdateIndex] = event.payload;
                                    return nextDataSourceList;
                                },
                                detail: {
                                    visible: false
                                }
                            })
                        }, */
            },
          },
        },
      },
    },
    // 注意：v5 中根节点的 `on` 目标必须以 '.' 开头（'.sort' 表示根的子状态 sort），
    // 否则抛 "Invalid target: ... is not a valid target from the root node"。
    // 嵌套状态内部的 target 仍按兄弟节点解析，保持不加 '.'。
    on: {
      FINISH_CREATE: {
        target: '.idle',
        actions: assign({
          dataSourceList: ({ context, event }) => context.dataSourceList.concat(event.payload),
          detail: {
            visible: false,
          },
        }),
      },
      FINISH_EDIT: {
        target: '.idle',
        actions: assign({
          dataSourceList: ({ context, event }) => {
            const dataSourceList = [...context.dataSourceList];
            const { id } = context.detail.data.dataSource;
            const dataSourceUpdateIndex = dataSourceList.findIndex(
              (dataSource) => dataSource.id === id,
            );
            dataSourceList[dataSourceUpdateIndex] = event.payload;
            return dataSourceList;
          },
          detail: {
            visible: false,
          },
        }),
      },

      START_EXPORT: '.export',
      START_SORT: {
        target: '.sort',
        actions: assign({
          dataSourceListFilter: ({ context }) => ({
            keyword: '',
            type: undefined,
            renderKey: context.dataSourceListFilter.renderKey + 1,
          }),
        }),
      },
      REMOVE: {
        actions: assign({
          dataSourceList: ({ context, event }) =>
            context.dataSourceList.filter((item) => item.id !== event.dataSourceId),
        }),
      },
      START_CREATE: {
        target: '.detail.create',
        actions: assign({
          detail: ({ event }) => ({
            visible: true,
            title: `创建数据源 ${event.dataSourceType.type}`,
            okText: '创建',
            // target: 'FINISH_CREATE',
            data: {
              dataSourceType: event.dataSourceType,
            },
          }),
        }),
      },
      START_EDIT: {
        target: '.detail.edit',
        actions: assign({
          detail: ({ context, event }) => {
            const dataSource = context.dataSourceList.find((item) => item.id === event.dataSourceId);
            const dataSourceType = event.dataSourceTypes.find((i) => i.type === dataSource?.type);
            return {
              visible: true,
              title: `编辑数据源 ${dataSourceType?.type}`,
              data: {
                dataSource,
                dataSourceType,
              },
            };
          },
        }),
      },
      START_VIEW: {
        target: '.detail.view',
        actions: assign({
          detail: ({ context, event }) => {
            const dataSource = context.dataSourceList.find((item) => item.id === event.dataSourceId);
            return {
              visible: true,
              title: '查看数据源',
              ok: false,
              cancelText: '关闭',
              data: {
                dataSource,
                dataSourceType: event.dataSourceTypes.find((i) => i.type === dataSource?.type),
              },
            };
          },
        }),
      },
      START_DUPLICATE: {
        target: '.detail.create',
        actions: assign({
          detail: ({ context, event }) => {
            const dataSource = context.dataSourceList.find((item) => item.id === event.dataSourceId);
            return {
              visible: true,
              title: '复制数据源',
              data: {
                dataSource: {
                  ...dataSource,
                  id: _uniqueId(`${event.dataSourceId}_`),
                },
                dataSourceType: event.dataSourceTypes.find((i) => i.type === dataSource?.type),
              },
            };
          },
        }),
      },
      FILTER_CHANGE: {
        actions: assign({
          dataSourceListFilter: ({ context, event }) => ({
            ...context.dataSourceListFilter,
            ...event.payload,
          }),
        }),
      },
      SHOW_IMPORT_DETAIL: {
        target: '.detail.import',
        actions: assign({
          detail: ({ event }) => ({
            visible: true,
            title: '导入',
            data: {
              pluginName: event.pluginName,
            },
          }),
        }),
      },
    },
  });

/**
 * 用 xstate v5 的 actor 复现 v4 `interpret(machine)` 的对外契约。
 *
 * 为什么需要这层包装（均已实测确认）：
 * 1. v5 的 snapshot **没有** `changed` 和 `event` 字段，而面板依赖
 *    `state.changed && (state.value === 'idle' || state.event?.type === 'FINISH_IMPORT')`；
 * 2. v5 的 `actor.send('STRING')` 不会触发任何转移（v4 会），而面板有 5 处
 *    `this.send('FINISH_SORT')` 这种裸字符串调用，故在此归一化为 `{ type }`；
 * 3. v4 的 `subscribe` 在注册时立即回放当前状态、且 `start()` 不通知订阅者，
 *    v5 的 `subscribe` 不立即回放、`start()` 会通知一次，需对齐以免多渲染/漏初始化。
 */
export function createDataSourceService(
  machine: DataSourcePaneMachine = createStateMachine(),
): DataSourcePaneService {
  const actor: Actor<any> = createActor(machine);

  let lastSnapshot = actor.getSnapshot();
  let lastEvent: DataSourcePaneStateEvent | { type: 'xstate.init' } = INIT_EVENT;

  const decorate = (snapshot: any, changed: boolean | undefined): DataSourcePaneState =>
    Object.create(snapshot, {
      changed: { value: changed, enumerable: true },
      event: { value: lastEvent, enumerable: true },
    });

  let current: DataSourcePaneState = decorate(lastSnapshot, undefined);
  const listeners = new Set<(state: DataSourcePaneState) => void>();

  const publish = (snapshot: any, changed: boolean | undefined) => {
    current = decorate(snapshot, changed);
    listeners.forEach((listener) => listener(current));
  };

  let inSend = false;
  let emittedDuringSend = false;

  actor.subscribe((snapshot) => {
    if (inSend) {
      emittedDuringSend = true;
      const changed = snapshot !== lastSnapshot;
      lastSnapshot = snapshot;
      publish(snapshot, changed);
    } else {
      // start() 触发的通知：v4 的 interpret().start() 不通知订阅者，此处对齐并吞掉
      lastSnapshot = snapshot;
    }
  });

  // v4 的 interpret() 在 start() 之前 send 的事件会被**缓存**并在 start 后应用；
  // v5 的 createActor 在 start() 前 send 会**直接丢弃**。
  // 本面板的子组件 DataSourcePane 在 componentDidMount 里 send UPDATE_DS，
  // 而父组件的 stateService.start() 在**它自己的** componentDidMount 才执行 ——
  // 子先于父挂载，于是 UPDATE_DS 落在 start 之前，v5 下被丢弃 → 数据源列表恒为空
  // （Edge 实测：面板显示「没有找到数据源」，而 schema 里确有 dataSource.list）。
  // 这里补一个 pre-start 缓冲，恢复 v4 语义。
  let started = false;
  const pendingEvents: DataSourcePaneStateEvent[] = [];

  const doSend = (event: DataSourcePaneStateEvent) => {
    emittedDuringSend = false;
    inSend = true;
    try {
      actor.send(event);
    } finally {
      inSend = false;
    }
    // 未匹配到任何转移时 v5 不会产生新快照，但 v4 仍会通知一次（changed: false）
    if (!emittedDuringSend) {
      lastSnapshot = actor.getSnapshot();
      publish(lastSnapshot, false);
    }
  };

  return {
    getSnapshot() {
      return current;
    },
    send(event) {
      lastEvent = (typeof event === 'string' ? { type: event } : event) as DataSourcePaneStateEvent;
      if (!started) {
        pendingEvents.push(lastEvent);
        return;
      }
      doSend(lastEvent);
    },
    subscribe(listener) {
      listeners.add(listener);
      listener(current);
      return {
        unsubscribe() {
          listeners.delete(listener);
        },
      };
    },
    start() {
      if (started) return this;
      actor.start();
      started = true;
      // 按序重放 start 前缓存的事件（v4 语义）
      while (pendingEvents.length) {
        doSend(pendingEvents.shift() as DataSourcePaneStateEvent);
      }
      return this;
    },
    stop() {
      actor.stop();
      return this;
    },
  };
}

export const createStateService = () => createDataSourceService();

/**
 * 获取未启动状态机的初始快照。
 *
 * xstate v5 移除了 `machine.initialState`（已实测：该属性为 undefined），
 * 等价物是 `createActor(machine).getSnapshot()`——在 start() 之前调用即可拿到
 * 带 value / context / matches 的初始快照，不会启动 actor、也不产生订阅。
 */
export function getInitialSnapshot(
  dataSourceList: DataSourceConfig[] = [],
): DataSourcePaneState {
  return createDataSourceService(createStateMachine(dataSourceList)).getSnapshot();
}
