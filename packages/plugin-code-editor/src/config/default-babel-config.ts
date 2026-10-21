import type { InputOptions } from '@babel/core';

export const defaultBabelConfig: InputOptions = {
  presets: [
    [
      "env",
      {
        "targets": {
          "chrome": "80"
        },
        "exclude": [
          "babel-plugin-transform-async-to-generator",
          "babel-plugin-transform-regenerator",
        ]
      }
    ],
    'react',
  ],
  sourceType: 'script',
};
