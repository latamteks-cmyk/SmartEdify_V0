import { Pool, PoolClient } from 'pg';
import { User, TokenObj } from './memory';

export class PostgresUserRepository {
  private pool: Pool;

  constructor(connectionString: string) {
    this.pool = new Pool({
      connectionString,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });
  }

  async addUser(user: User): Promise<void> {
    const query = `
      INSERT INTO users (id, email, password, name)
      VALUES ($1, $2, $3, $4)
    `;
    await this.pool.query(query, [user.id, user.email, user.password, user.name]);
  }

  async findUserByEmail(email: string): Promise<User | undefined> {
    const query = 'SELECT id, email, password, name FROM users WHERE email = $1';
    const result = await this.pool.query(query, [email]);
    
    if (result.rows.length === 0) {
      return undefined;
    }

    const row = result.rows[0];
    return {
      id: row.id,
      email: row.email,
      password: row.password,
      name: row.name,
    };
  }

  async findUserById(id: string): Promise<User | undefined> {
    const query = 'SELECT id, email, password, name FROM users WHERE id = $1';
    const result = await this.pool.query(query, [id]);
    
    if (result.rows.length === 0) {
      return undefined;
    }

    const row = result.rows[0];
    return {
      id: row.id,
      email: row.email,
      password: row.password,
      name: row.name,
    };
  }

  async updateUser(id: string, data: Partial<Pick<User, 'email' | 'name'>>): Promise<void> {
    const fields = [];
    const values = [];
    let paramCount = 1;

    if (data.email) {
      fields.push(`email = $${paramCount++}`);
      values.push(data.email);
    }

    if (data.name) {
      fields.push(`name = $${paramCount++}`);
      values.push(data.name);
    }

    if (fields.length === 0) {
      return;
    }

    fields.push(`updated_at = current_timestamp`);
    values.push(id);

    const query = `
      UPDATE users 
      SET ${fields.join(', ')}
      WHERE id = $${paramCount}
    `;

    await this.pool.query(query, values);
  }

  async deleteUser(id: string): Promise<void> {
    const query = 'DELETE FROM users WHERE id = $1';
    await this.pool.query(query, [id]);
  }

  async addToken(tokenObj: TokenObj): Promise<void> {
    const query = `
      INSERT INTO tokens (user_id, token, type, expires_at)
      VALUES ($1, $2, $3, to_timestamp($4))
    `;
    await this.pool.query(query, [
      tokenObj.userId,
      tokenObj.token,
      tokenObj.type || 'access',
      tokenObj.expires / 1000, // Convert milliseconds to seconds
    ]);
  }

  async findToken(token: string, type?: TokenObj['type']): Promise<TokenObj | undefined> {
    let query = `
      SELECT user_id, token, type, EXTRACT(epoch FROM expires_at) * 1000 as expires
      FROM tokens 
      WHERE token = $1 AND expires_at > current_timestamp
    `;
    const params = [token];

    if (type) {
      query += ' AND type = $2';
      params.push(type);
    }

    const result = await this.pool.query(query, params);
    
    if (result.rows.length === 0) {
      return undefined;
    }

    const row = result.rows[0];
    return {
      userId: row.user_id,
      token: row.token,
      type: row.type,
      expires: parseInt(row.expires),
    };
  }

  async deleteToken(token: string): Promise<void> {
    const query = 'DELETE FROM tokens WHERE token = $1';
    await this.pool.query(query, [token]);
  }

  async updateUserPassword(email: string, newPassword: string): Promise<void> {
    const query = `
      UPDATE users 
      SET password = $1, updated_at = current_timestamp
      WHERE email = $2
    `;
    await this.pool.query(query, [newPassword, email]);
  }

  async getAllUsers(): Promise<User[]> {
    const query = 'SELECT id, email, password, name FROM users ORDER BY name';
    const result = await this.pool.query(query);
    
    return result.rows.map(row => ({
      id: row.id,
      email: row.email,
      password: row.password,
      name: row.name,
    }));
  }

  async clearDb(): Promise<void> {
    await this.pool.query('DELETE FROM tokens');
    await this.pool.query('DELETE FROM users');
  }

  async close(): Promise<void> {
    await this.pool.end();
  }

  async getClient(): Promise<PoolClient> {
    return await this.pool.connect();
  }
}