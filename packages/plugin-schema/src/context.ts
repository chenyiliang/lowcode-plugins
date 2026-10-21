import type { ReactNode } from 'react';
import type { IPublicModelPluginContext } from '@alilc/lowcode-types';

/**
 * 本插件会把 createIntl() 产出的国际化方法挂到 ctx 上，方便子组件直接调用。
 * 这几个字段并不属于 lowcode 官方的 IPublicModelPluginContext，
 * 故在此显式扩展，而不是把整个 ctx 放宽成 any。
 */
export interface SchemaPluginContext extends IPublicModelPluginContext {
  intl: (id: string, params?: object) => string;
  intlNode: (id: string, params?: object) => ReactNode;
  getLocale: () => string;
}
