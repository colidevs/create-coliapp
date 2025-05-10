import type {FetchProps} from "./types";

import {sheets as google} from "./auth";
import { getStorageId } from "./utils";

export async function fetchDataFromSheet<T>({
  sheetUrl,
  range,
  map,
  defaultObject,
}: FetchProps<T>): Promise<T> {
  const spreadsheetId = getStorageId(sheetUrl);
  const {data} = await google.spreadsheets.values.get({
    spreadsheetId,
    range,
  });

  const values = data.values;

  if (!values || values.length < 2) {
    throw new Error(
      `Datos insuficientes en el rango "${range}". Se necesitan al menos encabezados y una fila de datos.`,
    );
  }

  const headers = values[0];
  const dataRow = values[1];

  // Copia el objeto por defecto para no mutarlo
  const result = {...defaultObject};

  headers.forEach((header, i) => {
    if (Object.prototype.hasOwnProperty.call(map, header)) {
      const {field, transform} = map[header];
      const rawValue = dataRow[i] ?? "";

      result[field] = transform ? transform(rawValue) : (rawValue as T[keyof T]);
    } else {
      console.warn(`modules/sheet fetchDataFromSheet | Columna "${header}" no está mapeada.`);
    }
  });

  return result;
}

export async function fetchListFromSheet<T>({
  sheetUrl,
  range,
  map,
  defaultObject,
}: FetchProps<T>): Promise<T[]> {
  const spreadsheetId = getStorageId(sheetUrl);
  const {data} = await google.spreadsheets.values.get({
    spreadsheetId,
    range,
  });

  const values = data.values;

  if (!values || values.length < 2) {
    throw new Error(
      `Datos insuficientes en el rango "${range}". Se esperan al menos encabezados y una fila de datos.`,
    );
  }

  const headers = values[0]; // primera fila: encabezados
  const dataRows = values.slice(1); // resto: filas de datos

  const results: T[] = [];

  for (const row of dataRows) {
    // Creamos un objeto partiendo del objeto por defecto
    const obj: T = {...defaultObject};

    headers.forEach((header, i) => {
      const rawValue = row[i] ?? "";

      if (Object.prototype.hasOwnProperty.call(map, header)) {
        const {field, transform} = map[header];

        obj[field] = transform ? transform(rawValue) : (rawValue as T[keyof T]);
      } else {
        console.warn(`modules/sheet fetchListFromSheet | Columna "${header}" no está mapeada.`);
      }
    });

    results.push(obj);
  }

  return results;
}
