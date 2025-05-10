export interface FieldMap<T> {
  field: keyof T;
  transform?: (value: string) => T[keyof T];
}

export type ModelMap<T> = Record<string, FieldMap<T>>;

export type FetchProps<T> = {
  sheetUrl: string;
  range: string;
  map: ModelMap<T>;
  defaultObject: T;
};
