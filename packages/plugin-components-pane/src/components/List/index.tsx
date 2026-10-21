import React, { ReactNode } from 'react';
import classNames from 'classnames';
import cls from 'classnames/bind';
import style from './index.module.scss';

const cx = cls.bind(style);

interface Props {
  className?: string;
  children?: ReactNode;
}

export default class List extends React.Component<Props> {
  render() {
    const { className } = this.props;
    // className 是外部传入的全局类名（非 CSS Module 键），故用未绑定的 classNames；
    // cx('cards') 负责把模块键映射成哈希类名。与迁移前的 cls(className, cx('cards')) 行为一致。
    return <div className={classNames(className, cx('cards'))}>{this.props.children}</div>;
  }
}
