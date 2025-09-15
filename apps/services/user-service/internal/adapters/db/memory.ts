export interface User {
  id: string;
  email: string;
  password: string;
  name: string;
}

export interface TokenObj {
  userId: string;
  token: string;
  expires: number;
  type?: 'reset' | 'access' | 'refresh';
}

export const db: {
  users: User[];
  tokens: TokenObj[];
} = {
  users: [],
  tokens: [],
};

export function clearDb(): void {
  db.users = [];
  db.tokens = [];
}

export function addUser(user: User): void {
  db.users.push(user);
}

export function findUserByEmail(email: string): User | undefined {
  return db.users.find(u => u.email === email);
}

export function findUserById(id: string): User | undefined {
  return db.users.find(u => u.id === id);
}

export function updateUser(id: string, data: Partial<Pick<User, 'email' | 'name'>>): void {
  const idx = db.users.findIndex(u => u.id === id);
  if (idx >= 0) {
    db.users[idx] = { ...db.users[idx], ...data };
  }
}

export function deleteUser(id: string): void {
  db.users = db.users.filter(u => u.id !== id);
}

export function addToken(tokenObj: TokenObj): void {
  db.tokens.push(tokenObj);
}

export function findToken(token: string, type?: TokenObj['type']): TokenObj | undefined {
  return db.tokens.find(t => t.token === token && (!type || t.type === type));
}

export function deleteToken(token: string): void {
  db.tokens = db.tokens.filter(t => t.token !== token);
}

export function updateUserPassword(email: string, newPassword: string): void {
  const user = findUserByEmail(email);
  if (user) user.password = newPassword;
}