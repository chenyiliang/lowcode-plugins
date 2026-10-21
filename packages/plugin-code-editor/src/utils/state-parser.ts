import traverseImport from '@babel/traverse';
// CJS default 导出 unwrap：@babel/* 是 CJS（exports.default = fn），rolldown 的 interop
// 在「ESM 包 import CJS 包」时可能给命名空间对象而非 .default，导致
// `traverse.default is not a function`。显式 unwrap 兼容两种形态（Edge 实测 T8 崩溃的根因）。
const unwrapDefault = <T>(m: any): T => (m && m.default ? m.default : m) as T;
const traverse = unwrapDefault<typeof traverseImport>(traverseImport);
import * as t from '@babel/types';

import { parse } from '@babel/parser';
// Babel 8 起 transformFromAst 只接受回调，同步调用改用 transformFromAstSync
import { transformFromAstSync as babelTransformFromAst } from '@babel/core';

import { transformJS } from './transform';
import { defaultBabelConfig } from '../config/default-babel-config';

import type { Node } from '@babel/types';

export const stateParser = (ast: Node) => {
  const state: Record<string, any> = {};
  traverse(ast, {
    enter(path) {
      // get state identifier or string literal
      // Babel 8：`isLiteral({ value })` 不再成立（Literal 是无 value 字段的联合类型），
      // 这里语义是匹配字符串字面量 'state'，改用 isStringLiteral
      if (path.isIdentifier({ name: 'state' }) || path.isStringLiteral({ value: 'state' })) {
        const container = path.container as { value?: { properties?: any[] } } | undefined;
        const properties = container?.value?.properties;
        if (properties) {
          properties.forEach((property: any) => {
            // creat empty AST
            const code = parse('');
            code.program.body.push(t.variableDeclaration('var', [
              t.variableDeclarator(t.identifier('name'), property.value),
            ]));

            const codeStr = babelTransformFromAst(code, '', { babelrc: false, configFile: false })?.code ?? '';
            const compiledCode = transformJS(codeStr, defaultBabelConfig).code;
            if (compiledCode) {
              state[property.key?.name ?? property.key?.extra?.rawValue] = {
                type: 'JSExpression',
                value: compiledCode.replace('var name = ', '').replace(/;$/, ''),
                // 这里的 originalCode 直接放在全局，不挂在局部
                // originCode: codeStr.replace('var name = ', '').replace(/;$/, ''),
              };
            }
          });
        }
      }
    },
  });
  return state;
};
