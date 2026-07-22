export type ShowStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled';

export interface VenueContact {
  name: string;
  role: string;
  phone: string;
  email?: string;
}

export interface Venue {
  id: string;
  name: string;
  address: string;
  city: string;
  country: string;
  capacity: number;
  contacts: VenueContact[];
  notes?: string;
}

export interface TimelineEvent {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  location: string;
  responsibleIds: string[];
  notes?: string;
}

export interface Daysheet {
  id: string;
  showDate: string;
  status: ShowStatus;
  venue: Venue;
  timeline: TimelineEvent[];
  organizationId: string;
  createdAt: string;
  updatedAt: string;
}

export interface DaysheetCreateRequest {
  showDate: string;
  venueId: string;
  organizationId: string;
}
