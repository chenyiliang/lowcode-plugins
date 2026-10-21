import * as React from 'react';
import { useRef, useEffect, useMemo, useState } from 'react';
import classNames from 'classnames';
import type { editor, IDisposable } from 'monaco-editor';
import {
  ISingleMonacoEditorProps,
  IGeneralManacoEditorProps,
  WORD_EDITOR_INITIALIZING,
  useEditor,
  IDiffMonacoEditorProps,
  INITIAL_OPTIONS,
} from './helper';
import './index.scss';

export * from './monaco';
export * from './controller';
export * from './helper';

function noop() {}

/**
 * 组件默认属性。
 *
 * React 19 移除了函数组件的 `defaultProps`，因此这里集中定义默认值，
 * 通过 `withDefaults` 在 props 为 undefined 时回填（与旧 defaultProps 语义一致）。
 */
export const EDITOR_DEFAULT_PROPS = {
  width: '100%' as number | string,
  height: 150 as number | string,
  defaultValue: '',
  language: 'javascript',
  options: INITIAL_OPTIONS as Record<string, any>,
  editorDidMount: noop as NonNullable<IGeneralManacoEditorProps['editorDidMount']>,
  editorWillMount: noop as NonNullable<IGeneralManacoEditorProps['editorWillMount']>,
  onChange: noop,
  requireConfig: {} as Record<string, any>,
};

/** 用默认值回填 props 中值为 undefined 的字段（React 19 替代 defaultProps 的写法） */
function withDefaults<P extends Record<string, any>>(props: P) {
  const merged: Record<string, any> = { ...EDITOR_DEFAULT_PROPS };
  for (const key of Object.keys(props) as Array<keyof P>) {
    if (props[key] !== undefined) {
      merged[key as string] = props[key];
    }
  }
  return { ...props, ...merged } as P & typeof EDITOR_DEFAULT_PROPS;
}

const SingleMonacoEditor = (rawProps: ISingleMonacoEditorProps) => {
  const props = withDefaults(rawProps);
  const { onChange, enableOutline, width, height, language, supportFullScreen } = props;
  const onChangeRef = useRef(onChange);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [fullScreenStyle, setFullScreenStyle] = useState<React.CSSProperties>({});

  const {
    isEditorReady,
    focused,
    loading,
    containerRef,
    monacoRef,
    editorRef,
    valueRef,
  } = useEditor<editor.IStandaloneCodeEditor>('single', props);
  const subscriptionRef = useRef<IDisposable | null>(null);

  const className = classNames('lc-code-control', props.className, {
    've-focused': focused,
    've-outline': enableOutline,
  });

  const fullScreenClassName = classNames(
    {
      'base-monaco-full-screen-icon': !isFullScreen,
      'base-monaco-full-screen-icon-cancel': isFullScreen,
    },
  );

  const style = useMemo(
    () => ({ width, height }),
    [width, height],
  );

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    if (isEditorReady) {
      const editorInstance = editorRef.current;
      subscriptionRef.current?.dispose();
      subscriptionRef.current = editorInstance?.onDidChangeModelContent((event: any) => {
        const editorValue = editorInstance?.getModel()?.getValue();

        if (valueRef.current !== editorValue) {
          (onChangeRef.current as ISingleMonacoEditorProps['onChange'])?.(editorValue ?? '', event);
        }
      }) ?? null;
    }
  }, [editorRef, isEditorReady, subscriptionRef, valueRef]);

  useEffect(() => {
    return () => {
      const editorInstance = editorRef.current;
      subscriptionRef.current?.dispose();
      editorInstance?.getModel()?.dispose();
      editorInstance?.dispose();
    };
  }, [editorRef]);

  useEffect(() => {
    if (!isEditorReady) {
      return;
    }

    const model = editorRef.current?.getModel();
    if (model) {
      monacoRef.current?.editor.setModelLanguage(model, language);
    }
  }, [editorRef, isEditorReady, language, monacoRef]);

  const fullScreen = () => {
    const editorInstance = editorRef.current;
    if (!isFullScreen) {
      setIsFullScreen(true);
      setFullScreenStyle({
        width: 'auto',
        height: 'auto',
        position: 'fixed',
        top: 0,
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 9998,
      });
      // 更新小地图配置
      editorInstance?.updateOptions({
        ...editorInstance?.getOptions(),
        minimap: {
          enabled: true,
        },
      });
      editorInstance?.layout();
    } else {
      setIsFullScreen(false);
      editorInstance?.updateOptions({
        ...editorInstance?.getOptions(),
        minimap: {
          enabled: false,
        },
      });
      editorInstance?.layout();
    }
  };

  return (
    <div className={className} style={props.style}>
      {loading && <span className="loading">{WORD_EDITOR_INITIALIZING}</span>}

      <div
        ref={containerRef}
        className="react-monaco-editor-container"
        style={isFullScreen ? fullScreenStyle : style}
      >
        {supportFullScreen && <div className={fullScreenClassName} onClick={fullScreen} />}
      </div>
    </div>
  );
};

const DiffMonacoEditor = (rawProps: IDiffMonacoEditorProps) => {
  const props = withDefaults(rawProps);
  const { enableOutline, width, height, language, original } = props;

  const { isEditorReady, focused, loading, containerRef, monacoRef, editorRef } = useEditor<editor.IStandaloneDiffEditor>(
    'diff',
    props,
  );

  const className = classNames('lc-code-control', props.className, {
    've-focused': focused,
    've-outline': enableOutline,
  });
  const style = useMemo(
    () => ({ width, height }),
    [width, height],
  );

  useEffect(() => {
    if (!isEditorReady) {
      return;
    }
    editorRef.current?.getModel()?.original?.setValue(original ?? '');
  }, [editorRef, isEditorReady, original]);

  useEffect(() => {
    return () => {
      const model = editorRef.current?.getModel();
      model?.original?.dispose();
      model?.modified?.dispose();
      editorRef.current?.dispose();
    };
  }, [editorRef]);

  useEffect(() => {
    if (!isEditorReady) {
      return;
    }

    const model = editorRef.current?.getModel();
    if (!model) {
      return;
    }
    const { original: originalModel, modified: modifiedModel } = model;

    monacoRef.current?.editor.setModelLanguage(originalModel, language);
    monacoRef.current?.editor.setModelLanguage(modifiedModel, language);
  }, [editorRef, isEditorReady, language, monacoRef]);

  return (
    <div className={className} style={props.style}>
      {loading && <span className="loading">{WORD_EDITOR_INITIALIZING}</span>}
      <div
        ref={containerRef}
        className="react-monaco-editor-container react-monaco-editor-diff-container"
        style={style}
      />
    </div>
  );
};

export const DiffMonacoEditorComponent = Object.assign(DiffMonacoEditor, {
  displayName: 'DiffMonacoEditor',
});

export const SingleMonacoEditorComponent = Object.assign(SingleMonacoEditor, {
  displayName: 'SingleMonacoEditor',
  MonacoDiffEditor: DiffMonacoEditorComponent,
});

export default SingleMonacoEditorComponent;
