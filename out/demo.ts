export namespace Demo {
  /** UserProfileuserId */
  export interface UserProfile {
    userId: number;
    username: string;
    /** 电子邮件已废弃，请使用新的联系方式 */
    email: string;
    isActive: boolean;
    status: UserStatus;
    phoneNumbers: string[];
    userRating: number;
    accountBalance: number;
    profilePicture: Uint8Array;
    createdAt: number;
  }

  export interface Inventory {
    stockQuantity: number;
    location: string;
  }

  export interface Product {
    productId: number;
    productName: string;
    price: number;
    inventory: Inventory;
  }

  export interface PaymentMethod {
    methodId: string;
    creditCard: CreditCardDetails;
    paypal: PayPalDetails;
    bankTransfer: BankTransferDetails;
  }

  export interface CreditCardDetails {
    cardNumber: string;
    expiryDate: string;
    cardHolderName: string;
  }

  export interface PayPalDetails {
    email: string;
    transactionId: string;
  }

  export interface BankTransferDetails {
    bankName: string;
    accountNumber: string;
    swiftCode: string;
  }

  export interface ItemAttributes {
    itemId: number;
    itemName: string[];
    attributes: Record<string, string>;
    categoryCounts?: Record<string, BankTransferDetails>;
  }

  export interface DeprecatedMessage {
    newField: number;
    currentData: string;
  }

  export interface GetUserProfileRequest {
    userId: number;
  }

  export interface CreateUserRequest {
    username: string;
    email: string;
    phoneNumbers: string[];
  }

  export interface CreateUserResponse {
    success: boolean;
    message: string;
    createdUser: UserProfile;
  }

  export interface UpdateUserStatusRequest {
    userId: number;
    newStatus: UserStatus;
  }

  export interface UpdateUserStatusResponse {
    success: boolean;
    message: string;
  }

  /** UserStatus */
  export const enum UserStatus {
    /** 用户状态未知 */
    USER_STATUS_UNKNOWN = 0,
    /** 用户状态活跃 */
    USER_STATUS_ACTIVE = 1,
    /** 用户状态不活跃 */
    USER_STATUS_INACTIVE = 2,
    /** 用户状态待定 */
    USER_STATUS_PENDING = 3,
  }

  /** UserService */
  export interface UserService {
    /** GetUserProfile */
    GetUserProfile(params: GetUserProfileRequest): Promise<UserProfile>;
    CreateUser(params: CreateUserRequest): Promise<CreateUserResponse>;
    UpdateUserStatus(params: UpdateUserStatusRequest): Promise<UpdateUserStatusResponse>;
  }
}
