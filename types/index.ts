export interface PaginationParams {
  limit?: number;
  offset?: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
}

export interface User {
  id: string;
  identifier: string;
  role: 'OWNER' | 'STAFF';
  status: string;
  created_at: string;
}

export interface Garden {
  id: string;
  name: string;
  address: string;
  plant_type: string;
  area_m2: number | null;
  owner_id: string;
  created_at: string;
  updated_at: string;
}

export interface GardenBoundary {
  type: "Polygon";
  coordinates: number[][][];
}

export interface GardenDetail extends Garden {
  boundary: GardenBoundary | null;
}

export interface Zone {
  id: string;
  garden_id: string;
  name: string;
  grid_position: string | null;
  created_at: string;
  updated_at: string;
}

export interface ZoneAssignment {
  user_id: string;
  user_identifier: string;
  assigned_at: string;
}
