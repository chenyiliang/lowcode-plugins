import React, { ReactNode } from 'react';
import classNames from 'classnames';
import cls from 'classnames/bind';
import style from './index.module.scss';

const cx = cls.bind(style);

interface Props {
  className?: string;
  children?: React.ReactNode;
}

interface State {
  active: number;
  offset: number;
}

interface MenuItem {
  title?: ReactNode;
  index: number;
  children?: ReactNode;
}

export default class Tab extends React.Component<Props, State> {
  static Item: (props: { title?: ReactNode; children?: ReactNode }) => ReactNode;

  state: State = {
    active: 0,
    offset: 0,
  };

  menus = React.createRef<HTMLDivElement>();

  componentDidMount() {
    const offset = this.getIndicatorPos();
    // eslint-disable-next-line
    this.setState({ offset });
  }

  getIndicatorPos = (index?: number) => {
    const { active } = this.state;

    index = typeof index === 'undefined' ? active : index;

    const dom = this.menus.current;
    if (dom) {
      const children = dom.childNodes;

      const target = children[index] as HTMLDivElement;

      if (!target) {
        return 0;
      }

      return target.offsetLeft;
    }
    return 0;
  };

  format = () => {
    const { children } = this.props;
    const childs = React.Children.toArray(children);
    const menus: MenuItem[] = [];
    for (let i = 0; i < childs.length; i += 1) {
      const childProps = (childs[i] as React.ReactElement<{ title?: ReactNode; children?: ReactNode }>).props;
      menus.push({
        title: childProps?.title,
        index: i,
        children: childProps?.children,
      });
    }

    return {
      menus,
    };
  };

  handleSelect = (active: number) => {
    this.setState({
      active,
      offset: this.getIndicatorPos(active),
    });
  };

  render() {
    const { active, offset } = this.state;
    const { className } = this.props;

    const { menus } = this.format();

    return (
      // className 是外部传入的全局类名（非 CSS Module 键），故用未绑定的 classNames
      <div className={classNames(className, cx('tab'))}>
        <div className={cx('header')}>
          <div className={cx('indicator')} style={{ left: offset }} />
          <div className={cx('items')} ref={this.menus}>
            {menus.map((menu) => {
              return (
                <div
                  key={menu.index}
                  className={cx('item', { active: active === menu.index })}
                  onClick={() => this.handleSelect(menu.index)}
                >
                  {menu.title}
                </div>
              );
            })}
          </div>
        </div>
        <div className={cx('tabs')}>
          <div
            className={cx('contents')}
            style={{
              transform: `translate3d(-${active}00%, 0, 0)`,
            }}
          >
            {menus.map(({ children, index }) => {
              return (
                <div className={cx('content', { active: active === index })} key={index}>
                  {children}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }
}

Tab.Item = function TabItem({ children }: { title?: ReactNode; children?: ReactNode }) {
  return children;
};
