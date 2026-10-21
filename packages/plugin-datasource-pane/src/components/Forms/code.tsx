import React, { PureComponent } from 'react';
import { connect } from '@formily/react';
import MonacoEditor, {
  type IMonacoInstance,
  type IEditorInstance,
} from '@alilc/lowcode-plugin-base-monaco-editor';
import _noop from 'lodash/noop';
import type { editor } from 'monaco-editor';

export interface CodeProps {
  className: string;
  value: string;
  onChange?: (val: any) => void;
  language?: string;
}

export interface CodeState {}

export class CodeComp extends PureComponent<CodeProps, CodeState> {
  static isFieldComponent = true;

  static defaultProps = {
    onChange: _noop,
    language: 'json',
  };

  // monaco 的 editor 命名空间（getModelMarkers 等静态方法所在的对象）
  private monacoRef: IMonacoInstance['editor'] | null = null;

  handleEditorChange = (newValue: string) => {
    if (this.monacoRef) {
      if (
        !this.monacoRef
          .getModelMarkers({})
          .find((marker: editor.IMarker) => marker.owner === 'json')
      ) {
        this.props.onChange?.(newValue);
      }
    }
  };

  /**
   * base-monaco-editor 的 editorDidMount 签名为 (monaco, editor)。
   *
   * 迁移说明：此处原写的是旧版三参签名 (isFullscreen, editor, monaco)，
   * 而组件只传两个实参，导致形参 `monaco` 恒为 undefined —— monacoRef 永远为 null，
   * handleEditorChange 里的校验分支从不执行、onChange 从不触发。属于既有 bug，一并修正。
   * 另外 getModelMarkers() 必须传过滤参数，无参调用会在运行时抛错。
   */
  handleEditorDidMount = (monaco: IMonacoInstance, _editor: IEditorInstance) => {
    this.monacoRef = monaco?.editor ?? null;
  };

  render() {
    const { value, language } = this.props;
    return (
      <div style={{ width: '100%', height: 150 }}>
        <MonacoEditor
          theme="vs-vision"
          value={value ?? ''}
          language={language}
          onChange={this.handleEditorChange}
          editorDidMount={this.handleEditorDidMount}
        />
      </div>
    );
  }
}

export const Code = connect(CodeComp);
