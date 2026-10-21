import React, { PureComponent } from 'react';
import { Message, Button } from '@alifd/next';
import { InterpretDataSourceConfig } from '@alilc/lowcode-types';
import type { RuntimeDataSource } from '@alilc/lowcode-datasource-types';
import { Project, Event, Setters } from '@alilc/lowcode-shell';
import Logger from 'zen-logger';
import _get from 'lodash/get';
import _set from 'lodash/set';
import _isEmpty from 'lodash/isEmpty';
import _isFunction from 'lodash/isFunction';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { DndProvider } from 'react-dnd';
import { EditorContext } from '../utils/editor-context';
import { DataSourcePane } from './DataSourcePane';
import { DataSourceFilter } from '../components/DataSourceFilter';
import { DataSourceList } from '../components/DataSourceList';
import { DroppableDataSourceListItem } from '../components/DataSourceListItem';
import {
  DataSourcePaneImportPlugin,
  DataSourceType,
  DataSourceConfig,
} from '../types';
import { DataSourceImportPluginCode } from '../components/DataSourceImportPluginCode';
import { JSFunctionComp } from '../components/Forms';
import { ErrorBoundary } from 'react-error-boundary';
import { isSchemaValid, correctSchema } from '../utils/schema';
import { createStateService } from '../utils/stateMachine';
import { DataSourcePaneContext } from '../utils/panel-context';
import { mergeTwoObjectListByKey } from '../utils/misc';
import { common } from '@alilc/lowcode-engine';

import './index.scss';

export interface DataSource {
  list: InterpretDataSourceConfig[];
}

export { DataSourceForm } from '../components/DataSourceForm';

const PLUGIN_NAME = 'dataSourcePane';

export interface DataSourcePanePluginProps {
  event: Event;
  project: Project;
  setters: Setters | null;
  importPlugins?: DataSourcePaneImportPlugin[];
  dataSourceTypes: DataSourceType[];
  exportPlugins?: DataSourcePaneImportPlugin[];
  logger: Logger;
  // 测试用
  defaultSchema?: DataSource | (() => DataSource);
  onSchemaChange?: (schema: DataSource) => void;
  // react-error-boundary 的 onError 形参是 (error: unknown, info: ErrorInfo)
  onError?: (error: unknown, info: React.ErrorInfo) => void;
}

export interface DataSourcePanePluginState {
  /** 面板是否打开 */
  active: boolean;
  panelKey: number;
}

// isolatedModules 下重新导出类型必须用 `export type`
export type { DataSourcePaneImportPlugin, DataSourceType, DataSourceConfig };

const BUILTIN_IMPORT_PLUGINS: DataSourcePaneImportPlugin[] = [
  {
    name: 'default',
    title: '源码',
    component: DataSourceImportPluginCode,
  },
];

// TODO
export function createDataSourcePane() {}

export default class DataSourcePanePlugin extends PureComponent<
  DataSourcePanePluginProps,
  DataSourcePanePluginState
> {
  static displayName = 'DataSourcePanePlugin';

  static defaultProps = {
    dataSourceTypes: [],
    importPlugins: [],
    exportPlugins: [],
  };

  stateService = createStateService();

  state = {
    active: false,
    panelKey: 1,
  };

  constructor(props: DataSourcePanePluginProps) {
    super(props);
    // 第一次 active 事件不会触发监听器
    this.state.active = true;

    const { event } = this.props;
    // @todo pluginName, to unsubscribe
    event.on('skeleton.panel-dock.active', (pluginName: string) => {
      if (pluginName === PLUGIN_NAME) {
        this.setState({ active: true });
      }
    });
    event.on('skeleton.panel-dock.unactive', (pluginName: string) => {
      if (pluginName === PLUGIN_NAME) {
        this.setState({ active: false });
      }
    });

    this.handleSchemaChange.bind(this);
  }

  componentDidMount() {
    this.stateService.start();
  }

  componentWillUnmount() {
    this.stateService.stop();
  }

  // DataSourcePane 通过 onSchemaChange 抛出的是运行时数据源（RuntimeDataSource），
  // 本方法把它写回 project schema 并透传给外部；外部 props 用的是 interpret 形态的 DataSource，
  // 二者仅在 isInit/requestHandler 的类型上有差异，属 interpret↔runtime 边界，故在此收窄。
  handleSchemaChange = (schema: RuntimeDataSource) => {
    const { project, onSchemaChange } = this.props;
    if (project) {
      const docSchema = project.exportSchema(common.designerCabin.TransformStage.Save);
      if (!_isEmpty(docSchema)) {
        _set(docSchema, 'componentsTree[0].dataSource', schema);
        project.importSchema(docSchema);
      }
    }

    onSchemaChange?.(schema as unknown as DataSource);
  };

  handleReset = () => {
    this.setState(({ panelKey }) => ({ panelKey: panelKey + 1 }));
  };

  render() {
    const {
      importPlugins,
      exportPlugins,
      dataSourceTypes,
      defaultSchema,
      project,
      logger,
      onError,
      setters,
    } = this.props;
    const { active, panelKey } = this.state;

    if (!active) return null;

    const projectSchema = project.exportSchema(common.designerCabin.TransformStage.Save) ?? {};
    let schema = defaultSchema;
    if (_isFunction(defaultSchema)) {
      schema = defaultSchema();
    }
    if (!schema) {
      schema = _get(projectSchema, 'componentsTree[0].dataSource');
    }
    if (!isSchemaValid(schema)) {
      logger.warn('发现不合法的 schema', schema);
      schema = correctSchema(schema);
      logger.log('进行修正', schema);
    }

    return (
      <EditorContext.Provider value={{ project, logger, setters }}>
        <DataSourcePaneContext.Provider
          value={{ stateService: this.stateService, dataSourceTypes }}
        >
          <DndProvider backend={HTML5Backend}>
            <ErrorBoundary
              onError={onError}
              FallbackComponent={ErrorFallback}
              onReset={this.handleReset}
              resetKeys={[panelKey]}
            >
              { /* @ts-ignore */ }
              <DataSourcePane
                key={panelKey + 1}
                importPlugins={mergeTwoObjectListByKey<DataSourcePaneImportPlugin>(
                  BUILTIN_IMPORT_PLUGINS as DataSourcePaneImportPlugin[],
                  importPlugins as DataSourcePaneImportPlugin[],
                  'name',
                )}
                exportPlugins={mergeTwoObjectListByKey<DataSourcePaneImportPlugin>(
                  BUILTIN_IMPORT_PLUGINS as DataSourcePaneImportPlugin[],
                  exportPlugins as DataSourcePaneImportPlugin[],
                  'name',
                )}
                dataSourceTypes={dataSourceTypes}
                // schema 来源于 defaultSchema（InterpretDataSourceConfig[]，isInit 可为 JSExpression）
                // 或经 correctSchema 归一化后的值，DataSourcePane 按运行时数据消费（RuntimeDataSource）。
                // 二者仅在 isInit 的 JSExpression 分支上有类型差异，此处是 interpret→runtime 的边界，做一次显式收窄。
                initialSchema={schema as unknown as RuntimeDataSource | undefined}
                onSchemaChange={this.handleSchemaChange}
              />
            </ErrorBoundary>
          </DndProvider>
        </DataSourcePaneContext.Provider>
      </EditorContext.Provider>
    );
  }
}

// react-error-boundary v6 的 FallbackProps：error 为 unknown，resetErrorBoundary 可带任意参数
function ErrorFallback(props: { error: unknown; resetErrorBoundary: (...args: unknown[]) => void }) {
  return (
    <Message type="error" shape="addon" title="渲染异常">
      {props.error instanceof Error ? props.error.message : String(props.error)}
      <Button onClick={props.resetErrorBoundary}>刷新面板</Button>
    </Message>
  );
}

export {
  DataSourceImportPluginCode,
  JSFunctionComp,
  DataSourcePane,
  DataSourceList,
  DroppableDataSourceListItem,
  DataSourceFilter,
  DataSourcePaneContext,
  createStateService,
};

export * from '../datasource-types';
export * from '../types';
