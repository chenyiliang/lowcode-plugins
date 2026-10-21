import traverseImport from '@babel/traverse';
// CJS default 导出 unwrap：@babel/* 是 CJS（exports.default = fn），rolldown 的 interop
// 在「ESM 包 import CJS 包」时可能给命名空间对象而非 .default，导致
// `traverse.default is not a function`。显式 unwrap 兼容两种形态（Edge 实测 T8 崩溃的根因）。
const unwrapDefault = <T>(m: any): T => (m && m.default ? m.default : m) as T;
const traverse = unwrapDefault<typeof traverseImport>(traverseImport);
import { parse } from '@babel/parser';
// Babel 8 起 transformFromAst 只接受回调，同步调用改用 transformFromAstSync
import { transformFromAstSync as babelTransformFromAst } from '@babel/core';

import { functionDeclaration, identifier, Node, isIdentifier } from '@babel/types';

import { transformJS } from './transform';
import { defaultBabelConfig } from '../config/default-babel-config';

import { Methods } from '../types';

/**
 * get all methods from code-editor-pane
 */
export const getMethods = (ast: Node) => {
  const methods: Methods = {};
  const errorsByMethods: Record<string, string> = {};
  traverse(ast, {
    enter(path) {
      if (!path.isClassMethod()) {
        return;
      }
      const { node } = path;
      // class method 的 key 可能是 Identifier / StringLiteral / 计算表达式，
      // 只有 Identifier 才能取到方法名，其余情况跳过（原代码直接读 node.key.name）
      if (!isIdentifier(node.key)) {
        return;
      }
      const name = node.key.name;
      const { params } = node;
      const { body } = node;
      // creat empty AST
      const code = parse('');
      code.program.body.push(functionDeclaration(
        identifier(name),
        params
          .filter((p): p is Exclude<typeof p, { type: 'TSParameterProperty' }> => p.type !== 'TSParameterProperty')
          .map((p) => {
            if (p.type === 'Identifier') {
              return identifier(p.name);
            }
            // 解构语法，或者 ...args
            // 直接返回 ...args，不需要额外的构造
            return p;
          }),
        body,
        node.generator,
        node.async
      ));

      const codeStr = babelTransformFromAst(code, '', { babelrc: false, configFile: false })?.code ?? '';
      const { hasError, errorInfo, code: compiledCode = '' } = transformJS(codeStr, defaultBabelConfig)

      if (hasError && errorInfo) {
        errorsByMethods[name] = errorInfo;
      }

      methods[name] = {
        type: 'JSFunction',
        value: compiledCode,
        source: codeStr,
      };
    },
  });
  return { methods, errorsByMethods } as const;
};
