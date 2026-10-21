import React, { PureComponent } from 'react';
import {
  MenuButton,
  Button,
  Icon,
  Select,
  Input,
  Radio,
  NumberPicker,
  Switch,
} from '@alifd/next';
import { connect } from '@formily/react';
import { JSExpression, isJSExpression } from '@alilc/lowcode-types';
import _isPlainObject from 'lodash/isPlainObject';
import _isArray from 'lodash/isArray';
import _isNumber from 'lodash/isNumber';
import _isBoolean from 'lodash/isBoolean';
import cn from 'classnames';
import { EditorContext } from '../../utils/editor-context';
import { generateClassName, safeParse } from '../../utils/misc';
import { JSONComp } from './json';
import './param-value.scss';

const { Group: RadioGroup } = Radio;

enum ParamValueEnum {
  STRING ='string',
  NUMBER ='number',
  BOOLEAN ='boolean',
  EXPRSSION ='expression',
  JSON ='json',
  JSONSTRING = 'jsonstring',
}

type ParamValueType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'expression'
  | 'jsonstring'
  | 'json';

export interface ParamValueProps {
  className?: string;
  style?: React.CSSProperties;
  value: any;
  onChange?: (value: any) => void;
  types: ParamValueType[];
}

/**
 * 面板中一个参数可能承载的全部取值形态。
 *
 * 迁移说明：原 ParamValueState['value'] 只声明了 `string | number | JSExpression | boolean`，
 * 但 handleTypeChange 的 JSON / JSONSTRING 分支会写入对象与数组，声明与实现不一致
 * （旧 tsconfig 未开 strict 故未暴露）。这里抽出统一的联合类型，供 state 与局部变量共用。
 */
type ParamValuePayload =
  | string
  | number
  | boolean
  | JSExpression
  | any[]
  | Record<string, any>;

export interface ParamValueState {
  type: ParamValueType;
  value: ParamValuePayload;
}

function isBoolean(val: unknown): val is boolean | string {
  return _isBoolean(val) || val === 'true' || val === 'false';
}

const TYPE_LABEL_MAP = {
  string: '字符串',
  number: '数字',
  boolean: '布尔',
  expression: '表达式',
  jsonstring: '对象字符串',
  json: '对象',
};

class ParamValueComp extends PureComponent<ParamValueProps, ParamValueState> {
  static isFieldComponent = true;

  static defaultProps = {
    types: ['string', 'boolean', 'number', 'expression', 'jsonstring', 'json'],
    className: '',
    style: {},
  };

  state: ParamValueState = {
    type: 'string',
    value: '',
  };

  constructor(props: ParamValueProps) {
    super(props);
    this.state.value = this.props.value;
    this.state.type = this.getTypeFromValue(this.props.value);
  }

  // @todo
  getTypeFromValue = (value: any) => {
    if (_isBoolean(value)) {
      return 'boolean';
    } else if (_isNumber(value)) {
      return 'number';
    } else if (_isPlainObject(value) && value.type === 'JSExpression') {
      return 'expression';
    }
    return 'string';
  };

  // @todo 需要再 bind 一次？
  handleChange = (value: any) => {
    const { type } = this.state;
    if (type === 'json') {
      this.props.onChange?.({
        type: 'JSExpression',
        value,
      });
      return;
    }
    this.setState({
      value,
    });
    this.props?.onChange?.(value);
  };

  handleTypeChange = (nextType?: string) => {
    const { types } = this.props;
    const { type } = this.state;
    let nextRealType = nextType;
    // props.value 为 any，这里按面板实际会遇到的取值范围显式声明，
    // 避免后续分支里出现隐式 any 以及 boolean | string 上访问 .value 的类型错误
    let nextValue: ParamValuePayload = this.props.value || '';
    if (!nextRealType) {
      const currentTypeIndex = this.props.types.indexOf(type);
      nextRealType = types[(currentTypeIndex + 1) % types.length];
    }
    switch (nextRealType) {
      case ParamValueEnum.STRING:
        if (isJSExpression(nextValue)) {
          nextValue = nextValue.value;
        }
        // nextValue = nextValue.toString();
        break;
      case ParamValueEnum.NUMBER:
        nextValue = Number(nextValue as string | number | boolean) * 1;
        break;
      case ParamValueEnum.BOOLEAN:
        if (isBoolean(nextValue)) {
          // 原实现同时兼容字符串 'true' 与表达式对象（{ value: 'true' }）两种来源，
          // 这里用 isJSExpression 显式区分，语义与原先一致
          nextValue =
            nextValue === 'true' ||
            (isJSExpression(nextValue) && nextValue.value === 'true') ||
            false;
        }
        break;
      case ParamValueEnum.JSONSTRING:
        nextValue = '';
        break;
      case ParamValueEnum.JSON:
        if (isJSExpression(nextValue)) {
          nextValue = nextValue.value;
        }
        break;
      case ParamValueEnum.EXPRSSION:
        if (!isJSExpression(nextValue)) {
          nextValue = {
            type: 'JSExpression',
            value: nextValue,
          };
        }
        break;
      default:
    }
    this.setState({
      type: nextRealType as ParamValueType,
      value: nextValue,
    });
    if (nextRealType === 'json') {
      this.props.onChange?.({
        type: 'JSExpression',
        value: nextValue,
      });
      return;
    }
    this.props.onChange?.(nextValue);
  };

  renderTypeSwitch = () => {
    const handleSwitch = () => {
      this.handleTypeChange();
    };
    const handleSwitchTo = (type: string) => {
      this.handleTypeChange(type);
    };
    return (
      <Button.Group className={generateClassName('universal-value-typeswitch')}>
        <Button onClick={handleSwitch}>
          <Icon type="switch" />
        </Button>
        <MenuButton size="small" type="secondary" onItemClick={handleSwitchTo}>
          {this.props.types.map((item) => (
            <MenuButton.Item key={item}>{TYPE_LABEL_MAP[item]}</MenuButton.Item>
          ))}
        </MenuButton>
      </Button.Group>
    );
  };

  renderTypeSelect = () => {
    const { type } = this.state;
    const { types } = this.props;

    if (_isArray(types) && types.length > 1) {
      return (
        <Select
          followTrigger
          className="param-value-type"
          dataSource={types.map((item) => ({
            label: TYPE_LABEL_MAP[item],
            value: item,
          }))}
          value={type}
          onChange={(nextType) => this.handleTypeChange(nextType as string)}
        />
      );
    }
    // if (_isArray(types) && types.length > 1) {
    //   return (
    //     <RadioGroup
    //       className="param-value-type"
    //       shape="button"
    //       size="small"
    //       onChange={this.handleTypeChange}
    //       value={type}
    //     >
    //       {types.map((item) => (
    //         <Radio value={item}>TYPE_LABEL_MAP[item]</Radio>
    //       ))}
    //     </RadioGroup>
    //   );
    // }
    return null;
  };

  render() {
    const { className, style } = this.props;
    const { type, value } = this.state;
    return (
      <div
        className={cn(generateClassName('universal-value'), className)}
        style={style}
      >
        {/* this.renderTypeSelect() */}
        {type === 'string' && (
          <Input
            className={generateClassName('universal-value-string')}
            onChange={this.handleChange}
            value={value as string}
          />
        )}
        {type === 'boolean' && (
          <Switch
            className={generateClassName('universal-value-boolean')}
            onChange={this.handleChange}
            checked={value as boolean}
          />
        )}
        {type === 'number' && (
          <NumberPicker
            className={generateClassName('universal-value-number')}
            onChange={this.handleChange}
            value={value as string}
          />
        )}
        {type === 'jsonstring' && (
          <span className={generateClassName('universal-value-jsonstring')}>
            <JSONComp onChange={this.handleChange} value={safeParse(value)} />
          </span>
        )}
        {type === 'json' && (
          <span className={generateClassName('universal-value-json')}>
            <JSONComp onChange={this.handleChange} value={value as Record<string, any>} />
          </span>
        )}
        {type === 'expression' && (
          <span className={generateClassName('universal-value-json')}>
            <EditorContext.Consumer>
              {({ setters }) => {
                // getSetter(...).component 类型为 IPublicTypeCustomView = ReactElement | ComponentType，
                // 作为组件渲染前用 typeof === 'function' 收窄掉 ReactElement 分支
                const raw = setters?.getSetter('ExpressionSetter')?.component;
                if (typeof raw !== 'function') return null;
                const ExpressionSetter = raw as React.ComponentType<any>;
                return (
                  <ExpressionSetter
                    className={generateClassName('universal-value-expression')}
                    onChange={this.handleChange}
                    field={{
                      setters,
                    }}
                    value={value}
                  />
                );
              }}
            </EditorContext.Consumer>
          </span>
        )}
        {this.renderTypeSwitch()}
      </div>
    );
  }
}

export const ParamValue = connect(ParamValueComp);

ParamValue.displayName = 'ParamValue';
