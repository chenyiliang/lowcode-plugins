import _isArray from 'lodash/isArray';
import _isPlainObject from 'lodash/isPlainObject';
import _findIndex from 'lodash/findIndex';
import _isUndefined from 'lodash/isUndefined';

/**
 * 合并两个对象数组，如果指定了 KEY，当存在 KEY 值相同的情况，将第一个对象数组里的对象替换
 * @param list1 待合并的第一个对象数组
 * @param list2 待合并的第二个对象数组
 * @param key 判断是否覆盖的对象 KEY
 * @param returns 合并后的对象数组
 *
 * 迁移说明：原签名把两个入参都写成 Array<Record<string, unknown>>，导致返回值丢失元素类型，
 * 调用方拿不到 DataSourcePaneImportPlugin[]。这里改为泛型，保留真实元素类型。
 */
export function mergeTwoObjectListByKey<T extends object>(
  list1: T[],
  list2: T[],
  key: string,
): T[] {
  if (!_isArray(list1) && !_isArray(list2)) {
    return [];
  }
  if (!_isArray(list1)) {
    return [...list2];
  }
  if (!_isArray(list2)) {
    return [...list1];
  }
  // key 用于运行时比较，元素类型 T 未必有索引签名，故取键值时经 Record 视图访问
  const valueOf = (item: T) => (item as Record<string, unknown>)[key];
  return list2.reduce<T[]>((acc, cur) => {
    if (!_isPlainObject(cur)) return acc;
    const indexToReplace = _findIndex(acc, (item) => valueOf(item) === valueOf(cur));
    if (indexToReplace !== -1) {
      acc[indexToReplace] = { ...cur };
      return acc;
    }
    return acc.concat([cur]);
  }, list1);
}

export function generateClassName(name: string) {
  return `lowcode-plugin-datasource-pane-${name}`;
}

export function safeParse(input: any, fallbackValue?: any) {
  try {
    return JSON.parse(input);
  } catch (err) {
    if (!_isUndefined(fallbackValue)) {
      return fallbackValue;
    }
    return input;
  }
}
