/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
exports.shorthands = undefined;

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.up = (pgm) => {
	pgm.createExtension('pgcrypto', { ifNotExists: true });

	pgm.createTable('users', {
		id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
		tenant_id: { type: 'text', notNull: true, default: 'default' },
		email: { type: 'text', notNull: true },
		phone: { type: 'text' },
		status: { type: 'text', notNull: false, default: 'active' },
		pwd_hash: { type: 'text', notNull: true },
		pwd_salt: { type: 'text', notNull: true },
		name: { type: 'text', notNull: true },
		created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') }
	});
	pgm.addConstraint('users', 'users_tenant_email_unique', 'UNIQUE(tenant_id, email)');

	pgm.createTable('user_roles', {
		user_id: { type: 'uuid', notNull: true, references: 'users', onDelete: 'cascade' },
		tenant_id: { type: 'text', notNull: true },
		role: { type: 'text', notNull: true },
		assigned_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') }
	});
	pgm.addConstraint('user_roles', 'user_roles_pk', 'PRIMARY KEY(user_id, tenant_id, role)');

	pgm.createTable('audit_security', {
		id: { type: 'bigserial', primaryKey: true },
		actor: { type: 'text', notNull: true },
		event: { type: 'text', notNull: true },
		ip: { type: 'text', notNull: true },
		ua: { type: 'text', notNull: true },
		tenant_id: { type: 'text', notNull: true },
		details_json: { type: 'jsonb', notNull: true, default: pgm.func("'{}'::jsonb") },
		ts: { type: 'timestamptz', notNull: true, default: pgm.func('now()') }
	});

	pgm.createIndex('users', 'email', { name: 'idx_users_email', ifNotExists: true });
	pgm.createIndex('audit_security', 'ts', { name: 'idx_audit_security_ts', ifNotExists: true });
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.down = (pgm) => {
	pgm.dropTable('audit_security', { ifExists: true });
	pgm.dropTable('user_roles', { ifExists: true });
	pgm.dropTable('users', { ifExists: true });
};
