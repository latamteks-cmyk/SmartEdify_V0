/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
  // Create users table
  pgm.createTable('users', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()')
    },
    email: {
      type: 'varchar(255)',
      notNull: true,
      unique: true
    },
    password: {
      type: 'varchar(255)',
      notNull: true
    },
    name: {
      type: 'varchar(255)',
      notNull: true
    },
    created_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('current_timestamp')
    },
    updated_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('current_timestamp')
    }
  });

  // Create tokens table
  pgm.createTable('tokens', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()')
    },
    user_id: {
      type: 'uuid',
      notNull: true,
      references: 'users(id)',
      onDelete: 'CASCADE'
    },
    token: {
      type: 'varchar(500)',
      notNull: true,
      unique: true
    },
    type: {
      type: 'varchar(50)',
      notNull: true,
      default: 'access'
    },
    expires_at: {
      type: 'timestamp',
      notNull: true
    },
    created_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('current_timestamp')
    }
  });

  // Create indexes
  pgm.createIndex('users', 'email');
  pgm.createIndex('tokens', 'user_id');
  pgm.createIndex('tokens', 'token');
  pgm.createIndex('tokens', ['type', 'expires_at']);
};

exports.down = pgm => {
  pgm.dropTable('tokens');
  pgm.dropTable('users');
};
