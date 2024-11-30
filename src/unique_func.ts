export function getUniqueItemsById(data: any[][], idIndex: number): any[][] {
  const uniqueMap = new Map<number, any[]>();

  data.forEach((item) => {
    const id = item[idIndex];
    if (!uniqueMap.has(id)) {
      uniqueMap.set(id, item);
    }
  });

  return Array.from(uniqueMap.values());
}
