import React from 'react';

interface I18nString {
  type: 'i18n';
  [key: string]: string;
}

export type Text = string | I18nString;

export interface SortMeta {
  category?: Text;
  group?: Text;
  hidden?: boolean;
  priority?: number;
}

export interface SnippetMeta {
  id?: string;
  componentName: string;
  title: Text;
  screenshot?: string | React.ReactNode;
  schema: any;
}

export interface StandardComponentMeta extends SortMeta{
  componentName: Text;
  icon: string | React.ReactNode;
  title: Text;
  description: Text;
  category?: Text;
  keywords?: Text[];
  sort?: SortMeta;
  snippets?: SnippetMeta[];
}

export interface StandardMeta {
  componentList: StandardComponentMeta[];
  groupList: Text[];
}

export interface SortedCategory {
  name: Text;
  priority: number;
  components: StandardComponentMeta[];
}

export interface SortedGroups {
  categories: SortedCategory[];
  name: Text;
  /** 排序权重，数值大的分组靠前 */
  priority: number;
  /** 以 t(category) 为键的临时索引，便于去重合并同一分类 */
  content: Record<string, SortedCategory>;
}

export interface IgnoreComponents {
  [key: string]: string[];
}

export default function transform(raw: any, t: (input?: Text) => string) {
  let groupList: Text[] = [];
  let categoryList: Text[] = [];
  let ignoreComponents: IgnoreComponents = {};
  let componentList: StandardComponentMeta[] = [];

  if (raw?.groupList?.length) {
    groupList = raw.groupList;
  } else {
    groupList = [createI18n('组件', 'Components')];
  }
  if (raw?.ignoreComponents) {
    ignoreComponents = raw.ignoreComponents;
  }

  const snippets: SnippetMeta[] = [];
  const groups: SortedGroups[] = [];
  // 如果 assets 有 sort 属性，则表示为符合新协议规范的 assets
  if (raw?.sort?.groupList && raw?.sort?.categoryList) {
    const map = {} as any;
    groupList = raw.sort.groupList;
    categoryList = raw.sort.categoryList;
    componentList = raw.components?.filter((component: StandardComponentMeta & { hidden?: boolean; npm?: { package?: string } }) => {
      const ignoredNames: Record<string, boolean> = (ignoreComponents[component?.npm?.package ?? ''] || {}) as unknown as Record<string, boolean>;
      const ignore = component?.hidden || !component?.snippets?.length || ignoredNames[String(component.componentName)];
      return !ignore;
    }).map((component: StandardComponentMeta) => {
      component.snippets?.forEach(snippet => {
        snippet.id = `${t(component.group)}_${t(component.category)}_${component.componentName}_${snippet.title}`;
        snippets.push(snippet);
      });
      const { group = createI18n('默认分组', 'DefaultGroup'), priority: componentPriority = 0 } = component;
      const category: Text = component.category ?? createI18n('其他', 'Others');
      component.group = group;
      component.priority = componentPriority;
      const indexOfCategory = categoryList.indexOf(category);
      const categoryPriority = indexOfCategory === -1 ? -1 : categoryList.length - indexOfCategory;
      if (!map[t(group)]) {
        const groupIndex = groupList.indexOf(group);
        const groupPriority = groupIndex === -1 ? -1 : (groupList.length - groupIndex);
        const obj: SortedGroups = {
          name: group,
          content: {},
          categories: [],
          priority: groupPriority
        };

        map[t(group)] = obj;
        groups.push(obj);
      }
      const currentGroup: SortedGroups = map[t(group)];
      if (!currentGroup.content[t(category)]) {
        const cateObj: SortedCategory = {
          components: [],
          name: category,
          priority: categoryPriority,
        };
        currentGroup.content[t(category)] = cateObj;
        currentGroup.categories.push(cateObj);
      }
      const currentCategory = currentGroup.content[t(category)];

      currentCategory.components.push(component);
      return component;
    });
  } else if (raw?.componentList?.length) {
    const map = {} as any;

    componentList = pipe(raw.componentList)
      .pipe(flatten)
      .pipe(formatSort)
      .pipe(formatSnippets)
      .pipe((stdComponent: StandardComponentMeta) => {
        const { sort } = stdComponent;
        if (stdComponent.snippets?.length) {
          stdComponent.snippets.forEach(snippet => {
            snippet.id = `${t(sort?.group)}_${t(sort?.category)}_${snippet.componentName}_${snippet.title}`;
            snippets.push(snippet);
          });
        }
        return [stdComponent];
      })
      .pipe((stdComponent: StandardComponentMeta) => {
        const { sort } = stdComponent;
        // formatSort 已保证 sort.group / sort.category 必有值，这里再兜底以满足类型
        const group: Text = sort?.group ?? createI18n('组件', 'Components');
        const category: Text = sort?.category ?? createI18n('其他', 'Others');
        const priority = sort?.priority ?? 0;

        const hasGroup = textExistIn(group, groupList, t);

        if (hasGroup) {
          if (!map[t(group)]) {
            const groupIndex = groupList.indexOf(group);
            const groupPriority = groupIndex === -1 ? -1 : (groupList.length - groupIndex);
            const obj: SortedGroups = {
              name: group,
              content: {},
              categories: [],
              priority: groupPriority
            };

            map[t(group)] = obj;
            groups.push(obj);
          }
          const currentGroup: SortedGroups = map[t(group)];
          if (!currentGroup.content[t(category)]) {
            const cateObj: SortedCategory = {
              components: [],
              name: category,
              priority,
            };
            currentGroup.content[t(category)] = cateObj;
            currentGroup.categories.push(cateObj);
          }
          const currentCategory = currentGroup.content[t(category)];

          currentCategory.components.push(stdComponent);
        }

        return [stdComponent];
      })
      .run();

  }
  groups.sort((a, b) => {
    return b.priority - a.priority;
  });
  groups.forEach((group) => {
    if (!group.categories || !group.categories.length) {
      return;
    }
    group.categories.sort((a, b) => {
      return b.priority - a.priority;
    });
    group.categories = group.categories.map(category => {
      category?.components?.sort((a, b) => {
        return (b.priority || 0) - (a.priority || 0);
      });
      return category;
    });
  });

  return {
    groupList,
    componentList,
    groups,
    snippets,
  };
}

function flatten(item: any): any[] {
  if (typeof item === 'object') {
    // 带children，当做分组处理
    if (item?.children?.length) {
      return item.children.map((c: any) => ({
        category: item.title,
        ...c,
      }));
    }

    if (item.componentName) {
      return [item];
    }
  }
  return [];
}

function formatSort(item: any): any[] {
  const { sort = {} } = item;
  const category = sort.category || item.category;
  const useDefaultCategory = !category;

  item.sort = {
    group: createI18n('组件', 'Components'),
    ...sort,
    category: category || createI18n('其他', 'Others'),
    priority: useDefaultCategory ? -1 : sort.priority,
  };

  if (item.sort.hidden) {
    return [];
  }

  return [item];
}

function formatSnippets(item: any): any[] {
  item.snippets = item.snippets || [];

  if (item.snippets.length === 0) {
    item.snippets = [
      {
        componentName: item.componentName,
        schema: {
          componentName: item.componentName,
          props: item.props || item.defaultProps || {},
        },
      },
    ];
  }

  item.snippets = pipe(item.snippets)
    .pipe((snippet) => {
      if (!snippet.schema) {
        return [];
      }
      if (!snippet.screenshot) {
        snippet.screenshot = item.icon;
      }
      if (!snippet.componentName) {
        snippet.componentName = item.componentName;
      }
      return [snippet];
    })
    .run();
  return [item];
}

export function getTextReader(lang: string) {
  return (input?: Text): string => {
    if (typeof input === 'string') {
      return input;
    }
    if (input && typeof input === 'object' && input.type === 'i18n') {
      return input[lang];
    }
    return '';
  };
}

export function createI18n(zh_CN: string, en_US: string): Text {
  return {
    zh_CN,
    en_US,
    type: 'i18n',
  };
}

export function pipe(arr: any[]) {
  const fns: Array<(item: any) => any[]> = [];

  const last = (ret: any[]) => ret;

  function run(buffer: any[], fn: (item: any) => any[], next: (input: any[]) => any[]) {
    if (!buffer?.length) {
      return [];
    }
    const push = [...buffer];
    const pop: any[] = [];
    for (const item of push) {
      const result = fn(item) || [];
      const data = next(result) || [];
      pop.push(...data);
    }
    return pop;
  }

  return {
    pipe(fn: (item: any) => any[]) {
      fns.push(fn);
      return this;
    },
    run() {
      // 从右向左把每个转换函数串成 (input) => output 的处理链
      const steps: Array<(input: any[]) => any[]> = [...fns, last];
      const process = steps.reduceRight(
        (next, fn) => (input: any[]) => run(input, fn, next),
      );
      return process(arr);
    },
  };
}

export function textExistIn(text: Text, arr: Text[], t: (input?: Text) => string) {
  return !!arr.find((item) => t(item) === t(text));
}
