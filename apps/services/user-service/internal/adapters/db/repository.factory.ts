import { PostgresUserRepository } from './postgres.repository';
import * as memory from './memory';

export interface UserRepository {
  addUser(user: memory.User): Promise<void>;
  findUserByEmail(email: string): Promise<memory.User | undefined>;
  findUserById(id: string): Promise<memory.User | undefined>;
  updateUser(id: string, data: Partial<Pick<memory.User, 'email' | 'name'>>): Promise<void>;
  deleteUser(id: string): Promise<void>;
  addToken(tokenObj: memory.TokenObj): Promise<void>;
  findToken(token: string, type?: memory.TokenObj['type']): Promise<memory.TokenObj | undefined>;
  deleteToken(token: string): Promise<void>;
  updateUserPassword(email: string, newPassword: string): Promise<void>;
  getAllUsers?(): Promise<memory.User[]>;
  clearDb(): Promise<void>;
  close?(): Promise<void>;
}

class MemoryUserRepository implements UserRepository {
  async addUser(user: memory.User): Promise<void> {
    memory.addUser(user);
  }

  async findUserByEmail(email: string): Promise<memory.User | undefined> {
    return memory.findUserByEmail(email);
  }

  async findUserById(id: string): Promise<memory.User | undefined> {
    return memory.findUserById(id);
  }

  async updateUser(id: string, data: Partial<Pick<memory.User, 'email' | 'name'>>): Promise<void> {
    memory.updateUser(id, data);
  }

  async deleteUser(id: string): Promise<void> {
    memory.deleteUser(id);
  }

  async addToken(tokenObj: memory.TokenObj): Promise<void> {
    memory.addToken(tokenObj);
  }

  async findToken(token: string, type?: memory.TokenObj['type']): Promise<memory.TokenObj | undefined> {
    return memory.findToken(token, type);
  }

  async deleteToken(token: string): Promise<void> {
    memory.deleteToken(token);
  }

  async updateUserPassword(email: string, newPassword: string): Promise<void> {
    memory.updateUserPassword(email, newPassword);
  }

  async getAllUsers(): Promise<memory.User[]> {
    return memory.db.users;
  }

  async clearDb(): Promise<void> {
    memory.clearDb();
  }
}

export function createUserRepository(): UserRepository {
  const databaseUrl = process.env.DATABASE_URL;
  const nodeEnv = process.env.NODE_ENV;

  // Use memory repository for tests or when no DATABASE_URL is provided
  if (nodeEnv === 'test' || !databaseUrl) {
    console.log('Using memory repository');
    return new MemoryUserRepository();
  }

  console.log('Using PostgreSQL repository');
  return new PostgresUserRepository(databaseUrl);
}