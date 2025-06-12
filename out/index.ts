export * from './demo';
export * from './test';
export * from './test2';
import { Demo } from './demo';
import { Test } from './test';

export enum PackageName {
  Demo = 'demo',
  Test = 'test',
}

export enum DemoServiceName {
  UserService = 'UserService',
}

export enum TestServiceName {
  OrphanService = 'OrphanService',
}

export type PackageServiceMap = {
  [PackageName.Demo]: {
    [DemoServiceName.UserService]: Demo.UserServiceClient,
  },
  [PackageName.Test]: {
    [TestServiceName.OrphanService]: Test.OrphanServiceClient,
  },
}
