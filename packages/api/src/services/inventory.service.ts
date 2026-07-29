import type {
  Instrument,
  CreateInstrumentDto,
  UpdateInstrumentDto,
  InstrumentAssignment,
  AssignInstrumentDto,
} from '@regieart/types';
import { getHttpClient } from '../client/httpClient';
import type { ApiRes } from '../client/types';

export async function createInstrument(dto: CreateInstrumentDto): Promise<Instrument> {
  const res = await getHttpClient().post('instruments', { json: dto }).json<ApiRes<Instrument>>();
  return res.data;
}

export async function listInstruments(params: {
  orgId: string;
  type?: string;
  status?: string;
}): Promise<Instrument[]> {
  const res = await getHttpClient()
    .get('instruments', { searchParams: params as Record<string, string> })
    .json<ApiRes<Instrument[]>>();
  return res.data;
}

export async function getEventAssignments(params: {
  orgId: string;
  eventId: string;
}): Promise<InstrumentAssignment[]> {
  const res = await getHttpClient()
    .get('instruments/assignments', { searchParams: params })
    .json<ApiRes<InstrumentAssignment[]>>();
  return res.data;
}

export async function getInstrument(instrumentId: string): Promise<Instrument> {
  const res = await getHttpClient()
    .get(`instruments/${instrumentId}`)
    .json<ApiRes<Instrument>>();
  return res.data;
}

export async function updateInstrument(
  instrumentId: string,
  dto: UpdateInstrumentDto,
): Promise<Instrument> {
  const res = await getHttpClient()
    .patch(`instruments/${instrumentId}`, { json: dto })
    .json<ApiRes<Instrument>>();
  return res.data;
}

export async function retireInstrument(instrumentId: string): Promise<Instrument> {
  const res = await getHttpClient()
    .patch(`instruments/${instrumentId}/retire`)
    .json<ApiRes<Instrument>>();
  return res.data;
}

export async function assignInstrument(
  instrumentId: string,
  dto: AssignInstrumentDto,
): Promise<InstrumentAssignment> {
  const res = await getHttpClient()
    .post(`instruments/${instrumentId}/assign`, { json: dto })
    .json<ApiRes<InstrumentAssignment>>();
  return res.data;
}

export async function returnInstrument(instrumentId: string): Promise<Instrument> {
  const res = await getHttpClient()
    .patch(`instruments/${instrumentId}/return`)
    .json<ApiRes<Instrument>>();
  return res.data;
}
