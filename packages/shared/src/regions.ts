export const REGIONS = [
  "Toshkent",
  "Qarshi",
  "Samarqand",
  "Buxoro",
  "Andijon",
  "Namangan",
  "Farg‘ona",
  "Nukus",
  "Urganch",
  "Termiz",
  "Jizzax",
  "Navoiy",
  "Guliston",
  "Nurafshon",
] as const;

const ALIASES: Record<string, (typeof REGIONS)[number]> = {
  tashkent: "Toshkent",
  toshkent: "Toshkent",
  ташкент: "Toshkent",
  qarshi: "Qarshi",
  karshi: "Qarshi",
  карши: "Qarshi",
  samarkand: "Samarqand",
  samarqand: "Samarqand",
  самарканд: "Samarqand",
  bukhara: "Buxoro",
  buxoro: "Buxoro",
  бухара: "Buxoro",
  andijan: "Andijon",
  andijon: "Andijon",
  андижан: "Andijon",
  namangan: "Namangan",
  наманган: "Namangan",
  fergana: "Farg‘ona",
  fargona: "Farg‘ona",
  "farg‘ona": "Farg‘ona",
  фергана: "Farg‘ona",
  nukus: "Nukus",
  нукус: "Nukus",
  urgench: "Urganch",
  urganch: "Urganch",
  ургенч: "Urganch",
  termez: "Termiz",
  termiz: "Termiz",
  термиз: "Termiz",
  jizzakh: "Jizzax",
  jizzax: "Jizzax",
  джизак: "Jizzax",
  navoi: "Navoiy",
  navoiy: "Navoiy",
  навои: "Navoiy",
  gulistan: "Guliston",
  guliston: "Guliston",
  нурафшон: "Nurafshon",
  nurafshon: "Nurafshon",
};

export function detectRegion(text: string): (typeof REGIONS)[number] | undefined {
  const lower = text.toLowerCase();
  for (const [alias, region] of Object.entries(ALIASES)) {
    if (lower.includes(alias)) return region;
  }
  return undefined;
}
