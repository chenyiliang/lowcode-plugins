import React, { PureComponent } from 'react';
import { connect } from '@formily/react';
import MonacoEditor from '@alilc/lowcode-plugin-base-monaco-editor';
import _noop from 'lodash/noop';
// import { editor } from 'monaco-editor';

export interface JSONProps {
  className?: string;
  value: Record<string, any> | string;
  onChange?: (val: any) => void;
}

export interface JSONState {}

export class JSONComp extends PureComponent<JSONProps, JSONState> {
  static isFieldComponent = true;

  static defaultProps = {
    onChange: _noop,
  };

  // private monacoRef: any = null;

  handleEditorChange = (newValue: string) => {
    this.props.onChange?.(newValue);
  };

  // handleEditorDidMount = (editor) => {
  //   this.monacoRef = editor;
  // };

  render() {
    const { value, className } = this.props;
    // MonacoEditor 的 value 为字符串；此处是 JSON 编辑器，对象值需序列化为 JSON 文本。
    // 注意：本模块底部有 `export const JSON = connect(JSONComp)`，它在模块作用域内
    // 遮蔽了全局 JSON，因此这里必须显式取 globalThis.JSON。
    const editorValue =
      typeof value === 'string' ? value : value ? globalThis.JSON.stringify(value, null, 2) : '';
    return (
      <div className={className} style={{ width: '100%', height: 150 }}>
        <MonacoEditor
          theme="vs-vision"
          value={editorValue}
          language="json"
          onChange={this.handleEditorChange}
          // editorDidMount={this.handleEditorDidMount}
        />
      </div>
    );
  }
}

export const JSON = connect(JSONComp);
