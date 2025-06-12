import { IField } from "protobufjs";

// 类型定义
export type ProtoNode = {
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

export type NodeType = 'namespace' | 'interface' | 'enum' | 'service';