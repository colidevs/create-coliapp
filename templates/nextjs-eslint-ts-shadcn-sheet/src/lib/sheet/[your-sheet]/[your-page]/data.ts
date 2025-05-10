import type {notDTO, DTO} from "./types";

import {ranges} from "../ranges";
import {FetchProps} from "../../types";

import {defaultObject} from "./consts";
import {map} from "./map";
import { fetchListFromSheet } from "../../data";

export async function fetchList(sheetUrl: string): Promise<DTO[]> {
  const config: FetchProps<DTO> = {
    sheetUrl,
    range: ranges.yourPage,
    map,
    defaultObject,
  };

  const dogs = await fetchListFromSheet(config);

  return dogs;
}

export async function getList(sheetUrl: string): Promise<notDTO[]> {
  const list = await fetchList(sheetUrl);

  const filtered = list.filter((x) => x.isActive);

  return filtered;
}
