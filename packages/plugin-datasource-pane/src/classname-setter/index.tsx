import { PureComponent } from 'react';
import { Select } from '@alifd/next';
import type { DataSourceItem } from '@alifd/next/types/select/types';
import { common } from '@alilc/lowcode-engine';
import type { Project } from '@alilc/lowcode-shell';
import { EditorContext } from '../utils/editor-context';

export interface PluginProps {
  value?: string;
  onChange?: (value: string) => void;
}

export interface ClassNameSetterState {
  dataSource: Array<{
    value: string;
    label: string;
  }>;
  selectValue: string[];
}

/** 从页面 schema 的 css 中提取所有类名 */
function getClassNameList(project?: Project): string[] {
  if (!project) {
    return [];
  }
  const schema = project.exportSchema(common.designerCabin.TransformStage.Save);
  const css = schema.componentsTree?.[0]?.css;
  const classNameList: string[] = [];
  const re = /\.?\w+[^{]+\{[^}]*\}/g;
  const list: string[] = css?.match(re) ?? [];
  list.forEach((item) => {
    if (item[0] === '.') {
      classNameList.push(item.substring(1, item.indexOf('{')));
    }
  });
  return classNameList;
}

/**
 * className setter：从当前页面 schema 的 css 中提取类名列表，
 * 以 tag 模式的多选框呈现，勾选结果以空格分隔回写。
 *
 * React 19 适配说明：
 * - 删除了 `propTypes`，改由上面的 TS 接口表达（`prop-types` 依赖一并移除）
 * - 旧的 legacy `this.context` 已被移除，改为 `static contextType = EditorContext`
 * - `componentWillMount` 已被移除，其「首次渲染前根据 value 计算 state」的逻辑
 *   等价地放进 constructor（此时 React 通过构造函数第二个参数注入 context，
 *   `this.context` 尚未赋值，故使用参数而非 `this.context`），不会多渲染一次
 * - `defaultProps` 在 class 组件上 React 19 仍然支持，故保留
 */
export default class ClassNameView extends PureComponent<PluginProps, ClassNameSetterState> {
  static display = 'ClassName';

  static contextType = EditorContext;

  static defaultProps = {
    onChange: () => {},
    value: '',
  };

  constructor(props: PluginProps, context?: { project?: Project }) {
    super(props, context);

    const { value } = props;
    this.state = {
      dataSource: getClassNameList(context?.project).map((item) => ({
        value: item,
        label: item,
      })),
      selectValue: value ? value.split(' ') : [],
    };
  }

  /**
   * tag 模式下 Fusion Select 的 onChange 回调值是 DataSourceItem | DataSourceItem[]，
   * 这里归一化为 string[]（原实现直接按 string[] 处理，未覆盖单选/非字符串情况）。
   */
  handleChange = (value: DataSourceItem | DataSourceItem[]) => {
    const list = (Array.isArray(value) ? value : [value])
      .filter((item): item is string => typeof item === 'string');
    this.props.onChange?.(list.join(' '));
    this.setState({
      selectValue: list,
    });
  };

  render() {
    const { dataSource, selectValue } = this.state;
    return (
      <Select aria-label="tag mode" mode="tag" dataSource={dataSource} onChange={this.handleChange} value={selectValue} />
    );
  }
}
