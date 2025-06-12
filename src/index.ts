import { IEnum, IField, INamespace, IService, IType, loadSync } from 'protobufjs'
import * as fs from 'fs'
import * as path from 'path'
import { deepMerge, ensureDir, findAllProtoFiles, getNodeType, namePathToUpperCase, toPascalCase } from './utils';
import { NodeType } from './type';

// 缩进
let indentationStr = ''

// 是否有rpc
let hasRpc = false

const serviceMap: Record<string, string[]> = {}

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
  if (!serviceMap[rootName]) serviceMap[rootName] = []
  serviceMap[rootName].push(name)

  let serviceStr = ''
  serviceStr += `${indentationStr}export interface ${toPascalCase(name)} {\n`

  const methods = Object.keys(service.methods)

  if (methods.length) hasRpc = true

  // 生成服务端类型定义
  methods.forEach((key) => {
    const _note = service.methods[key].options?.['note']
    if (_note) serviceStr += `${indentationStr}  /** ${_note} */\n`
    serviceStr += `${indentationStr}  ${toPascalCase(key)}(params: ${service.methods[key].requestType}, metadata?: Metadata): Promise<${service.methods[key].responseType}>;\n`
  })
  serviceStr += `${indentationStr}}\n\n`

  // 生成客户端类型定义
  serviceStr += `${indentationStr}export interface ${toPascalCase(name)}Client {\n`
  methods.forEach((key) => {
    const _note = service.methods[key].options?.['note']
    if (_note) serviceStr += `${indentationStr}  /** ${_note} */\n`
    serviceStr += `${indentationStr}  ${toPascalCase(key)}(params: ${service.methods[key].requestType}, metadata?: Metadata): Observable<${service.methods[key].responseType}>;\n`
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
  hasRpc = false
  imports.clear()

  let moduleStr = ''
  const instance = module.nested

  if (!instance) return moduleStr

  moduleStr += `export namespace ${toPascalCase(key)} {\n`

  moduleStr = handleNested(instance, moduleStr)

  if (imports.size || hasRpc) {
    let importStr = ''
    if (hasRpc) {
      importStr += `import { Metadata } from '@grpc/grpc-js';\n`
      importStr += `import { Observable } from 'rxjs';\n`
    }
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

function genIndex(allProtos: INamespace) {
  let indexStr = ''
  if (allProtos.nested) {
    Object.keys(allProtos.nested).forEach((key) => {
      indexStr += `export * from './${key}';\n`
    })
  }

  const hasServicePackages = Object.keys(serviceMap)

  if (hasServicePackages.length) {
    hasServicePackages.forEach((key) => {
      indexStr += `import { ${namePathToUpperCase(key)} } from './${key}';\n`
    })

    indexStr += '\nexport enum PackageName {\n'
    indexStr += `${hasServicePackages.map(key => `  ${namePathToUpperCase(key)} = '${key}',`).join('\n')}\n`
    indexStr += '}\n\n'

    hasServicePackages.forEach((key) => {
      indexStr += `export enum ${namePathToUpperCase(key)}ServiceName {\n`
      indexStr += `${serviceMap[key].map(name => `  ${toPascalCase(name)} = '${name}',`).join('\n')}\n`
      indexStr += `${indentationStr}}\n\n`
    })

    indexStr += `export type PackageServiceMap = {
${hasServicePackages.map(key => `  [PackageName.${namePathToUpperCase(key)}]: {
${serviceMap[key].map(name => `    [${namePathToUpperCase(key)}ServiceName.${toPascalCase(name)}]: ${namePathToUpperCase(key)}.${toPascalCase(name)}Client,`).join('\n')}
  },`).join('\n')}
}
`
  }

  return indexStr
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

    // 生成TypeScript类型定义文件
    if (allProtos.nested) {
      Object.keys(allProtos.nested).forEach((key) => {
        const module = allProtos.nested![key]
        const outFile = path.join(outDir, `${key}.ts`)
        fs.writeFileSync(outFile, genModules(key, module))
      })
    }

    const indexFile = path.join(outDir, 'index.ts')
    fs.writeFileSync(indexFile, genIndex(allProtos))

  } catch (error) {
    console.error('Error processing proto files:', error)
    process.exit(1)
  }
}
