import React, { PureComponent } from 'react';
import { Search } from '@alifd/next';
import { DataSourceType } from '../../types';
import { generateClassName } from '../../utils/misc';

export interface DataSourceFilterProps {
  dataSourceTypes: DataSourceType[];
  onFilter?: (dataSourceType: string, keyword: string) => void;
}

export interface DataSourceFilterState {
  selectedDataSourceType: string;
  keyword: string;
}

export class DataSourceFilter extends PureComponent<
  DataSourceFilterProps,
  DataSourceFilterState
> {
  state = {
    selectedDataSourceType: '',
    keyword: '',
  };

  // Fusion Search 的 onFilterChange 回调值就是筛选器当前值（string），
  // 原代码把它标成 Record 再 as unknown as string，这里直接按真实签名声明。
  handleSearchFilterChange = (filter: string) => {
    const { onFilter } = this.props;
    this.setState(
      { selectedDataSourceType: filter },
      () => {
        const { keyword, selectedDataSourceType } = this.state;
        onFilter?.(keyword, selectedDataSourceType);
      },
    );
  };

  // Fusion Search/AutoComplete 的 onChange 签名：(value, actionType, item)
  handleChange = (val: string, actionType: string, item?: unknown) => {
    if (item === 'clear') {
      this.handleSearch('');
    }
  };

  handleSearch = (keyword: string) => {
    const { selectedDataSourceType } = this.state;
    const { onFilter } = this.props;
    onFilter?.(selectedDataSourceType, keyword);
    this.setState({ keyword }, () => {
      const { keyword, selectedDataSourceType } = this.state;
      onFilter?.(keyword, selectedDataSourceType);
    });
  };

  render() {
    const { dataSourceTypes } = this.props;
    const { selectedDataSourceType } = this.state;

    return (
      <div className={generateClassName('filters')}>
        <Search
          hasClear
          onChange={this.handleChange}
          onSearch={this.handleSearch}
          filterProps={{}}
          defaultFilterValue={selectedDataSourceType}
          filter={[
            {
              label: '全部',
              value: '',
            },
          ].concat(
            dataSourceTypes.map((type) => ({
              label: type?.type,
              value: type?.type,
            })),
          )}
          onFilterChange={this.handleSearchFilterChange}
        />
      </div>
    );
  }
}
