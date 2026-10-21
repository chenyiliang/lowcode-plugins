import * as React from 'react';
import { IPublicModelPluginContext } from '@alilc/lowcode-types';
import PluginSchema from './editor';
import { SchemaPluginContext } from './context';
import { enUS, zhCN } from './locale';

interface SchemaPluginOptions {
  isProjectSchema?: boolean;
  [key: string]: unknown;
}

const plugin = (ctx: IPublicModelPluginContext, options: SchemaPluginOptions) => {
  return {
    // 插件的初始化函数，在引擎初始化之后会立刻调用
    init() {
      const { intl, intlNode, getLocale } = ctx.common.utils.createIntl({
        'en-US': enUS,
        'zh-CN': zhCN,
      });
      // 把国际化方法挂到 ctx 上，供子组件使用（见 SchemaPluginContext）
      const schemaCtx = ctx as SchemaPluginContext;
      schemaCtx.intl = intl;
      schemaCtx.intlNode = intlNode;
      schemaCtx.getLocale = getLocale;
      const isProjectSchema = (options && options['isProjectSchema']) === true;

      // 往引擎增加面板
      ctx.skeleton.add({
        area: 'leftArea',
        name: 'LowcodePluginAliLowcodePluginSchema',
        type: 'PanelDock',
        props: {
          align: 'bottom',
          icon: 'ellipsis',
          description: 'Schema',
        },
        panelProps: {
          width: 'calc(100% - 50px)',
        },
        content: () => (
          <PluginSchema
            pluginContext={schemaCtx}
            showProjectSchema={isProjectSchema}
          />
        ),
      })
    },
  };
};

plugin.pluginName = 'LowcodePluginAliLowcodePluginSchema';
plugin.meta = {
  preferenceDeclaration: {
    title: 'schema 面板配置',
    properties: [
      {
        key: 'isProjectSchema',
        type: 'boolean',
        description: '是否是项目级 schema',
        default: false,
      },
    ],
  },
};

export default plugin;
