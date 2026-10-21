import React from 'react';
import cls from 'classnames/bind';
import { Animate, Icon } from '@alifd/next';
import style from './index.module.scss';

const cx = cls.bind(style);

interface Props {
  name: string;
  children?: React.ReactElement;
}

interface State {
  expand: boolean;
}

export default class Category extends React.Component<Props, State> {
  state = {
    expand: true,
  };

  height = 0;

  handleToggle = () => {
    this.setState((state) => {
      return {
        expand: !state.expand,
      };
    });
  };

  beforeEnter = (node: HTMLElement) => {
    this.height = node.offsetHeight;
    node.style.height = '0px';
  };

  onEnter = (node: HTMLElement) => {
    node.style.height = `${this.height}px`;
  };

  afterEnter = (node: HTMLElement) => {
    this.height = 0;
    node.style.height = '';
  };

  beforeLeave = (node: HTMLElement) => {
    node.style.height = `${node.offsetHeight}px`;
  };

  onLeave = (node: HTMLElement) => {
    node.style.height = '0px';
  };

  afterLeave = (node: HTMLElement) => {
    node.style.height = '';
  };

  render() {
    const { children, name } = this.props;
    const { expand } = this.state;
    return (
      <div className={cx('category')}>
        <div className={cx('header')}>
          <div className={cx('title')}>{name}</div>
          <div className={cx('icon', { expand })} onClick={this.handleToggle}>
            <Icon type="arrow-down" size="xxs" />
          </div>
        </div>
        <Animate
          animation="expand"
          beforeEnter={this.beforeEnter}
          onEnter={this.onEnter}
          afterEnter={this.afterEnter}
          beforeLeave={this.beforeLeave}
          onLeave={this.onLeave}
          afterLeave={this.afterLeave}
        >
          {expand ? children : null}
        </Animate>
      </div>
    );
  }
}
