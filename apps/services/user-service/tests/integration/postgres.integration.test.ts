import { PostgresUserRepository } from '../../internal/adapters/db/postgres.repository';
import { v4 as uuidv4 } from 'uuid';

// This test only runs if DATABASE_URL is available
const DATABASE_URL = process.env.DATABASE_URL || process.env.TEST_DATABASE_URL;

describe('PostgreSQL Integration Tests', () => {
  let repository: PostgresUserRepository;

  beforeAll(async () => {
    if (!DATABASE_URL) {
      console.log('Skipping PostgreSQL tests - no DATABASE_URL provided');
      return;
    }
    repository = new PostgresUserRepository(DATABASE_URL);
  });

  afterAll(async () => {
    if (repository) {
      await repository.close();
    }
  });

  beforeEach(async () => {
    if (!repository) return;
    await repository.clearDb();
  });

  it('should create and find user by email', async () => {
    if (!repository) {
      console.log('Skipping test - no PostgreSQL connection');
      return;
    }

    const user = {
      id: uuidv4(),
      email: 'test@postgres.com',
      name: 'Test User',
      password: 'hashedpassword'
    };

    await repository.addUser(user);
    const foundUser = await repository.findUserByEmail(user.email);

    expect(foundUser).toBeDefined();
    expect(foundUser?.email).toBe(user.email);
    expect(foundUser?.name).toBe(user.name);
  });

  it('should update user information', async () => {
    if (!repository) {
      console.log('Skipping test - no PostgreSQL connection');
      return;
    }

    const user = {
      id: uuidv4(),
      email: 'update@postgres.com',
      name: 'Original Name',
      password: 'hashedpassword'
    };

    await repository.addUser(user);
    await repository.updateUser(user.id, { name: 'Updated Name', email: 'updated@postgres.com' });

    const updatedUser = await repository.findUserById(user.id);
    expect(updatedUser?.name).toBe('Updated Name');
    expect(updatedUser?.email).toBe('updated@postgres.com');
  });

  it('should handle tokens correctly', async () => {
    if (!repository) {
      console.log('Skipping test - no PostgreSQL connection');
      return;
    }

    const user = {
      id: uuidv4(),
      email: 'token@postgres.com',
      name: 'Token User',
      password: 'hashedpassword'
    };

    await repository.addUser(user);

    const token = {
      userId: user.id,
      token: 'test-token-123',
      type: 'access' as const,
      expires: Date.now() + 3600000 // 1 hour from now
    };

    await repository.addToken(token);
    const foundToken = await repository.findToken(token.token);

    expect(foundToken).toBeDefined();
    expect(foundToken?.userId).toBe(user.id);
    expect(foundToken?.type).toBe('access');
  });
});