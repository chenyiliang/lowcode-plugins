import traverseImport from '@babel/traverse';
// CJS default 导出 unwrap：@babel/* 是 CJS（exports.default = fn），rolldown 的 interop
// 在「ESM 包 import CJS 包」时可能给命名空间对象而非 .default，导致
// `traverse.default is not a function`。显式 unwrap 兼容两种形态（Edge 实测 T8 崩溃的根因）。
const unwrapDefault = <T>(m: any): T => (m && m.default ? m.default : m) as T;
const traverse = unwrapDefault<typeof traverseImport>(traverseImport);
import type { Node } from '@babel/types';

export const getState = (ast: Node) => {
  const state: Record<string, any> = {};
  traverse(ast, {
    enter(path) {
      // get state
      if (path.isIdentifier({ name: 'state' })) {
        const container = path.container as { value?: { properties?: any[] } } | undefined;
        const properties = container?.value?.properties;
        if (properties) {
          properties.forEach((property: any) => {
            state[property.key?.name ?? property.key?.extra?.rawValue] = property.value?.value;
          });
        }
      }
    },
  });
  return state;
};
