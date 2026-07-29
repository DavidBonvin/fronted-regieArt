import type { Venue, CreateVenueDto } from '@regieart/types';
import { getHttpClient } from '../client/httpClient';
import type { ApiRes } from '../client/types';

export async function createVenue(dto: CreateVenueDto): Promise<Venue> {
  const res = await getHttpClient().post('venues', { json: dto }).json<ApiRes<Venue>>();
  return res.data;
}

export async function listVenues(city?: string): Promise<Venue[]> {
  const searchParams = city ? { city } : {};
  const res = await getHttpClient().get('venues', { searchParams }).json<ApiRes<Venue[]>>();
  return res.data;
}

export async function getVenue(venueId: string): Promise<Venue> {
  const res = await getHttpClient().get(`venues/${venueId}`).json<ApiRes<Venue>>();
  return res.data;
}

export async function updateVenue(venueId: string, dto: Partial<CreateVenueDto>): Promise<Venue> {
  const res = await getHttpClient()
    .patch(`venues/${venueId}`, { json: dto })
    .json<ApiRes<Venue>>();
  return res.data;
}
