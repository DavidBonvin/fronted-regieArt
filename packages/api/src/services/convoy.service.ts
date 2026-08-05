import ky from 'ky';
import type {
  ConvoySummaryItem,
  RouteResult,
  AutocompleteResult,
  GeocodeResult,
  SupportedCountry,
} from '@regieart/types';
import { getHttpClient } from '../client/httpClient';
import { getConfig } from '../config';
import type { ApiRes } from '../client/types';

export async function getConvoySummary(eventId: string): Promise<ConvoySummaryItem[]> {
  const res = await getHttpClient()
    .get(`events/${eventId}/convoy/summary`)
    .json<ApiRes<ConvoySummaryItem[]>>();
  return res.data;
}

export async function calculateRoute(eventId: string, vehicleId: string): Promise<RouteResult> {
  const res = await getHttpClient()
    .post(`events/${eventId}/vehicles/${vehicleId}/route`)
    .json<ApiRes<RouteResult>>();
  return res.data;
}

// Geo endpoints are public — bypass the auth client, but still use ApiRes wrapper
export async function getAddressAutocomplete(
  q: string,
  country: SupportedCountry,
): Promise<AutocompleteResult[]> {
  const { apiBaseUrl } = getConfig();
  const res = await ky
    .get(`${apiBaseUrl}geo/autocomplete`, { searchParams: { q, country } })
    .json<ApiRes<AutocompleteResult[]>>();
  return res.data;
}

export async function geocodeAddress(
  address: string,
  country: SupportedCountry,
): Promise<GeocodeResult> {
  const { apiBaseUrl } = getConfig();
  const res = await ky
    .post(`${apiBaseUrl}geo/geocode`, { json: { address, country } })
    .json<ApiRes<GeocodeResult>>();
  return res.data;
}
