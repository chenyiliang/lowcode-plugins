import type { IPublicTypeJSFunction, IPublicTypeJSExpression } from '@alilc/lowcode-types';

/**
 * 方法定义：JS 函数字面量，额外带一份源码文本（用于在代码面板里回显）。
 * 注意原类型 `JSExpression | JSFunction & { source }` 因运算符优先级
 * （`&` 高于 `|`）实际等价于 `JSExpression | (JSFunction & { source })`，
 * 这里显式加括号表达真实意图，并保留 source 可选（JSExpression 分支没有）。
 */
export type Method = (IPublicTypeJSFunction & { source?: string }) | IPublicTypeJSExpression;

export interface Methods {
  [key: string]: Method;
}
