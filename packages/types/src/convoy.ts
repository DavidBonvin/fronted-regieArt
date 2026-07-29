export interface GeoCoordinates {
  lat: number;
  lng: number;
}

export type ScheduleType =
  | 'DEPARTURE'
  | 'ARRIVAL'
  | 'LOAD_IN'
  | 'SOUNDCHECK'
  | 'DOORS_OPEN'
  | 'CATERING_DINNER'
  | 'SHOWTIME'
  | 'LOAD_OUT'
  | 'OTHER';

export interface EventScheduleItem {
  id: string;
  type: ScheduleType;
  title: string;
  startTime: string;
  endTime?: string;
  location?: string;
  withWho?: string;
  notes?: string;
  isCompleted: boolean;
  completedAt?: string;
}

export interface CreateScheduleItemDto {
  type: ScheduleType;
  title: string;
  startTime: string;
  endTime?: string;
  location?: string;
  withWho?: string;
  notes?: string;
}

export interface UpdateScheduleItemDto {
  type?: ScheduleType;
  title?: string;
  startTime?: string;
  endTime?: string;
  location?: string;
  withWho?: string;
  notes?: string;
}

export interface VehiclePickupPoint {
  id: string;
  time: string;
  address: string;
  lat?: number;
  lng?: number;
  order: number;
  notes?: string;
}

export interface VehiclePassengerUser {
  id: string;
  displayName: string;
  avatarUrl: string | null;
}

export interface VehiclePassenger {
  userId: string;
  user: VehiclePassengerUser;
}

export interface EventVehicle {
  id: string;
  name: string;
  driverName?: string;
  driverPhone?: string;
  plateNumber?: string;
  capacity?: number;
  notes?: string;
  passengers: VehiclePassenger[];
  pickups: VehiclePickupPoint[];
}

export interface CreateVehicleDto {
  name: string;
  driverName?: string;
  driverPhone?: string;
  plateNumber?: string;
  capacity?: number;
  notes?: string;
}

export interface CreatePickupDto {
  time: string;
  address: string;
  lat?: number;
  lng?: number;
  order: number;
  notes?: string;
}

export interface Vehicle {
  id: string;
  name: string;
  plate: string;
  capacity: number;
  driverId: string;
  organizationId: string;
  notes?: string;
}

export interface Pickup {
  id: string;
  passengerId: string;
  vehicleId: string;
  address: string;
  scheduledTime: string;
  completed: boolean;
  completedAt?: string;
  coordinates?: GeoCoordinates;
  notes?: string;
}

export interface ConvoyPlan {
  id: string;
  daysheetId: string;
  organizationId: string;
  vehicles: Vehicle[];
  pickups: Pickup[];
  createdAt: string;
  updatedAt: string;
}

export interface ConvoyPlanCreateRequest {
  daysheetId: string;
  organizationId: string;
  vehicleIds: string[];
}

export interface PickupCreateRequest {
  passengerId: string;
  vehicleId: string;
  address: string;
  scheduledTime: string;
  coordinates?: GeoCoordinates;
}
