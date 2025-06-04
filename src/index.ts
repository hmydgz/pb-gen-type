import { IEnum, IField, INamespace, IService, IType, loadSync } from 'protobufjs'
import * as fs from 'fs'
import * as path from 'path'

// 类型定义
type ProtoNode = {
  nested?: Record<string, any>;
  fields?: Record<string, IField>;
  values?: Record<string, number>;
  methods?: Record<string, any>;
  options?: Record<string, any>;
  keyType?: string;
  type?: string;
  rule?: string;
  valuesOptions?: Record<string, { 'note.str'?: string; note?: string }>;
}

type NodeType = 'namespace' | 'interface' | 'enum' | 'service';

// 工具函数
let indentationStr = ''

// GRPC 类型映射
const grpcTypeMap: Record<string, string> = {
  'int32': 'number',
  'int64': 'number',
  'uint32': 'number',
  'uint64': 'number',
  'sint32': 'number',
  'sint64': 'number',
  'fixed32': 'number',
  'fixed64': 'number',
  'sfixed32': 'number',
  'sfixed64': 'number',
  'float': 'number',
  'double': 'number',
  'bool': 'boolean',
  'string': 'string',
  'bytes': 'Uint8Array',
}

/**
 * 深合并对象
 */
function deepMerge(target: any, source: any): any {
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
function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
}

/**
 * 将字符串转换为大驼峰格式
 */
function toPascalCase(str: string): string {
  return str
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join('')
}

/**
 * 将命名路径转换为大写
 */
function namePathToUpperCase(str: string): string {
  return str
    .split('.')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join('.')
}

/**
 * 生成嵌套结构
 */
function genNest<T extends (...rest: any[]) => string>(fn: T) {
  return (...rest: Parameters<typeof fn>) => {
    const currentIndent = indentationStr
    indentationStr += '  '
    const _note = rest[0]?.options?.['note']
    let result = fn(...rest)
    if (_note) result = `${indentationStr}/** ${_note} */\n` + result
    indentationStr = currentIndent
    return result
  }
}

/**
 * 遍历指定路径下所有proto文件
 */
function findAllProtoFiles(dir: string): string[] {
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
function getNodeType(node: ProtoNode): NodeType[] {
  const types: NodeType[] = []
  if (node.nested) types.push('namespace')
  if (node.fields) types.push('interface')
  if (node.values) types.push('enum')
  if (node.methods) types.push('service')
  return types
}

let rootName = ''
const imports = new Set<string>()

/**
 * 生成字段定义
 */
function genField(field: IField & { keyType?: string }, name: string): string {
  if (field.type.includes('.')) {
    const packageName = field.type.split('.')[0].toLowerCase()
    if (packageName !== rootName) imports.add(packageName)
  }
  let fieldStr = ''
  const _type = grpcTypeMap[field.type] ?? namePathToUpperCase(field.type)
  const isOptional = field.options?.['optional']
  const isArray = field.rule === 'repeated'
  const isMap = !!field?.keyType
  const typeStr = isMap ? `Record<${grpcTypeMap[field.keyType!]}, ${_type}>` : _type
  fieldStr += `${name}${isOptional ? '?' : ''}: ${typeStr}${isArray ? '[]' : ''};\n`
  return fieldStr
}

/**
 * 生成枚举定义
 */
const genEnum = genNest((_enum: IEnum & { valuesOptions?: Record<string, { 'note.str'?: string; note?: string }> }, name: string): string => {
  let enumStr = ''
  enumStr += `${indentationStr}export const enum ${name} {\n`

  Object.keys(_enum.values).forEach((key) => {
    const valueOptions = _enum?.valuesOptions?.[key]
    const _note = valueOptions?.['note.str'] || valueOptions?.['note']
    if (_note) enumStr += `${indentationStr}  /** ${_note} */\n`
    enumStr += `${indentationStr}  ${key} = ${_enum.values[key]},\n`
  })

  enumStr += `${indentationStr}}\n\n`
  return enumStr
})

/**
 * 生成服务定义
 */
const genService = genNest((service: IService, name: string): string => {
  let serviceStr = ''
  serviceStr += `${indentationStr}export interface ${toPascalCase(name)} {\n`

  Object.keys(service.methods).forEach((key) => {
    const _note = service.methods[key].options?.['note']
    if (_note) serviceStr += `${indentationStr}  /** ${_note} */\n`
    serviceStr += `${indentationStr}  ${toPascalCase(key)}(params: ${service.methods[key].requestType}): Promise<${service.methods[key].responseType}>;\n`
  })

  serviceStr += `${indentationStr}}\n\n`
  return serviceStr
})

/**
 * 生成命名空间定义
 */
const genNamespace = genNest((namespace: INamespace, name: string): string => {
  let namespaceStr = ''
  namespaceStr += `${indentationStr}export namespace ${toPascalCase(name)} {\n`

  if (namespace.nested) {
    const instance = namespace.nested

    namespaceStr = handleNested(instance, namespaceStr)
  }

  if (namespaceStr.endsWith('\n')) namespaceStr = namespaceStr.slice(0, -1)

  namespaceStr += `${indentationStr}}\n\n`
  return namespaceStr
})

/**
 * 生成接口定义
 */
const genInterface = genNest((_interface: IType, name: string): string => {
  let interfaceStr = ''
  interfaceStr += `${indentationStr}export interface ${toPascalCase(name)} {\n`

  Object.keys(_interface.fields).forEach((key) => {
    const _note = _interface.fields[key].options?.['note'] || _interface.fields[key].options?.['note.str']
    if (_note) interfaceStr += `${indentationStr}  /** ${_note} */\n`
    interfaceStr += `${indentationStr}  ${genField(_interface.fields[key], key)}`
  })

  interfaceStr += `${indentationStr}}\n\n`
  return interfaceStr
})

/**
 * 生成模块定义
 */
function genModules(key: string, module: INamespace): string {
  rootName = key
  imports.clear()

  let moduleStr = ''
  const instance = module.nested

  if (!instance) return moduleStr

  moduleStr += `export namespace ${toPascalCase(key)} {\n`

  moduleStr = handleNested(instance, moduleStr)

  if (imports.size) {
    let importStr = ''
    imports.forEach((importName) => {
      importStr += `import { ${toPascalCase(importName)} } from './${importName}';\n`
    })
    moduleStr = importStr + '\n' + moduleStr
  }

  indentationStr = ''
  if (moduleStr.endsWith('\n')) moduleStr = moduleStr.slice(0, -1)
  moduleStr += '}\n'
  return moduleStr
}

const handleFnMap: Record<NodeType, (...args: any[]) => string> = {
  namespace: genNamespace,
  interface: genInterface,
  enum: genEnum,
  service: genService,
}

const handleNested = (instance: Record<string, any>, str: string) => {
  const elementMap: Record<NodeType, string[]> = {
    namespace: [] as string[],
    interface: [] as string[],
    enum: [] as string[],
    service: [] as string[],
  }

  Object.keys(instance).forEach((key) => {
    const _module = instance[key]
    const types = getNodeType(_module)
    types.forEach(type => elementMap[type].push(key))
  })

  const elementMapKeys = Object.keys(elementMap)

  elementMapKeys.forEach((type) => {
    elementMap[type as NodeType].forEach((key) => {
      str += handleFnMap[type as NodeType](instance[key], key)
    })
  })

  return str
}


// 主程序
export function genType(options: {
  protoDir: string
  outDir: string
  saveJson?: boolean
}) {
  try {
    const protoDir = path.resolve(options.protoDir)
    const outDir = path.resolve(options.outDir)

    // 确保输出目录存在
    ensureDir(outDir)

    // 清空输出目录
    fs.readdirSync(outDir).forEach((file) => {
      fs.unlinkSync(path.join(outDir, file))
    })

    // 获取所有proto文件
    const protoFiles = findAllProtoFiles(protoDir)

    // 解析并合并所有proto文件
    let allProtos: INamespace = {}
    protoFiles.forEach((file) => {
      const json = loadSync(file).toJSON()
      allProtos = deepMerge(allProtos, json)
    })

    // 保存合并后的proto定义
    if (options.saveJson) {
      const outFile = path.join(outDir, 'all-protos.json')
      fs.writeFileSync(outFile, JSON.stringify(allProtos, null, 2))
    }

    let indexStr = ''

    // 生成TypeScript类型定义文件
    if (allProtos.nested) {
      Object.keys(allProtos.nested).forEach((key) => {
        const module = allProtos.nested![key]
        const outFile = path.join(outDir, `${key}.ts`)
        fs.writeFileSync(outFile, genModules(key, module))

        indexStr += `export * from './${key}';\n`
      })
    }

    const indexFile = path.join(outDir, 'index.ts')
    fs.writeFileSync(indexFile, indexStr)
  } catch (error) {
    console.error('Error processing proto files:', error)
    process.exit(1)
  }
}
