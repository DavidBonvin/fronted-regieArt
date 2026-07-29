import type { Event, EventRosterEntry } from './events';
import type { Venue } from './venues';
import type { EventScheduleItem, EventVehicle } from './convoy';

export interface EventFinanceSummary {
  cacheTotal?: string;
  perDiemAmount?: string;
  currency?: string;
  isPaid: boolean;
  paidAt?: string;
  paymentNotes?: string;
  invoiceAssetId?: string;
}

export interface UpsertEventFinanceDto {
  cacheTotal?: string;
  perDiemAmount?: string;
  currency?: string;
  isPaid?: boolean;
  paymentNotes?: string;
  invoiceAssetId?: string;
}

export interface WeatherForecast {
  available: boolean;
  temperature?: number;
  feelsLike?: number;
  description?: string;
  humidity?: number;
  windSpeed?: number;
  icon?: string;
  source?: string;
}

export interface DaySheetMeta {
  totalScheduleItems: number;
  completedItems: number;
  confirmedAttendees: number;
  totalVehicles: number;
  isAdminView: boolean;
}

export interface DaySheetMasterResponse {
  event: Event;
  venue?: Venue;
  schedule: EventScheduleItem[];
  roster: EventRosterEntry[];
  vehicles: EventVehicle[];
  finance?: EventFinanceSummary;
  weather?: WeatherForecast | null;
  meta: DaySheetMeta;
}
