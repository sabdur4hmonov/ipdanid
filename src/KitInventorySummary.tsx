import type { Locale } from './core/types';
import { kitText } from './kit-i18n';
export interface KitInventoryRow {
  id: string;
  profile: string;
  total: number;
  issued: number;
  status: 'staging' | 'ready' | 'failed' | 'revoked';
}
const statusKeys = {
  staging: 'inventoryStaging', ready: 'inventoryReady',
  failed: 'inventoryFailed', revoked: 'inventoryRevoked',
} as const;
export function KitInventorySummary({locale, rows}: {locale: Locale; rows: KitInventoryRow[]}) {
  const t = (key: Parameters<typeof kitText>[1]) => kitText(locale,key);
  return <section data-testid="kit-inventories">
    <h3>{t('inventory')}</h3>
    <p>{t('inventoryHelp')}</p>
    {!rows.length ? <p>{t('inventoryEmpty')}</p> : <div style={{overflowX:'auto'}}>
      <table><thead><tr>
        <th>{t('batch')}</th><th>{t('profile')}</th><th>{t('inventoryIssued')}</th><th>{t('inventoryStatus')}</th>
      </tr></thead><tbody>{rows.slice(0,50).map(row=><tr key={row.id} data-testid="kit-inventory-row" data-total={row.total} data-issued={row.issued}>
        <td><details><summary>{row.id.slice(-8)}</summary><code>{row.id}</code></details></td><td>{row.profile}</td><td style={{whiteSpace:'nowrap'}}>{row.issued.toLocaleString()} / {row.total.toLocaleString()}</td><td>{t(statusKeys[row.status])}</td>
      </tr>)}</tbody></table>
    </div>}
  </section>;
}
