import React from 'react';
import classNames from 'classnames';
import cls from 'classnames/bind';
import Svg from '../../Icon/Component';
import style from './index.module.scss';
import { Text, StandardComponentMeta, SnippetMeta } from '../../utils/transform';

const cx = cls.bind(style);

interface Props {
  /**
   * 卡片实际只消费 title / icon / snippets 三个字段（见 renderIcon 与 render），
   * 调用方传的也是这个子集，故这里用精确的 Pick 而非整个 StandardComponentMeta。
   */
  data: Pick<StandardComponentMeta, 'title' | 'icon' | 'snippets'>;
  t: (input?: Text) => string;
}

interface State {
  icon: string | React.ReactNode;
  snippet: SnippetMeta | undefined;
}

export default class Component extends React.Component<Props, State> {
  static getDerivedStateFromProps(props: Props): State {
    const { data } = props;
    const { icon, snippets = [] } = data;
    const snippet = snippets[0];
    const screenshot = snippet?.screenshot ?? icon;

    return {
      icon: screenshot,
      snippet,
    };
  }

  state: State = {
    icon: '',
    snippet: undefined,
  };

  t: (s: Text) => string;

  constructor(props: Props) {
    super(props);
    this.t = props.t;
  }

  renderIcon() {
    const { icon } = this.state;

    if (!icon) {
      return <Svg className={cx('no-icon')} />;
    }

    if (typeof icon === 'string') {
      return <img src={icon} alt="" />;
    }

    if (typeof icon === 'function') {
      const X = icon as any;
      return <X />;
    }

    return icon;
  }

  render() {
    const { data } = this.props;
    const { title } = data;
    const { snippet } = this.state;

    return (
      // 'snippet' 是拖拽注册逻辑（classList.contains('snippet')）依赖的全局类名，
      // 必须保持未哈希，故用未绑定的 classNames；cx('card') 才走 CSS Module 映射。
      <div className={classNames('snippet', cx('card'))} data-id={snippet?.id} title={this.t(title)}>
        <div className={cx('icon')}>{this.renderIcon()}</div>
        <div className={cx('name')}>{this.t(title)}</div>
      </div>
    );
  }
}
