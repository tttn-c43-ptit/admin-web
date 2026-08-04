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

export type PlantStatus = 'UNKNOWN' | 'HEALTHY' | 'WATCHING' | 'SICK' | 'DEAD';

export interface Plant {
  id: string;
  garden_id: string;
  zone_id: string | null;
  code: string;
  grid_x: number | null;
  grid_y: number | null;
  status: PlantStatus;
  planted_at: string | null;
  created_at: string;
  updated_at: string;
}

export type TagType = 'QR' | 'BARCODE';
export type TagStatus = 'ACTIVE' | 'DAMAGED' | 'LOST' | 'REPLACED';

export interface Tag {
  id: string;
  plant_id: string;
  tag_code: string;
  tag_type: TagType;
  status: TagStatus;
  replaced_by: string | null;
  created_at: string;
}

export interface PlantLog {
  id: string;
  plant_id: string;
  status: PlantStatus;
  note: string | null;
  images: string[];
  reporter_id: string;
  client_uuid: string | null;
  client_created_at: string | null;
  created_at: string;
}

export interface ScanResult {
  tag: Tag;
  plant: Plant;
  garden: Garden;
  recent_logs: PlantLog[];
}
