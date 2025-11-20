export interface ExcelRow {
  [key: string]: any;
}

export type CellStatus = 'same' | 'added' | 'removed' | 'modified';

export interface CellDiff {
  value: any;
  oldValue?: any;
  status: CellStatus;
}

export interface RowDiff {
  id: number; // Unique ID for React key
  oldRowNumber?: number; // Original Excel Row Number
  newRowNumber?: number; // New Excel Row Number
  cells: { [key: string]: CellDiff };
  status: 'same' | 'modified' | 'added' | 'removed';
}

export interface ComparisonResult {
  headers: string[];
  rows: RowDiff[];
  summary: {
    totalRows: number;
    addedRows: number;
    removedRows: number;
    modifiedRows: number;
    modifiedCells: number;
  };
}

export interface AnalysisState {
  loading: boolean;
  content: string | null;
  error: string | null;
}