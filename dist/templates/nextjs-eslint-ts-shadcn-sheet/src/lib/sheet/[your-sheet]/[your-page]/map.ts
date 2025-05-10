import type {DTO} from "./types";
import type {ModelMap} from "../../types";

import { toBoolean } from "../../utils";

export const map: ModelMap<DTO> = {
  Nombre: {
    field: "name",
  },
  Omitido: {
    field: "omitted",
    transform: (value) => toBoolean(value)
  },
  Activo: {
    field: "isActive",
    transform: (value) => toBoolean(value)
  }
};
