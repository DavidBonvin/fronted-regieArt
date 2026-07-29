import type {
  Event,
  CreateEventDto,
  UpdateEventDto,
  UpdateDaySheetDto,
  EventListParams,
  EventRosterEntry,
  AddRosterMemberDto,
  UpdateRosterMemberDto,
  EventScheduleItem,
  CreateScheduleItemDto,
  UpdateScheduleItemDto,
  EventVehicle,
  CreateVehicleDto,
  VehiclePickupPoint,
  CreatePickupDto,
  DaySheetMasterResponse,
  WeatherForecast,
  EventFinanceSummary,
  UpsertEventFinanceDto,
} from '@regieart/types';
import { getHttpClient } from '../client/httpClient';
import type { ApiRes } from '../client/types';

export async function createEvent(dto: CreateEventDto): Promise<Event> {
  const res = await getHttpClient().post('events', { json: dto }).json<ApiRes<Event>>();
  return res.data;
}

export async function listEvents(params: EventListParams): Promise<{
  events: Event[];
  total: number;
  page: number;
  limit: number;
}> {
  const res = await getHttpClient()
    .get('events', { searchParams: params as Record<string, string | number> })
    .json<ApiRes<{ events: Event[]; total: number; page: number; limit: number }>>();
  return res.data;
}

export async function getEvent(eventId: string): Promise<Event> {
  const res = await getHttpClient().get(`events/${eventId}`).json<ApiRes<Event>>();
  return res.data;
}

export async function updateEvent(eventId: string, dto: UpdateEventDto): Promise<Event> {
  const res = await getHttpClient().patch(`events/${eventId}`, { json: dto }).json<ApiRes<Event>>();
  return res.data;
}

export async function updateDaySheet(eventId: string, dto: UpdateDaySheetDto): Promise<Event> {
  const res = await getHttpClient()
    .patch(`events/${eventId}/daysheet`, { json: dto })
    .json<ApiRes<Event>>();
  return res.data;
}

export async function deleteEvent(eventId: string): Promise<void> {
  await getHttpClient().delete(`events/${eventId}`);
}

export async function getDaySheetMaster(eventId: string): Promise<DaySheetMasterResponse> {
  const res = await getHttpClient()
    .get(`events/${eventId}/daysheet`)
    .json<ApiRes<DaySheetMasterResponse>>();
  return res.data;
}

export async function getEventWeather(eventId: string): Promise<WeatherForecast> {
  const res = await getHttpClient()
    .get(`events/${eventId}/weather`)
    .json<ApiRes<WeatherForecast>>();
  return res.data;
}

export async function getRoster(eventId: string): Promise<EventRosterEntry[]> {
  const res = await getHttpClient()
    .get(`events/${eventId}/roster`)
    .json<ApiRes<EventRosterEntry[]>>();
  return res.data;
}

export async function addRosterMember(
  eventId: string,
  dto: AddRosterMemberDto,
): Promise<EventRosterEntry> {
  const res = await getHttpClient()
    .post(`events/${eventId}/roster`, { json: dto })
    .json<ApiRes<EventRosterEntry>>();
  return res.data;
}

export async function updateRosterMember(
  eventId: string,
  userId: string,
  dto: UpdateRosterMemberDto,
): Promise<EventRosterEntry> {
  const res = await getHttpClient()
    .patch(`events/${eventId}/roster/${userId}`, { json: dto })
    .json<ApiRes<EventRosterEntry>>();
  return res.data;
}

export async function removeRosterMember(eventId: string, userId: string): Promise<void> {
  await getHttpClient().delete(`events/${eventId}/roster/${userId}`);
}

export async function getSchedule(eventId: string): Promise<EventScheduleItem[]> {
  const res = await getHttpClient()
    .get(`events/${eventId}/schedule`)
    .json<ApiRes<EventScheduleItem[]>>();
  return res.data;
}

export async function createScheduleItem(
  eventId: string,
  dto: CreateScheduleItemDto,
): Promise<EventScheduleItem> {
  const res = await getHttpClient()
    .post(`events/${eventId}/schedule`, { json: dto })
    .json<ApiRes<EventScheduleItem>>();
  return res.data;
}

export async function updateScheduleItem(
  eventId: string,
  itemId: string,
  dto: UpdateScheduleItemDto,
): Promise<EventScheduleItem> {
  const res = await getHttpClient()
    .patch(`events/${eventId}/schedule/${itemId}`, { json: dto })
    .json<ApiRes<EventScheduleItem>>();
  return res.data;
}

export async function toggleScheduleItemComplete(
  eventId: string,
  itemId: string,
): Promise<EventScheduleItem> {
  const res = await getHttpClient()
    .patch(`events/${eventId}/schedule/${itemId}/complete`)
    .json<ApiRes<EventScheduleItem>>();
  return res.data;
}

export async function deleteScheduleItem(eventId: string, itemId: string): Promise<void> {
  await getHttpClient().delete(`events/${eventId}/schedule/${itemId}`);
}

export async function getVehicles(eventId: string): Promise<EventVehicle[]> {
  const res = await getHttpClient()
    .get(`events/${eventId}/vehicles`)
    .json<ApiRes<EventVehicle[]>>();
  return res.data;
}

export async function createVehicle(eventId: string, dto: CreateVehicleDto): Promise<EventVehicle> {
  const res = await getHttpClient()
    .post(`events/${eventId}/vehicles`, { json: dto })
    .json<ApiRes<EventVehicle>>();
  return res.data;
}

export async function updateVehicle(
  eventId: string,
  vehicleId: string,
  dto: Partial<CreateVehicleDto>,
): Promise<EventVehicle> {
  const res = await getHttpClient()
    .patch(`events/${eventId}/vehicles/${vehicleId}`, { json: dto })
    .json<ApiRes<EventVehicle>>();
  return res.data;
}

export async function deleteVehicle(eventId: string, vehicleId: string): Promise<void> {
  await getHttpClient().delete(`events/${eventId}/vehicles/${vehicleId}`);
}

export async function addVehiclePassenger(
  eventId: string,
  vehicleId: string,
  userId: string,
): Promise<void> {
  await getHttpClient().post(`events/${eventId}/vehicles/${vehicleId}/passengers`, {
    json: { userId },
  });
}

export async function removeVehiclePassenger(
  eventId: string,
  vehicleId: string,
  userId: string,
): Promise<void> {
  await getHttpClient().delete(
    `events/${eventId}/vehicles/${vehicleId}/passengers/${userId}`,
  );
}

export async function addPickupPoint(
  eventId: string,
  vehicleId: string,
  dto: CreatePickupDto,
): Promise<VehiclePickupPoint> {
  const res = await getHttpClient()
    .post(`events/${eventId}/vehicles/${vehicleId}/pickups`, { json: dto })
    .json<ApiRes<VehiclePickupPoint>>();
  return res.data;
}

export async function updatePickupPoint(
  eventId: string,
  vehicleId: string,
  pickupId: string,
  dto: Partial<CreatePickupDto>,
): Promise<VehiclePickupPoint> {
  const res = await getHttpClient()
    .patch(`events/${eventId}/vehicles/${vehicleId}/pickups/${pickupId}`, { json: dto })
    .json<ApiRes<VehiclePickupPoint>>();
  return res.data;
}

export async function deletePickupPoint(
  eventId: string,
  vehicleId: string,
  pickupId: string,
): Promise<void> {
  await getHttpClient().delete(
    `events/${eventId}/vehicles/${vehicleId}/pickups/${pickupId}`,
  );
}

export async function getEventFinance(eventId: string): Promise<EventFinanceSummary> {
  const res = await getHttpClient()
    .get(`events/${eventId}/finance`)
    .json<ApiRes<EventFinanceSummary>>();
  return res.data;
}

export async function upsertEventFinance(
  eventId: string,
  dto: UpsertEventFinanceDto,
): Promise<EventFinanceSummary> {
  const res = await getHttpClient()
    .put(`events/${eventId}/finance`, { json: dto })
    .json<ApiRes<EventFinanceSummary>>();
  return res.data;
}
