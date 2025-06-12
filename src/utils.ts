import fs from 'fs'
import path from 'path'
import { NodeType, ProtoNode } from './type'

/**
 * 深合并对象
 */
export function deepMerge(target: any, source: any): any {
  if (source === null || typeof source !== 'object') {
    return source
  }

  if (Array.isArray(source)) {
    return source
  }

  const result = { ...target }
  for (const key in source) {
    if (source.hasOwnProperty(key)) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = deepMerge(result[key] || {}, source[key])
      } else {
        result[key] = source[key]
      }
    }
  }
  return result
}

/**
 * 确保目录存在
 */
export function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
}

/**
 * 将字符串转换为大驼峰格式
 */
export function toPascalCase(str: string): string {
  return str
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join('')
}

/**
 * 将命名路径转换为大写
 */
export function namePathToUpperCase(str: string): string {
  return toPascalCase(str)
    .split('.')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join('.')
}

/**
 * 遍历指定路径下所有proto文件
 */
export function findAllProtoFiles(dir: string): string[] {
  const protoFiles: string[] = []
  const files = fs.readdirSync(dir)

  for (const file of files) {
    const fullPath = path.join(dir, file)
    const stat = fs.statSync(fullPath)

    if (stat.isDirectory()) {
      protoFiles.push(...findAllProtoFiles(fullPath))
    } else if (file.endsWith('.proto')) {
      protoFiles.push(fullPath)
    }
  }

  return protoFiles
}

/**
* 获取节点类型
*/
export function getNodeType(node: ProtoNode): NodeType[] {
 const types: NodeType[] = []
 if (node.nested) types.push('namespace')
 if (node.fields) types.push('interface')
 if (node.values) types.push('enum')
 if (node.methods) types.push('service')
 return types
}