/**
 * 组件面板兼容两种接入方式：
 * 1) 作为 lowcode 插件运行，通过 props.editor 拿到旧版引擎；
 * 2) 独立运行 / UMD 场景，从全局 window.AliLowCodeEngine 上取 material/common/project/event。
 *
 * 这里为全局对象补一个最小类型声明（不使用 any 以免污染），仅声明本包实际访问的成员。
 */
interface AliLowCodeEngineGlobal {
  material?: {
    getAssets: () => any;
    onChangeAssets: (fn: () => void) => void;
  };
  common?: {
    designerCabin?: {
      dragon?: {
        from: (shell: HTMLElement, getter: (e: Event) => unknown) => void;
      };
    };
  };
  project?: {
    getCurrentDocument: () => any;
  };
  event?: {
    on: (name: string, fn: (...args: any[]) => void) => void;
  };
}

interface Window {
  AliLowCodeEngine?: AliLowCodeEngineGlobal;
}
