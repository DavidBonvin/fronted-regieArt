export type EventType = 'CONCERT' | 'REHEARSAL' | 'AUDITION' | 'TOUR_DATE' | 'RECORDING_SESSION';
export type EventStatus = 'DRAFT' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED';
export type AttendanceStatus = 'INVITED' | 'CONFIRMED' | 'DECLINED' | 'NO_SHOW';

export interface Event {
  id: string;
  orgId: string;
  title: string;
  type: EventType;
  status: EventStatus;
  startTime: string;
  endTime?: string;
  venueId?: string;
  description?: string;
  isPublic?: boolean;
  setlistNotes?: string;
  daysheetNotes?: string;
  itineraryNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface EventRosterEntryUser {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  phone?: string;
}

export interface EventRosterEntry {
  userId: string;
  role: string;
  status: AttendanceStatus;
  notes?: string;
  user: EventRosterEntryUser;
}

export interface AddRosterMemberDto {
  userId: string;
  role: string;
  notes?: string;
}

export interface UpdateRosterMemberDto {
  status?: AttendanceStatus;
  role?: string;
  notes?: string;
}

export interface CreateEventDto {
  orgId: string;
  title: string;
  type: EventType;
  startTime: string;
  endTime?: string;
  venueId?: string;
  description?: string;
  isPublic?: boolean;
  setlistNotes?: string;
  daysheetNotes?: string;
  itineraryNotes?: string;
}

export interface UpdateEventDto {
  title?: string;
  type?: EventType;
  status?: EventStatus;
  startTime?: string;
  endTime?: string;
  venueId?: string;
  description?: string;
  isPublic?: boolean;
  setlistNotes?: string;
  daysheetNotes?: string;
  itineraryNotes?: string;
}

export interface UpdateDaySheetDto {
  daysheetNotes?: string;
  itineraryNotes?: string;
}

export interface EventListParams {
  orgId?: string;
  type?: EventType;
  status?: EventStatus;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}
