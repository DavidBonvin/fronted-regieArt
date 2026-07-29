export type ItemCondition = 'NEW' | 'GOOD' | 'FAIR' | 'POOR' | 'DAMAGED';
export type ItemCategory =
  | 'INSTRUMENT'
  | 'AUDIO_GEAR'
  | 'LIGHTING'
  | 'STAGING'
  | 'TRANSPORT'
  | 'OTHER';

export type InstrumentType =
  | 'BRASS'
  | 'WOODWIND'
  | 'STRING'
  | 'KEYBOARD'
  | 'PERCUSSION'
  | 'AUDIO_GEAR'
  | 'LIGHTING'
  | 'OTHER';

export type InstrumentStatus = 'AVAILABLE' | 'IN_USE' | 'MAINTENANCE' | 'RETIRED';

export interface Instrument {
  id: string;
  orgId: string;
  name: string;
  type: InstrumentType;
  brand?: string;
  model?: string;
  serialNumber?: string;
  status: InstrumentStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface InstrumentAssignment {
  id: string;
  instrumentId: string;
  instrument: Instrument;
  userId: string;
  user: {
    id: string;
    displayName: string;
  };
  eventId?: string;
  event?: {
    id: string;
    title: string;
  };
  notes?: string;
  assignedAt: string;
  returnedAt?: string;
}

export interface CreateInstrumentDto {
  orgId: string;
  name: string;
  type: InstrumentType;
  brand?: string;
  model?: string;
  serialNumber?: string;
  notes?: string;
}

export interface UpdateInstrumentDto {
  name?: string;
  type?: InstrumentType;
  brand?: string;
  model?: string;
  serialNumber?: string;
  notes?: string;
}

export interface AssignInstrumentDto {
  userId: string;
  eventId?: string;
  notes?: string;
}

export interface InventoryItem {
  id: string;
  name: string;
  qrCode: string;
  serialNumber?: string;
  condition: ItemCondition;
  category: ItemCategory;
  assignedToUserId?: string;
  organizationId: string;
  notes?: string;
  createdAt: string;
}

export interface InventoryItemCreateRequest {
  name: string;
  condition: ItemCondition;
  category: ItemCategory;
  serialNumber?: string;
  organizationId: string;
  notes?: string;
}

export interface ChecklistItem {
  id: string;
  inventoryItemId: string;
  inventoryItem: InventoryItem;
  checked: boolean;
  checkedByUserId?: string;
  checkedAt?: string;
}

export interface Checklist {
  id: string;
  name: string;
  daysheetId: string;
  organizationId: string;
  items: ChecklistItem[];
  completedAt?: string;
  completedByUserId?: string;
}

export interface QRScanResult {
  itemId: string;
  qrCode: string;
}
