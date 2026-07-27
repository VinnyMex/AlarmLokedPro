// PRD section 6.5 — MVP household item catalog for the camera challenge.
export interface CatalogItem {
  itemType: string;
  label: Record<string, string>; // locale -> display label
  mlKitLabels: string[]; // labels ML Kit / Cloud Vision may return for this item
}

export const ITEM_CATALOG: CatalogItem[] = [
  { itemType: 'pen', label: { 'en-US': 'Pen', 'pt-BR': 'Caneta' }, mlKitLabels: ['Pen', 'Writing implement'] },
  { itemType: 'cup', label: { 'en-US': 'Cup', 'pt-BR': 'Copo' }, mlKitLabels: ['Cup', 'Mug', 'Glass'] },
  { itemType: 'key', label: { 'en-US': 'Key', 'pt-BR': 'Chave' }, mlKitLabels: ['Key'] },
  { itemType: 'remote_control', label: { 'en-US': 'Remote control', 'pt-BR': 'Controle remoto' }, mlKitLabels: ['Remote control'] },
  { itemType: 'toothbrush', label: { 'en-US': 'Toothbrush', 'pt-BR': 'Escova de dente' }, mlKitLabels: ['Toothbrush'] },
  { itemType: 'book', label: { 'en-US': 'Book', 'pt-BR': 'Livro' }, mlKitLabels: ['Book'] },
  { itemType: 'sock', label: { 'en-US': 'Sock', 'pt-BR': 'Meia' }, mlKitLabels: ['Sock'] },
  { itemType: 'spoon', label: { 'en-US': 'Spoon', 'pt-BR': 'Colher' }, mlKitLabels: ['Spoon', 'Cutlery'] },
  { itemType: 'bottle', label: { 'en-US': 'Bottle', 'pt-BR': 'Garrafa' }, mlKitLabels: ['Bottle'] },
  { itemType: 'charger', label: { 'en-US': 'Charger', 'pt-BR': 'Carregador' }, mlKitLabels: ['Charger', 'Cable'] },
];

export function pickRandomItem(exclude?: string): CatalogItem {
  const candidates = exclude ? ITEM_CATALOG.filter((item) => item.itemType !== exclude) : ITEM_CATALOG;
  return candidates[Math.floor(Math.random() * candidates.length)];
}

export function getItem(itemType: string): CatalogItem | undefined {
  return ITEM_CATALOG.find((item) => item.itemType === itemType);
}
