export interface Role {
  id: string;
  name: string;
  description?: string;
  created_at?: string;
}

export interface Permission {
  id: string;
  module: string;
  description?: string;
}

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  phone?: string;
  avatar_url?: string;
  role_id: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
  role?: Role;
}
