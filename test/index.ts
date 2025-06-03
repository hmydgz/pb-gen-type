import path from 'path'
import { genType } from '../src/index.ts'

genType({
  protoDir: path.resolve(__dirname, '../protos'),
  outDir: path.resolve(__dirname, '../out'),
  saveJson: true,
})
