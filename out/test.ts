import { Demo } from './demo';

export namespace Test {
  export namespace Import {

    export interface Result {
      url: string;
      title: string;
      snippets: string[];
    }


  }

  export interface OrphanMessage {
    myString: string;
    myBool: Demo.UserStatus;
    myEnum: OrphanEnum[];
  }

  export interface OrphanUnaryRequest {
    someInt64: number;
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
    DoUnary(params: OrphanUnaryRequest): Promise<OrphanMessage>;
    DoStream(params: OrphanStreamRequest): Promise<OrphanMessage>;
  }
}
