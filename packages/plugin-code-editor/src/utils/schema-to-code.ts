import { js_beautify, css_beautify } from 'js-beautify';
import { isJSExpression, IPublicTypeProjectSchema as ProjectSchema, IPublicTypeRootSchema as RootSchema } from '@alilc/lowcode-types';
import { IState } from '../types';
import { WORDS } from '../config';
import type { Method } from '../types/methods';

const js_beautify_config = { indent_size: 2, indent_empty_lines: true, e4x: true };

/**
 * 本插件在页面根 schema 上额外写入 `originCode`（源码面板编辑后的原始代码），
 * 该字段不在 lowcode 标准协议类型里，故这里显式扩展，而不是把整棵 schema 放宽成 any。
 */
type CodeRootSchema = RootSchema & { originCode?: string };

const initCode = (componentSchema: CodeRootSchema | undefined) => {
  const code = `class Page extends Component {
    ${initStateCode(componentSchema)}
    ${initLifeCycleCode(componentSchema)}
    ${initMethodsCode(componentSchema)}
  }`;

  return js_beautify(code, js_beautify_config);
};

export const schema2JsCode = (schema: ProjectSchema) => {
  const componentSchema = schema.componentsTree[0] as CodeRootSchema | undefined;
  const code = componentSchema?.originCode ?? initCode(componentSchema);

  // console.log('当前的code：', code);
  return code;
};

export const schema2CssCode = (schema: ProjectSchema) => {
  return beautifyCSS(schema.componentsTree[0]?.css);
};

export const beautifyCSS = (input?: string): string => {
  return input ? css_beautify(input, { indent_size: 2 }) : '';
}

function initStateCode(componentSchema: CodeRootSchema | undefined) {
  if (componentSchema?.state) {
    let statesStr = 'state = {\n';
    Object.keys(componentSchema.state).forEach((key) => {
      const state = componentSchema.state?.[key];
      if (typeof state === 'object' && isJSExpression(state)) {
        statesStr += `"${key}": ${(state as IState).source || state.value},\n`;
      } else {
        statesStr += `"${key}": ${typeof state === 'string' ? '"' + state + '"' : state},,\n`;
      }
    });
    statesStr += '}';
    return statesStr;
  }

}

function initLifeCycleCode(componentSchema: CodeRootSchema | undefined) {
  if (componentSchema?.lifeCycles) {
    const { lifeCycles } = componentSchema;
    const codeList: Array<string | undefined> = [];

    for (const key in lifeCycles) {
      codeList.push(createFunctionCode(key, lifeCycles[key]));
    }

    return codeList.join('');
  } else {
    return '';
  }
}

function initMethodsCode(componentSchema: CodeRootSchema | undefined) {
  if (componentSchema?.methods && Object.keys(componentSchema.methods).length) {
    const { methods } = componentSchema;
    const codeList: Array<string | undefined> = [];

    for (const key in methods) {
      codeList.push(createFunctionCode(key, methods[key]));
    }

    return codeList.join('');
  } else {
    return `
      // 你可以在这里编写函数，并且与组件的事件进行绑定，支持JSX语法
      testFunc() {
        console.log('test aliLowcode func');
        return (
          <div className="test-aliLowcode-func">
        {this.state.test}
      </div>
        );
      }
    `;
  }
}

function createFunctionCode(functionName: string, functionNode: Method): string | undefined {
  if (functionNode?.type === 'JSExpression' || functionNode?.type === 'JSFunction') {
    // 读取原始代码
    let functionCode = (functionNode as Method & { source?: string }).source;
    if (functionCode) {
      functionCode = functionCode.replace(/function/, '');
    } else {
      // 兼容历史数据
      functionCode = functionNode.value?.replace(/function/, functionName);
    }
    return functionCode;
  }
}
