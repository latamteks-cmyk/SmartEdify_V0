export interface User {
  email: string;
  password: string;
  name: string;
}

export interface TokenObj {
  email: string;
  token: string;
  expires: number;
}

export const db: {
  users: User[];
  tokens: TokenObj[];
};
export function addUser(user: User): void;
export function findUserByEmail(email: string): User | undefined;
export function addToken(tokenObj: TokenObj): void;
export function findToken(token: string): TokenObj | undefined;
export function updateUserPassword(email: string, newPassword: string): void;