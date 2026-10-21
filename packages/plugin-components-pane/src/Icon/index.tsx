import React from 'react';
import cls from 'classnames/bind';
import PaneIcon from './PaneIcon';
import style from './index.module.scss';

const cx = cls.bind(style);

export default function Icon() {
  return (
    <div className={cx('icon')}>
      <PaneIcon />
    </div>
  );
}
