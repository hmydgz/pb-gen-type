import { Metadata } from '@grpc/grpc-js';
import { Observable } from 'rxjs';
import { Demo } from './demo';
import { Test2 } from './test2';

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

  export interface OrphanServiceClient {
    DoUnary(params: OrphanUnaryRequest, metadata?: Metadata): Observable<OrphanMessage>;
    DoStream(params: OrphanStreamRequest, metadata?: Metadata): Observable<OrphanMessage>;
  }
}
