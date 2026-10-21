import { parse } from '@babel/parser';

export function transformAst(code: string) {
  // TODO: 配置未来需要外化
  //
  // Babel 8 说明：以下语法在 Babel 7/8 已成为默认解析能力，对应的插件名
  // （asyncGenerators / bigInt / classPrivateMethods / classPrivateProperties /
  // classProperties / dynamicImport / exportNamespaceFrom / importMeta /
  // logicalAssignment / nullishCoalescingOperator / numericSeparator /
  // objectRestSpread / optionalCatchBinding / optionalChaining）已从
  // @babel/parser 的类型联合中移除，继续写会被 TS 拒绝，且运行时无意义。
  // 另外 `pipelineOperator` 的 `proposal: 'minimal'` 在 Babel 8 已不再支持
  // （仅接受 'fsharp' | 'hack'），而本编辑器并不解析管道语法，故一并移除。
  // 这里只保留仍属于 opt-in 的实验语法插件。
  return parse(code, {
    sourceType: 'module',
    plugins: [
      'decorators',
      'doExpressions',
      'exportDefaultFrom',
      'flowComments',
      'functionBind',
      'functionSent',
      'jsx',
      'throwExpressions',
    ],
  });
}
