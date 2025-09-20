import { createUserRepository } from '../internal/adapters/db/repository.factory';
import { clearPreferences } from '../internal/adapters/http/preferences.handler';

// Ensure we're using memory repository for tests
process.env.NODE_ENV = 'test';

const userRepository = createUserRepository();

beforeEach(async () => {
  await userRepository.clearDb();
  clearPreferences();
});

afterAll(async () => {
  if (userRepository.close) {
    await userRepository.close();
  }
});

export { userRepository };