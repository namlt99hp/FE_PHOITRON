export const ORE_TYPE_CODES = {
  thieuKet: 'thieuket',
  veVien: 'vevien',
  mecoke2580: 'mecoke2580',
  mecoke1025: 'mecoke1025',
  thanphun: 'thanphun',
  
} as const;

export type OreTypeCode = typeof ORE_TYPE_CODES[keyof typeof ORE_TYPE_CODES];

export const ORE_TYPE_CODE_LIST: OreTypeCode[] = [
  ORE_TYPE_CODES.thieuKet,
  ORE_TYPE_CODES.veVien,
  ORE_TYPE_CODES.mecoke2580,
  ORE_TYPE_CODES.mecoke1025,
  ORE_TYPE_CODES.thanphun,
];


