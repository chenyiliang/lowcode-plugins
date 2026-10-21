import React, { PureComponent } from 'react';
import MonacoEditor from '@alilc/lowcode-plugin-base-monaco-editor';
import { Tab, Button, Dialog } from '@alifd/next';
import { ErrorTip } from '../ErrorTip';

import { defaultBabelConfig, defaultCode, WORDS, TAB_KEY } from '../../config';
import { transformJS, transformAst, stateParser, getMethods } from '../../utils';

import { FunctionEventParams } from '../../types';
import { IEditorInstance, IMonacoInstance } from '@alilc/lowcode-plugin-base-monaco-editor';
import type { editor as monacoEditorNs, IRange } from 'monaco-editor';

import './JsEditor.less';

const LIFECYCLES_FUNCTION_MAP = {
  react: ['constructor', 'render', 'componentDidMount', 'componentDidUpdate', 'componentWillUnmount', 'componentDidCatch'],
};

interface JsEditorProps {
  jsCode: string;
  editor: any;
  currentTab: TAB_KEY;
  onTabChange: (tab: TAB_KEY) => void;
}

interface JsEditorState {
  state?: Record<string, any>;
  hasError: boolean;
  errorInfo?: string | null;
  code?: string;
  errorLocation?: {
    line: number;
    column: number;
  }
}

export class JsEditor extends PureComponent<JsEditorProps, JsEditorState> {
  static defaultProps: Partial<JsEditorProps> = {};

  state: JsEditorState = {
    errorInfo: null,
    hasError: false,
    code: this.props.jsCode ?? defaultCode,
  };

  monaco?: IMonacoInstance;
  // 本组件只挂载单文件代码编辑器（SingleMonacoEditor），运行时恒为 IStandaloneCodeEditor。
  // base-monaco 的 editorDidMount 回调签名是联合类型 IEditorInstance，故在挂载处收窄。
  monacoEditor?: monacoEditorNs.IStandaloneCodeEditor;
  lastErrorDecoration: string[] | null = null;

  disposeProvider?: { dispose: () => void };

  // get schema from code
  getSchemaFromCode() {
    const code = this.monacoEditor?.getModel()?.getValue() ?? this.state.code ?? '';
    const ast = transformAst(code);
    const { methods, errorsByMethods } = getMethods(ast);
    let lifeCycles: Record<string, unknown> = {};
    let newMethods: Record<string, unknown> = {};

    Object.keys(methods).forEach((method) => {
      if (LIFECYCLES_FUNCTION_MAP.react.indexOf(method) >= 0) {
        lifeCycles[method] = methods[method];
      } else {
        newMethods[method] = methods[method];
      }
    });

    if (Object.keys(errorsByMethods).length > 0) {
      Dialog.alert({
        title: WORDS.title,
        content: (
          <>
            {WORDS.functionParseError}
            {Object.entries(errorsByMethods).map(([key, err], index) => (
              <p key={index}>
                {key}: {err}
              </p>
            ))}
          </>
        ),
      });
    }

    return {
      state: stateParser(ast),
      methods: newMethods,
      lifeCycles,
      originCode: code,
    };
  }

  async editorDidMount(monaco: IMonacoInstance, editor: IEditorInstance) {
    // 见上：SingleMonacoEditor 挂载的一定是单文件编辑器
    this.monacoEditor = editor as monacoEditorNs.IStandaloneCodeEditor;
    this.monaco = monaco;

    monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
      noSemanticValidation: false,
      noSyntaxValidation: false,
      noSuggestionDiagnostics: true,
    });

    monaco.languages.typescript.javascriptDefaults.setCompilerOptions({
      // monaco 0.45+ 移除了 ScriptTarget.ES6，ES6 == ES2015
      target: monaco.languages.typescript.ScriptTarget.ES2015,
      allowNonTsExtensions: true,
      moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
      module: monaco.languages.typescript.ModuleKind.CommonJS,
      noEmit: true,
      esModuleInterop: true,
      jsx: monaco.languages.typescript.JsxEmit.React,
      reactNamespace: "React",
      allowJs: true,
      typeRoots: ["node_modules/@types"],  
    });

    // 将 babel 报错提示在这里
    this.disposeProvider?.dispose?.();
    this.disposeProvider = monaco.languages.registerHoverProvider('javascript', {
      provideHover: (model: any, position: any) => {
        const errorColumn = this.state.errorLocation?.column ?? 0;
        if (this.state.errorLocation?.line === position.lineNumber) {
          return {
            range: new monaco.Range(
              position.lineNumber,
              errorColumn,
              position.lineNumber,
              errorColumn + 1
            ),
            contents: [
              { value: `**${this.state.errorInfo}**`, supportHtml: true, isTrusted: true },
            ]
          };
        }
        return null;
      }
    });

    // monaco.languages.typescript.typescriptDefaults.addExtraLib(
    //   ReactType,
    //   `file:///node_modules/@react/types/index.d.ts`
    // );

    monaco.languages.typescript.javascriptDefaults.addExtraLib(
      `
        declare class Component {
          state?: Record<string, any>;
          setState(input: Record<string, any>, fn?: (...args: any[]) => any): void;
          componentDidMount(): void;
          constructor(props: Record<string, any>, context: any);
          render(): void;
          componentDidUpdate(prevProps: Record<string, any>, prevState: Record<string, any>, snapshot: Record<string, any>): void;
          componentWillUnmount(): void;
          componentDidCatch(error: Error, info: any): void;
        }
      `,
      `ts:/component.tsx`
    );

  }

  focusByFunctionName({ functionName }: FunctionEventParams) {
    const { monacoEditor } = this;
    // monaco 0.34+ 的 findMatches 需要完整 6 参重载：
    // (searchString, searchOnlyEditableRange, isRegex, matchCase, wordSeparators, captureMatches)
    const matchedResult = monacoEditor
      ?.getModel()
      ?.findMatches(`^\\s*(?:async)?\\s*${functionName}\\s*\\([\\s\\S]*\\)[\\s\\S]*\\{`, false, true, false, null, false)
      ?.[0];
    if (matchedResult) {
      setTimeout(() => {
        monacoEditor.revealLineInCenter(matchedResult.range.startLineNumber);
        monacoEditor.setPosition({
          column: matchedResult.range.endColumn,
          lineNumber: matchedResult.range.endLineNumber,
        });
        monacoEditor.focus();
      }, 100);
    }
  }

  addFunction(params: FunctionEventParams) {
    const { monacoEditor, monaco } = this;
    if (!monacoEditor || !monaco) {
      return;
    }

    // 找到最后一个 }，在他前面插入新的 function 字符串
    const matches = monacoEditor.getModel()?.findMatches('}', false, false, false, null, false);
    let range: IRange | undefined;
    if (matches && matches.length > 0) {
      const { startLineNumber, startColumn } = matches[matches.length - 1]?.range || {};
      if (startLineNumber && startColumn) {
        range = new monaco.Range(startLineNumber, startColumn, startLineNumber, startColumn);
      }
    }
    if (!range) {
      return;
    }

    const functionCode = params.template ?
      params.template :
      `\n\t${params.functionName}(){\n\t}\n`;

    monacoEditor.executeEdits('log-source', [
      { range, text: functionCode, forceMoveMarkers: true },
    ]);

    params.functionName && this.focusByFunctionName(params);
  }

  render() {
    const { code, hasError, errorInfo } = this.state;
    const { jsCode, currentTab, onTabChange } = this.props;
    return (
      <>
        <Tab
          size="small"
          shape="wrapped"
          activeKey={currentTab}
        >
          <Tab.Item
            className={hasError ? 'tab-with-error' : ''}
            title={(
              <>
                {code !== jsCode ? '* ' : ''}
                index.js
              </>
            )}
            key={TAB_KEY.JS}
            onClick={() => onTabChange(TAB_KEY.JS)}
          />
          {/** 当以后需要扩展多文件时，在这里控制 */}
        </Tab>
        {currentTab === TAB_KEY.JS && (
          <div className="plugin-code-editor-js plugin-code-editor-inner">
            <MonacoEditor
              value={code}
              language="javascript"
              height="100%"
              supportFullScreen={true}
              onChange={(newCode: string) => {
                this._updateCode(newCode)
              }}
              editorDidMount={(monaco, editor) => {
                this.editorDidMount(monaco, editor);
              }}
            />
            {
              hasError && typeof errorInfo === 'string' ? (
                <ErrorTip errorInfo={errorInfo} />
              ) : null
            }
          </div>
        )}
      </>
    );
  }

  _updateCode(newCode: string) {
    const { hasError, errorInfo, errorLocation } = transformJS(newCode, defaultBabelConfig);
    const { monacoEditor, monaco } = this;

    if (!monacoEditor || !monaco) {
      return;
    }

    // const pos = monacoEditor.getPosition();
    this.setState({ errorInfo, hasError, code: newCode, errorLocation }, () => {
      // monacoEditor.setPosition(pos);
      // update error decorations
      if (this.lastErrorDecoration) {
        monacoEditor.deltaDecorations(
          this.lastErrorDecoration,
          []
        );
        this.lastErrorDecoration = null;
      }

      if (hasError && errorLocation) {
        this.lastErrorDecoration = monacoEditor.deltaDecorations(
          [],
          [
            {
              range: new monaco.Range(
                errorLocation.line, errorLocation.column + 1,
                errorLocation.line, errorLocation.column + 2
              ),
              options: {
                inlineClassName: 'squiggly-error',
                // minimap 属于 IModelDecorationOptions 的字段（原代码误放在与 options 平级处，导致小地图高亮从未生效）
                minimap: {
                  color: { id: "minimap.errorHighlight" },
                  position: monaco.editor.MinimapPosition.Inline,
                },
              },
            },
            {
              range: new monaco.Range(
                errorLocation.line, errorLocation.column,
                errorLocation.line, errorLocation.column
              ),
              options: {
                isWholeLine: true,
                linesDecorationsClassName: 'plugin-code-editor-error-line',
              }
            }
          ]
        );
      }
    });
  }
}
