import accessoriesData from './model/data/accessories.json';
import printersData from './model/data/printers.json';
import type { Accessory, Printer } from './model/types';

export const printers: Printer[] = printersData;
export const accessories: Accessory[] = accessoriesData;

export type { Accessory, Printer } from './model/types';
