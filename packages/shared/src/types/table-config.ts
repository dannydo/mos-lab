export interface ColumnConfig {
  key: string;
  title: string;
  originalTitle: string;
  width?: number;
  visible: boolean;
  icon?: string;
}

export interface TableConfig {
  tableId: string;
  columns: ColumnConfig[];
}
