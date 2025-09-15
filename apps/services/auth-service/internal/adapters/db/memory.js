// Persistencia simple en memoria para usuarios y tokens
export const db = {
  users: [], // { email, password, name }
  tokens: [], // { email, token, expires }
};

export function addUser(user) {
  db.users.push(user);
}

export function findUserByEmail(email) {
  return db.users.find(u => u.email === email);
}

export function addToken(tokenObj) {
  db.tokens.push(tokenObj);
}

export function findToken(token) {
  return db.tokens.find(t => t.token === token);
}

export function updateUserPassword(email, newPassword) {
  const user = findUserByEmail(email);
  if (user) user.password = newPassword;
}
