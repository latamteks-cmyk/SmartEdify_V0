/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
export const shorthands = undefined;

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const up = (pgm) => {
  // Enable required extensions
  pgm.createExtension('pgcrypto', { ifNotExists: true });

  // Create users table
  pgm.createTable('users', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()')
    },
    tenant_id: {
      type: 'text',
      notNull: true,
      default: 'default'
    },
    email: {
      type: 'text',
      notNull: true
    },
    phone: {
      type: 'text'
    },
    status: {
      type: 'text',
      default: 'active'
    },
    pwd_hash: {
      type: 'text',
      notNull: true
    },
    pwd_salt: {
      type: 'text',
      notNull: true
    },
    name: {
      type: 'text',
      notNull: true
    },
    created_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('now()')
    }
  });

  // Create user_roles table
  pgm.createTable('user_roles', {
    user_id: {
      type: 'uuid',
      notNull: true,
      references: 'users(id)',
      onDelete: 'CASCADE'
    },
    tenant_id: {
      type: 'text',
      notNull: true
    },
    role: {
      type: 'text',
      notNull: true
    },
    assigned_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('now()')
    }
  });

  // Create audit_security table
  pgm.createTable('audit_security', {
    id: {
      type: 'bigserial',
      primaryKey: true
    },
    actor: {
      type: 'text',
      notNull: true
    },
    event: {
      type: 'text',
      notNull: true
    },
    ip: {
      type: 'text',
      notNull: true
    },
    ua: {
      type: 'text',
      notNull: true
    },
    tenant_id: {
      type: 'text',
      notNull: true
    },
    details_json: {
      type: 'jsonb',
      notNull: true,
      default: '{}'
    },
    ts: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('now()')
    }
  });

  // Create constraints and indexes
  pgm.addConstraint('users', 'users_tenant_email_unique', {
    unique: ['tenant_id', 'email']
  });

  pgm.addConstraint('user_roles', 'user_roles_pkey', {
    primaryKey: ['user_id', 'tenant_id', 'role']
  });

  pgm.createIndex('users', 'email');
  pgm.createIndex('audit_security', 'ts');
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
  pgm.dropTable('audit_security');
  pgm.dropTable('user_roles');
  pgm.dropTable('users');
  pgm.dropExtension('pgcrypto');
};
