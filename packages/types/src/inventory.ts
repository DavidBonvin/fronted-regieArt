export type ItemCondition = 'excellent' | 'good' | 'fair' | 'poor';
export type ItemCategory = 'backline' | 'pa' | 'lighting' | 'cables' | 'accessories' | 'other';

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
