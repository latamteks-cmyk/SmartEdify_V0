export interface User {
    id: string;
    tenant_id: string;
    email: string;
    phone?: string;
    status?: string;
    pwd_hash: string;
    pwd_salt?: string;
    name: string;
    created_at: Date;
    updated_at: Date;
  }
  