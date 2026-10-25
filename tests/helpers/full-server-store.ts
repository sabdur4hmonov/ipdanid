import { KitStore } from "../../server/kit-store";
import { RecoveryStore } from "../../server/recovery-store";
import { PhotoBackupStore } from "../../server/photo-backup-store";
import { BusinessStore } from "../../server/business-store";
import { GalleryStore } from "../../server/gallery-store";
import { OfferStore } from "../../server/offer-store";
import { CatalogStore } from "../../server/catalog-store";
import { RegionsStore } from "../../server/regions-store";
import { JourneyStore } from "../../server/journey-store";
import { CommissionStore } from "../../server/commission-store";
import { TransactionalOutbox } from "../../server/transactional-outbox";
import { MockEmailAdapter } from "../../server/email-adapter";
import { AnalyticsStore } from "../../server/analytics-store";
import { PartnerStore } from "../../server/partner-store";
import { PushStore } from "../../server/push-store";
import { MockPushAdapter } from "../../server/fcm-adapter";
import { ProductionAdminAuth } from "../../server/production-auth";
import { AdminAccess } from "../../server/admin-access";
import { FinanceStore } from "../../server/finance-store";
import { TrialStore } from "../../server/trial-store";

// Match every production feature migration without starting HTTP or reading env/owner data.
export function fullServerStore(path = ":memory:", pepper = "p".repeat(32)) {
  const store = new KitStore(path, pepper, "k".repeat(32));
  store.seed();
  new RecoveryStore(store);
  const photos = new PhotoBackupStore(store);
  const business = new BusinessStore(store);
  new GalleryStore(store);
  new OfferStore(store);
  new CatalogStore(store);
  new RegionsStore(store);
  new JourneyStore(store);
  new CommissionStore(store);
  new TransactionalOutbox(store, pepper, new MockEmailAdapter());
  new AnalyticsStore(store);
  new PartnerStore(store);
  new PushStore(store, pepper, new MockPushAdapter(), (id) =>
    business.announcements(true).find((a) => a.id === id),
  );
  const owner = new ProductionAdminAuth(
    store,
    "unused synthetic password hash",
  );
  new AdminAccess(store, "t".repeat(32), owner);
  new FinanceStore(store);
  new TrialStore(store);
  return { store, photos };
}
