# @hmydgz/pb-gen-type

自用的通过pb生成type的库

# Usage

```
npm i @hmydgz/pb-gen-type
```

```javascript
import path from 'path'
import { genType } from '../src/index.ts'

genType({
  // 指向pb目录
  protoDir: path.resolve(__dirname, '../protos'),
  // 指向输出目录
  outDir: path.resolve(__dirname, '../out'),
  // 是否生成中间产物的json文件
  saveJson: true,
})
```

# 注意

1. pb 暂时只支持相对路径 import
2. 产物会根据 pb 的所有包名来分开生成，只生成顶级域的文件