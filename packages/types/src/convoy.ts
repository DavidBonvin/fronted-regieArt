export interface GeoCoordinates {
  latitude: number;
  longitude: number;
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
