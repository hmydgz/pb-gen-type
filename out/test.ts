import { Demo } from './demo';
import { Test2 } from './test2';
import { Metadata } from '@grpc/grpc-js';

export namespace Test {
  export interface OrphanMessage {
    myString: string;
    myBool: Demo.UserStatus;
    myEnum: OrphanEnum[];
  }

  export interface OrphanUnaryRequest {
    someInt64: Test2.Result;
  }

  export interface OrphanStreamRequest {
    someString: string;
  }

  export const enum OrphanEnum {
    UNKNOWN = 0,
    ONE = 1,
    TWO = 2,
  }

  export interface OrphanService {
    DoUnary(params: OrphanUnaryRequest, metadata?: Metadata): Promise<OrphanMessage>;
    DoStream(params: OrphanStreamRequest, metadata?: Metadata): Promise<OrphanMessage>;
  }
}
