import { common } from '@alilc/lowcode-engine';
import enUS from './en-US.json';
import zhCN from './zh-CN.json';

const zhCNMap = zhCN as Record<string, string>;

const { intl } = common?.utils?.createIntl?.({
  'en-US': enUS,
  'zh-CN': zhCN,
}) || {
  intl: (id: string) => {
    return zhCNMap[id];
  },
};

export { intl };
