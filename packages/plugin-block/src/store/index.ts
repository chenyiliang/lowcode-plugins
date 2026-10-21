import type { Block } from '../pane';

/**
 * 区块数据仓库：按区块 id 缓存解析后的 schema。
 *
 * 迁移说明：原实现所有参数均为隐式 any（旧 tsconfig 未开 strict），
 * 这里补上真实类型。value 为区块 schema 反序列化后的任意 JSON 结构，故为 unknown。
 */
class BlockStore {
  private store: Map<string, unknown>;

  constructor() {
    this.store = new Map();
  }

  init(blocks: Block[]) {
    blocks.forEach((block) => {
      const { id, schema } = block;
      this.store.set(`${id}`, JSON.parse(schema));
    });
  }

  set(id: string, snippets: unknown) {
    this.store.set(id, snippets);
  }

  get(id: string) {
    return this.store.get(id);
  }
}

const singleton = new BlockStore();

export default singleton;
