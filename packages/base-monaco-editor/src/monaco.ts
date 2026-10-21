import loader, { Monaco } from '@monaco-editor/loader';
import isEqual from 'lodash/isEqual';
import { controller, EditorMeta } from './controller';

/**
 * monaco 运行时始终由 @monaco-editor/loader 从 CDN 以 AMD 方式加载，
 * 因此 `monaco-editor` 只作为 devDependency 提供类型，不参与打包。
 *
 * 该 CDN 版本必须与本包 devDependencies 中的 `monaco-editor` 版本保持一致：
 * 例如 `wordBasedSuggestions` 在 monaco 0.45 起由 boolean 改为字符串枚举，
 * 类型与运行时版本错配会导致编辑器行为异常。
 * 升级时请同步修改下面两处 URL 与 package.json 中的版本。
 */
const MONACO_CDN_VERSION = '0.52.2';
const MONACO_CDN_BASE = `https://g.alicdn.com/code/lib/monaco-editor/${MONACO_CDN_VERSION}/min/vs`;

export const getSingletonMonaco = (() => {
  let monaco: Monaco | undefined;
  let prevOptions: any;
  return async (options?: any): Promise<Monaco> => {
    if (!monaco || !isEqual(prevOptions, options)) {
      const hasConfig = Object.keys(options || {}).length > 0;
      loader.config(
        hasConfig
          ? options
          : {
              paths: {
                vs: MONACO_CDN_BASE,
              },
            },
      );
      // eslint-disable-next-line require-atomic-updates
      monaco = await loader.init();
      // eslint-disable-next-line require-atomic-updates
      prevOptions = options;
    }
    return monaco;
  };
})();

export const getCommonMonaco = (config: any): Promise<Monaco> => {
  if (config) {
    loader.config(config);
  } else {
    loader.config({
      paths: {
        vs: MONACO_CDN_BASE,
      },
    });
  }
  return loader.init();
};

export function getMonaco(config?: any): Promise<Monaco> {
  const hasConfig = Object.keys(config || {}).length > 0;
  const monacoConfig = hasConfig ? config : undefined;
  return controller.getMeta().singleton
    ? getSingletonMonaco(monacoConfig)
    : getCommonMonaco(monacoConfig);
}

export function configure(config: EditorMeta) {
  controller.updateMeta(config);
}
