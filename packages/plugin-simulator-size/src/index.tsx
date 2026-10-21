import React from 'react';
import { NumberPicker, Icon } from '@alifd/next';
import type { NumberPickerProps } from '@alifd/next/types/number-picker/types';
import type { InputProps } from '@alifd/next/types/input/types';
import { IPublicModelPluginContext } from '@alilc/lowcode-types';

import './index.scss';

const devices = [
  { key: 'default' },
  { key: 'tablet' },
  { key: 'phone' },
];

const CustomIcon = Icon.createFromIconfontCN({
  scriptUrl: 'https://at.alicdn.com/t/font_2896595_33xhsbg9ux5.js',
});

/**
 * NumberPicker 的类型声明没有列出 `addonTextAfter` / `onPressEnter`，
 * 但其运行时实现会把未声明的 props 透传给内部的 Input，而 Input 明确支持这两个属性，
 * 因此这里按真实的 Input 类型补全，而不是退化成 any。
 */
type SimulatorNumberPickerProps = NumberPickerProps &
  Pick<InputProps, 'addonTextAfter' | 'onPressEnter' | 'placeholder'>;

const TypedNumberPicker = NumberPicker as React.ComponentType<SimulatorNumberPickerProps>;

/** NumberPicker 的 onChange/onPressEnter 可能给出 number | string | undefined，统一归一化为 number | null */
function toWidth(value: number | string | undefined | null): number | null {
  if (value === undefined || value === null || value === '') {
    return null;
  }
  const n = Number(value);
  return Number.isNaN(n) ? null : n;
}

interface SimulatorResizePaneState {
  active: string;
  currentWidth: number | null;
}

export class SimulatorResizePane extends React.Component<{
  pluginContext: IPublicModelPluginContext
}, SimulatorResizePaneState> {
  static displayName = 'SimulatorResizePane';

  state: SimulatorResizePaneState = {
    active: 'default',
    currentWidth: null
  };

  componentDidMount() {
    const { project } = this.props.pluginContext;
    // @ts-ignore 兼容旧版本引擎（onRendererReady）
    const onSimulatorRendererReady = (project.onSimulatorRendererReady || project.onRendererReady).bind(project);
    onSimulatorRendererReady(() => {
      const currentWidth = document.querySelector('.lc-simulator-canvas')?.clientWidth || this.state.currentWidth || 0;
      this.setState({
        currentWidth
      });
    });
    project.onSimulatorHostReady?.((simulator) => {
      if (simulator.get('device')) {
        this.setState({
          active: simulator.get('device'),
        });
      }
    });
  }

  change = (device: string) => {
    const { project } = this.props.pluginContext;
    const simulator = project.simulatorHost;
    // 切换画布
    simulator?.set('device', device);
    const canvas = document.querySelector<HTMLElement>('.lc-simulator-canvas');
    if (canvas?.style) {
      canvas.style.width = '';
    }
    setTimeout(() => {
      const currentWidth = document.querySelector('.lc-simulator-canvas')?.clientWidth || this.state.currentWidth || 0;
      this.setState({
        active: device,
        currentWidth
      });
    }, 0);
  };

  renderItemSVG(device: string) {
    switch (device) {
      case 'default':
        return <CustomIcon size="large" type="iconic_PC_Select" />;
      case 'tablet':
        return <CustomIcon size="large" type="iconic_Tablet_Select" />;
      case 'phone':
        return <CustomIcon size="large" type="iconic_smartphone" />;
      default:
        return <CustomIcon size="large" type="iconic_PC_Select" />;
    }
  }

  render() {
    const currentWidth = this.state.currentWidth || 0;
    const { project } = this.props.pluginContext;
    return (
      <div className="lp-simulator-pane">
        {
          devices.map((item, index) => {
            return (
              <span
                key={item.key}
                className={`lp-simulator-pane-item ${this.state.active === item.key ? 'active' : ''}`}
                onClick={this.change.bind(this, item.key)}
              >
                {this.renderItemSVG(item.key)}
              </span>
            );
          })
        }
        <div className="lp-simulator-width-setter">
          <TypedNumberPicker
            className="lp-simulator-width-input"
            addonTextAfter="px"
            value={currentWidth}
            placeholder="请输入"
            onChange={(value) => {
              this.setState({
                currentWidth: toWidth(value)
              });
            }}
            onPressEnter={(event) => {
              const value = toWidth((event.target as HTMLInputElement).value);
              const simulator = project.simulatorHost;
              simulator?.set('deviceStyle', {
                canvas: {
                  width: `${value}px`,
                },
              });
              this.setState({
                currentWidth: value
              });
            }}
          />
        </div>
      </div>
    );
  }
}

const plugin = (ctx: IPublicModelPluginContext) => {
  const SimulatorResizePaneRef = React.createRef<SimulatorResizePane>();

  return {
    // 插件的初始化函数，在引擎初始化之后会立刻调用
    init() {
      // 往引擎增加工具条
      ctx.skeleton.add({
        area: 'topArea',
        name: 'SimulatorResizePane',
        type: 'Widget',
        props: {
          description: '切换画布尺寸',
          align: 'center',
        },
        content: (
          <SimulatorResizePane
            ref={SimulatorResizePaneRef}
            pluginContext={ctx}
          />
        ),
      });
    }
  };
};

plugin.pluginName = 'SimulatorResizePane';

export default plugin;