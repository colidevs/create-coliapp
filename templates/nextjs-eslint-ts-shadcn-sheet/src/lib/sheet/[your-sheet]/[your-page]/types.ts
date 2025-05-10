export type DTO = {
  name: string;
  omitted: boolean;
  isActive: boolean;
};

export type notDTO = Omit<DTO, "ommited">;
