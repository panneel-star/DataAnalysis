export type DataType = "Text" | "Number" | "Date" | "Category";

export interface ColumnSchema {
  name: string;
  type: DataType;
  uniqueValues: string[];
  min?: number;
  max?: number;
  hasNulls: boolean;
}

export interface Dataset {
  fileName: string;
  rowCount: number;
  columns: ColumnSchema[];
  rows: Record<string, any>[]; // Holds the processed dynamic objects
}

export interface FilterState {
  searchQuery: string;
  categoricalFilters: Record<string, string[]>; // column name -> selected values
  numericFilters: Record<string, { min: number; max: number; currentMin?: number; currentMax?: number }>; // column name -> range
  dateFilters: Record<string, { start: string; end: string }>; // column name -> date range
}
