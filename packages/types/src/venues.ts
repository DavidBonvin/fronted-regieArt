export interface Venue {
  id: string;
  name: string;
  address?: string;
  city: string;
  country?: string;
  capacity?: number;
  latitude?: number;
  longitude?: number;
  parkingNotes?: string;
  loadInNotes?: string;
  technicalContactName?: string;
  technicalContactPhone?: string;
  technicalContactEmail?: string;
  timezone?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateVenueDto {
  name: string;
  address?: string;
  city: string;
  country?: string;
  capacity?: number;
  latitude?: number;
  longitude?: number;
  parkingNotes?: string;
  loadInNotes?: string;
  technicalContactName?: string;
  technicalContactPhone?: string;
  technicalContactEmail?: string;
  timezone?: string;
}
