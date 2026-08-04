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

export interface PresignRequest {
  content_type: string;
  size_bytes: number;
}

export interface PresignResult {
  upload_url: string;
  object_url: string;
  key: string;
  expires_in_seconds: number;
  max_size_bytes: number;
}

export interface AiDiagnosisOut {
  id: string;
  plant_log_id: string;
  disease_name: string;
  confidence: number;
  treatment_recommendation: string | null;
  created_at: string;
}

export interface TimelineEntry {
  log: PlantLog;
  reporter_name: string;
}

export interface PlantLogCreate {
  status: PlantStatus;
  note?: string;
  images?: string[];
  client_uuid?: string;
}

export type TaskType = 'WATER' | 'FERTILIZE' | 'SPRAY' | 'INSPECT' | 'HARVEST' | 'OTHER';
export type TaskStatus = 'PENDING' | 'IN_PROGRESS' | 'DONE' | 'CANCELLED';

export interface TaskOut {
  id: string;
  garden_id: string;
  plant_id: string | null;
  assignee_id: string | null;
  created_by: string;
  type: TaskType;
  description: string | null;
  status: TaskStatus;
  due_date: string | null;
  completed_at: string | null;
  proof_images: string[];
  created_at: string;
}

export interface TaskCreate {
  garden_id: string;
  type: TaskType;
  plant_id?: string | null;
  assignee_id?: string | null;
  description?: string | null;
  due_date?: string | null;
}

export interface TaskUpdate {
  type?: TaskType;
  plant_id?: string | null;
  assignee_id?: string | null;
  description?: string | null;
  due_date?: string | null;
  status?: TaskStatus;
}

export interface TaskComplete {
  proof_images: string[];
}

export interface ScheduleCreate {
  type: TaskType;
  cron_expr: string;
  description?: string | null;
  zone_id?: string | null;
  is_active?: boolean;
}

export interface ScheduleOut {
  id: string;
  garden_id: string;
  zone_id: string | null;
  type: TaskType;
  description: string | null;
  cron_expr: string;
  next_run_at: string | null;
  is_active: boolean;
  created_at: string;
}

export interface NotificationOut {
  id: string;
  user_id: string;
  title: string;
  body: string | null;
  ref_type: string | null;
  ref_id: string | null;
  is_read: boolean;
  created_at: string;
}

export interface UnreadCount {
  unread: number;
}

export type StatusCounts = Record<PlantStatus, number>;

export interface ZoneStat {
  zone_id: string | null;
  zone_name: string;
  total: number;
  by_status: StatusCounts;
}

export interface WeekPoint {
  week_start: string;
  reports: number;
  sick: number;
  watching: number;
}

export interface Alert {
  symptom: PlantStatus;
  plant_count: number;
  window_days: number;
  dominant_zone: string | null;
}

export interface GardenStats {
  garden_id: string;
  total_plants: number;
  by_status: StatusCounts;
  updated_today: number;
  stale: number;
  reports_last_7_days: number;
  by_zone: ZoneStat[];
  weekly_trend: WeekPoint[];
  alerts: Alert[];
}

export interface AISummarizeRequest {
  garden_id: string;
  window_days: number;
}

export interface Highlight {
  plant_id: string;
  code: string;
  status: PlantStatus;
  reason: string;
}

export interface AISummaryOut {
  garden_id: string;
  summary: string;
  highlights: Highlight[];
  alerts: Alert[];
  model_name: string;
  generated_at: string;
}

