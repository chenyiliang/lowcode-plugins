import {
  transformSync as babelTransformSync,
  type PluginItem,
  type PresetItem,
  type InputOptions,
} from '@babel/core';
import presetEnvImport from '@babel/preset-env';
import presetReactImport from '@babel/preset-react';
// CJS default 导出 unwrap：@babel/* 是 CJS（exports.default = fn），rolldown 的 interop
// 在「ESM 包 import CJS 包」时可能给命名空间对象而非 .default，导致
// `traverse.default is not a function`。显式 unwrap 兼容两种形态（Edge 实测 T8 崩溃的根因）。
const unwrapDefault = <T>(m: any): T => (m && m.default ? m.default : m) as T;
const presetEnv = unwrapDefault<typeof presetEnvImport>(presetEnvImport);
const presetReact = unwrapDefault<typeof presetReactImport>(presetReactImport);

const isArray =
  Array.isArray ||
  ((arg: unknown): arg is unknown[] => Object.prototype.toString.call(arg) === '[object Array]');

export const availablePresets: Record<string, object | Function> = {};
export const availablePlugins: Record<string, object | Function> = {};

/**
 * preset/plugin 既可能是注册表里的名字字符串，也可能是 [名, 选项] 元组，
 * 或调用方直接传入的真实模块。这里统一解析为可传给 babel 的形式。
 */
function loadBuiltin(builtinTable: Record<string, object | Function>, name: unknown) {
  if (isArray(name) && typeof name[0] === 'string') {
    if (Object.prototype.hasOwnProperty.call(builtinTable, name[0])) {
      return [builtinTable[name[0]]].concat(name.slice(1));
    }
    return undefined;
  } else if (typeof name === 'string') {
    return builtinTable[name];
  }
  // Could be an actual preset/plugin module
  return name;
}

function processOptions(options: InputOptions): InputOptions {
  // Parse preset names
  const presets: PresetItem[] = (options.presets || []).map((presetName) => {
    const preset = loadBuiltin(availablePresets, presetName);

    if (preset) {
      // workaround for babel issue
      // at some point, babel copies the preset, losing the non-enumerable
      // buildPreset key; convert it into an enumerable key.
      if (
        isArray(preset) &&
        typeof preset[0] === 'object' &&
        preset[0] !== null &&
        Object.prototype.hasOwnProperty.call(preset[0], 'buildPreset')
      ) {
        preset[0] = { ...(preset[0] as object), buildPreset: (preset[0] as { buildPreset: unknown }).buildPreset };
      }
    } else {
      throw new Error(
        `Invalid preset specified in Babel options: "${describeBuiltin(presetName)}"`,
      );
    }
    return preset as PresetItem;
  });

  // Parse plugin names
  const plugins: PluginItem[] = (options.plugins || []).map((pluginName) => {
    const plugin = loadBuiltin(availablePlugins, pluginName);

    if (!plugin) {
      throw new Error(
        `Invalid plugin specified in Babel options: "${describeBuiltin(pluginName)}"`,
      );
    }
    return plugin as PluginItem;
  });

  return {
    babelrc: false,
    ...options,
    presets,
    plugins,
  };
}

/** preset/plugin 可能是字符串名、[名, 选项] 元组或真实模块，报错信息里取其可读形式 */
function describeBuiltin(name: unknown): string {
  if (typeof name === 'string') {
    return name;
  }
  if (isArray(name) && typeof name[0] === 'string') {
    return name[0];
  }
  return String((name as { name?: string })?.name ?? name);
}

export function registerPreset(name: string, preset: object | Function): void {
  if (Object.prototype.hasOwnProperty.call(availablePresets, name)) {
    if (name === 'env') {
      // eslint-disable-next-line no-console
      console.warn(
        '@babel/preset-env is now included in @babel/standalone, please remove @babel/preset-env-standalone',
      );
    } else {
      // eslint-disable-next-line no-console
      console.warn(
        `A preset named "${name}" is already registered, it will be overridden`,
      );
    }
  }
  availablePresets[name] = preset;
}

// Babel 8 起 `transform` 只接受回调，同步调用改用 `transformSync`
export function transform(code: string, options: InputOptions) {
  return babelTransformSync(code, processOptions(options));
}


export function registerPresets(newPresets: Record<string, object | Function>): void {
  Object.keys(newPresets).forEach((name) => registerPreset(name, newPresets[name]));
}


registerPresets({
  env: presetEnv as unknown as object,
  react: presetReact as unknown as object,
});
