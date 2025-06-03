# @hmydgz/pb-gen-type

通过 [protobufjs](https://www.npmjs.com/package/protobufjs) 解析 pb ，生成自用的 type 的工具库；
通过包名的顶级域拆分生成的文件，方便区分给哪个微服务用
pb 暂时只支持相对路径 import


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