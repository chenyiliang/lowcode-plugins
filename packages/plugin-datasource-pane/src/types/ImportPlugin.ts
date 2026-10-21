import type { ComponentType } from 'react';
import { RuntimeDataSourceConfig as DataSourceConfig } from '@alilc/lowcode-datasource-types';
import { DataSourceType } from './DataSourceType';

// 导入插件
export interface DataSourcePaneImportPlugin {
  name: string;
  title: string;
  /**
   * 迁移说明：原声明为 `React.ReactNode`，但面板是以 `<Component ... />` 方式渲染它的
   * （见 pane/DataSourcePane.tsx），ReactNode 含 string/number 等不可作为 JSX 组件的类型，
   * 声明与用法不符。改为 ComponentType 才是真实契约。
   */
  component: ComponentType<any>;
  componentProps?: DataSourcePaneImportPluginCustomProps;
}

export interface DataSourcePaneImportPluginCustomProps extends DataSourcePaneImportPluginComponentProps {
  [customPropName: string]: any;
}

export interface DataSourcePaneImportPluginComponentProps {
  dataSourceTypes: DataSourceType[];
  onImport?: (dataSourceList: DataSourceConfig[]) => void;
  onCancel?: () => void;
}

export type { DataSourceConfig };
