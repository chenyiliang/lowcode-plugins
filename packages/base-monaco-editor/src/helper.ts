/* eslint-disable no-empty */
import React, { useEffect, useState, useRef, CSSProperties } from 'react';
import { Monaco } from '@monaco-editor/loader';
import type { editor as oEditor } from 'monaco-editor';
import { getMonaco } from './monaco';

// @todo fill type def for monaco editor without refering monaco editor
/**
 * @see https://microsoft.github.io/monaco-editor/api/index.html
 */
export type IEditorInstance = oEditor.IStandaloneCodeEditor | oEditor.IStandaloneDiffEditor;

/** monaco 实例类型，与 @monaco-editor/loader 的 `Monaco` 等价 */
export type IMonacoInstance = Monaco;

export type EditorEnhancer =
  (monaco: Monaco, editorIns: IEditorInstance) => any;

export interface IGeneralManacoEditorProps {
  /** [Monaco editor options](https://microsoft.github.io/monaco-editor/) */
  options?: Record<string, any>;
  /** callback after monaco's loaded and after editor's loaded */
  editorDidMount?: (monaco: Monaco, editor: IEditorInstance) => void;
  /** callback after monaco's loaded and before editor's loaded */
  editorWillMount?: (monaco: Monaco) => void;
  /** path of the current model, useful when creating a multi-model editor */
  path?: string;
  /** whether to save the models' view states between model changes or not */
  saveViewState?: boolean;
  /** language of the editor @see https://microsoft.github.io/monaco-editor/ for available languages */
  language?: string;
  /** theme of the editor, "light" | "vs-dark" */
  theme?: string;
  /** [config passing to require](https://github.com/suren-atoyan/monaco-react#loader-config), can be used to upgrade monaco-editor */
  requireConfig?: Record<string, any>;
  /** value, controlled */
  value?: string;
  /** defaultValue for creating model, uncontrolled */
  defaultValue?: string;
  /** className of wrapper */
  className?: string;
  /** width of wrapper */
  width?: number | string;
  /** height of wrapper */
  height?: number | string;
  /** whether to enable outline of wrapper or not */
  enableOutline?: boolean;
  /** style of wrapper */
  style?: CSSProperties;
  overrideServices?: oEditor.IEditorOverrideServices;
  enhancers?: EditorEnhancer[];
}

export interface ISingleMonacoEditorProps extends IGeneralManacoEditorProps {
  onChange?: (input: string, event: any) => void;
  supportFullScreen?: boolean;
}

export interface IDiffMonacoEditorProps extends IGeneralManacoEditorProps {
  original?: string;
}

const CURRENT_LANGUAGE = ((window as any).locale || window.localStorage.getItem('vdev-locale') || '').replace(/_/, '-') || 'zh-CN';
export const WORD_EDITOR_INITIALIZING = CURRENT_LANGUAGE === 'en-US' ? 'Initializing Editor' : '编辑器初始化中';

export const INITIAL_OPTIONS: oEditor.IStandaloneEditorConstructionOptions = {
  fontSize: 12,
  tabSize: 2,
  fontFamily: 'Menlo, Monaco, Courier New, monospace',
  folding: true,
  minimap: {
    enabled: false,
  },
  autoIndent: 'advanced',
  contextmenu: true,
  useTabStops: true,
  // monaco-editor 0.45 起该选项由 boolean 改为字符串枚举，
  // 旧的 `true`（按当前文档提供基于单词的补全）等价于 'currentDocument'
  wordBasedSuggestions: 'currentDocument',
  formatOnPaste: true,
  automaticLayout: true,
  lineNumbers: 'on',
  wordWrap: 'off',
  scrollBeyondLastLine: false,
  fixedOverflowWidgets: false,
  snippetSuggestions: 'top',
  scrollbar: {
    vertical: 'auto',
    horizontal: 'auto',
    verticalScrollbarSize: 10,
    horizontalScrollbarSize: 10,
  },
};

const DIFF_EDITOR_INITIAL_OPTIONS: oEditor.IStandaloneDiffEditorConstructionOptions = {
  fontSize: 12,
  fontFamily: 'Menlo, Monaco, Courier New, monospace',
  folding: true,
  minimap: {
    enabled: false,
  },
  autoIndent: 'advanced',
  contextmenu: true,
  useTabStops: true,
  formatOnPaste: true,
  automaticLayout: true,
  lineNumbers: 'on',
  wordWrap: 'off',
  scrollBeyondLastLine: false,
  fixedOverflowWidgets: false,
  snippetSuggestions: 'top',
  scrollbar: {
    vertical: 'auto',
    horizontal: 'auto',
    verticalScrollbarSize: 10,
    horizontalScrollbarSize: 10,
  },
};

export const useEditor = <T = IEditorInstance>(type: 'single' | 'diff', props: IGeneralManacoEditorProps) => {
  const {
    editorDidMount, editorWillMount, theme, value, path, language, saveViewState, defaultValue, enhancers, overrideServices
  } = props;

  const [isEditorReady, setIsEditorReady] = useState(false);
  const [focused, setFocused] = useState(false);
  const [loading, setLoading] = useState(false);
  // React 19 要求 useRef 必须显式传入初始值
  const defaultValueRef = useRef(defaultValue);
  const valueRef = useRef(value);
  const languageRef = useRef(language || 'text');
  const pathRef = useRef(path);
  const previousPath = usePrevious(path);
  const requireConfigRef = useRef(props.requireConfig);
  const optionRef = useRef(props.options);
  const monacoRef = useRef<Monaco | undefined>(undefined);
  const editorRef = useRef<IEditorInstance | undefined>(undefined);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const typeRef = useRef(type);
  const editorDidMountRef = useRef<ISingleMonacoEditorProps['editorDidMount']>(undefined);
  const editorWillMountRef = useRef<ISingleMonacoEditorProps['editorWillMount']>(undefined);

  const decomposeRef = useRef(false);
  const viewStatusRef = useRef<Map<any, oEditor.ICodeEditorViewState | null>>(new Map());

  const enhancersRef = useRef<any>({});

  useEffect(() => {
    enhancersRef.current.enhancers = enhancers;
  }, [enhancers]);

  useEffect(() => {
    editorDidMountRef.current = editorDidMount;
  }, [editorDidMount]);


  useEffect(() => {
    editorWillMountRef.current = editorWillMount;
  }, [editorWillMount]);

  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  useEffect(() => {
    languageRef.current = language || 'text';
  }, [language]);

  useEffect(() => {
    defaultValueRef.current = defaultValue;
  }, [defaultValue]);

  // make sure loader / editor only init once
  useEffect(() => {
    setLoading(true);
    getMonaco(requireConfigRef.current)
      .then((monaco: Monaco) => {
        // 兼容旧版本 monaco-editor 写死 MonacoEnvironment 的问题
        (window as any).MonacoEnvironment = undefined;
        if (typeof (window as any).define === 'function' && (window as any).define.amd) {
          // make monaco-editor's loader work with webpack's umd loader
          // @see https://github.com/microsoft/monaco-editor/issues/2283
          delete (window as any).define.amd;
        }

        monacoRef.current = monaco;
        try {
          editorWillMountRef.current?.(monaco);
        } catch (err) { }

        const container = containerRef.current;
        if (!container) {
          return;
        }
        let editor: oEditor.IStandaloneCodeEditor | oEditor.IStandaloneDiffEditor;
        if (typeRef.current === 'single') {
          const model = getOrCreateModel(
            monaco,
            valueRef.current ?? defaultValueRef.current ?? '',
            languageRef.current,
            pathRef.current,
          );
          editor = monaco.editor.create(container, {
            automaticLayout: true,
            ...INITIAL_OPTIONS,
            ...optionRef.current,
          }, overrideServices);
          editor.setModel(model);
        } else {
          const initial = valueRef.current ?? defaultValueRef.current ?? '';
          const originalModel = monaco
            .editor
            .createModel(initial, languageRef.current);

          const modifiedModel = monaco
            .editor
            .createModel(initial, languageRef.current);

          editor = monaco.editor.createDiffEditor(container, {
            automaticLayout: true,
            ...DIFF_EDITOR_INITIAL_OPTIONS,
            ...optionRef.current,
          }, overrideServices);

          editor.setModel({ original: originalModel, modified: modifiedModel });
        }
        editorRef.current = editor;
        enhancersRef.current.enhancers?.forEach((en: any) => en(monaco, editor as any));
        try {
          editorDidMountRef.current?.(monaco, editor);
        } catch (err) { }
        !decomposeRef.current && setIsEditorReady(true);
      })
      .catch((err: unknown) => {
        // eslint-disable-next-line no-console
        console.error('Monaco Editor Load Error!', err);
      })
      .then(() => {
        !decomposeRef.current && setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (!isEditorReady) {
      return;
    }

    if (theme) {
      monacoRef.current?.editor.setTheme(theme);
    }
  }, [isEditorReady, theme]);

  // focus status
  useEffect(() => {
    if (!isEditorReady) {
      return;
    }

    const editor = type === 'diff'
      ? (editorRef.current as oEditor.IStandaloneDiffEditor).getModifiedEditor()
      : editorRef.current as oEditor.IStandaloneCodeEditor;
    editor?.onDidFocusEditorText(() => {
      !decomposeRef.current && setFocused(true);
    });
    editor?.onDidBlurEditorText(() => {
      !decomposeRef.current && setFocused(false);
    });
  }, [isEditorReady, type]);

  // decomposing status
  useEffect(() => {
    return () => {
      decomposeRef.current = true;
    };
  }, []);

  // controlled value -- diff mode / without path only
  useEffect(() => {
    if (!isEditorReady) {
      return;
    }

    if (type !== 'diff' && !!path) {
      return;
    }

    const monaco = monacoRef.current;
    const editor = type === 'diff'
      ? (editorRef.current as oEditor.IStandaloneDiffEditor).getModifiedEditor()
      : editorRef.current as oEditor.IStandaloneCodeEditor;
    if (!editor) {
      return;
    }

    const nextValue = value ?? defaultValueRef.current ?? '';
    const readOnlyOptionId = monaco?.editor.EditorOption.readOnly;
    const isReadOnly = readOnlyOptionId === undefined
      ? false
      : editor.getOption(readOnlyOptionId);

    if (isReadOnly) {
      editor.setValue(nextValue);
    } else if (value !== editor.getValue()) {
      const model = editor.getModel();
      if (!model) {
        return;
      }
      editor.executeEdits('', [{
        range: model.getFullModelRange(),
        text: nextValue,
        forceMoveMarkers: true,
      }]);

      editor.pushUndoStop();
    }
  }, [isEditorReady, path, type, value]);

  // multi-model && controlled value (shouldn't be diff mode)
  useEffect(() => {
    if (!isEditorReady) {
      return;
    }

    if (type === 'diff') {
      return;
    }

    if (path === previousPath) {
      return;
    }

    const monaco = monacoRef.current;
    const editor = editorRef.current as oEditor.IStandaloneCodeEditor;
    if (!monaco || !editor) {
      return;
    }

    const model = getOrCreateModel(
      monaco,
      valueRef.current ?? defaultValueRef.current,
      languageRef.current,
      path,
    );

    if (valueRef.current !== null && valueRef.current !== undefined && model.getValue() !== valueRef.current) {
      model.setValue(valueRef.current);
    }
    if (model !== editor.getModel()) {
      saveViewState && viewStatusRef.current.set(previousPath, editor.saveViewState());
      editor.setModel(model);
      saveViewState && editor.restoreViewState(viewStatusRef.current.get(path) ?? null);
    }
  }, [isEditorReady, value, path, previousPath, type]);

  // 调用方通过泛型 T 收窄联合类型，这里在边界处做一次同构断言（不放宽为 any）
  const retEditorRef: React.RefObject<T> = editorRef as React.RefObject<T>;
  return {
    isEditorReady,
    focused,
    loading,
    containerRef,
    monacoRef,
    editorRef: retEditorRef,
    valueRef,
  } as const;
};

function getOrCreateModel(monaco: Monaco, value?: string, language?: string, path?: string) {
  if (path) {
    const prevModel = monaco
      .editor
      .getModel(monaco.Uri.parse(path));
    if (prevModel) {
      return prevModel;
    }
  }

  return monaco
    .editor
    .createModel(value ?? '', language, path ? monaco.Uri.parse(path) : undefined);
}

function usePrevious<T>(value: T) {
  const ref = useRef<T | undefined>(undefined);
  useEffect(() => {
    ref.current = value;
  }, [value]);
  return ref.current;
}
