export function uuidToIntArray(uuid: string): number[] {
  return uuid
    .replace(/-/g, '')
    .match(/.{8}/g)!
    .map((str) => Number.parseInt(str, 16))
    .map((num) => (num & 0x80000000 ? num - 0xffffffff - 1 : num));
}

export function uuidToSNBT(uuid: string): string {
  return `[I;${uuidToIntArray(uuid).join(',')}]`;
}
