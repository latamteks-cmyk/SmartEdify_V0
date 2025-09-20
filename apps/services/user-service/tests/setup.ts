import { createUserRepository } from '../internal/adapters/db/repository.factory';

// Ensure we're using memory repository for tests
process.env.NODE_ENV = 'test';

const userRepository = createUserRepository();

beforeEach(async () => {
  await userRepository.clearDb();
});

afterAll(async () => {
  if (userRepository.close) {
    await userRepository.close();
  }
});

export { userRepository };