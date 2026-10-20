export type CatalogSku = {
  version: "catalog-sku/1";
  productId: string;
  kind: "kit" | "variant" | "refill" | "bundle";
  group: string;
  label: string;
  material: string;
  sellable: boolean;
  parts: { productId: string; quantity: number }[];
  revision: number;
};
export type CatalogItemSnapshot = {
  productId: string;
  quantity: number;
  name: string;
  priceMinor: number;
  currency: string;
  profileId: string;
  credits: number;
  sku: CatalogSku | null;
};
export interface CatalogInventory {
  revision(): number;
  sku(id: string): CatalogSku | null;
  available(id: string): number;
  requiredRevision(
    items: { productId: string; quantity: number }[],
  ): number | undefined;
  assertAvailable(items: { productId: string; quantity: number }[]): void;
  assertOrder(
    items: { productId: string; quantity: number }[],
    revision: number | undefined,
  ): void;
  reserve(
    scope: string,
    items: { productId: string; quantity: number }[],
  ): void;
  restore(scope: string): void;
  snapshot(scope: string): CatalogItemSnapshot[] | undefined;
}
