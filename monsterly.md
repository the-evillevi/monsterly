# Monsterly

> Offline-first PWA for gym and CrossFit subscription control.

## 1. Product Summary

Monsterly is a simple web app for managing gym and CrossFit subscriptions.

The app helps Ángel quickly answer:

```txt
Who is paid up?
Who is about to expire?
Who is already overdue?
```

The core user story:

> Puedes ver en segundos quién está al corriente, quién está por vencer y quién ya debe.  
> Todo se organiza con un semáforo fácil de entender:  
> 🟢 Al corriente  
> 🟡 Por vencer  
> 🔴 Vencido  
>
> Menos cobranza manual.  
> Más control de tu gimnasio.

The product should stay intentionally simple:

- No logo required for MVP.
- No fancy design.
- No complex dashboard.
- No payment processing at first.
- No invoices at first.
- Focus on fast operational control.

---

## 2. Context

Ángel expects to manage around **80 active subscribers**.

Subscribers can have:

- Gym subscription.
- CrossFit subscription.
- Both gym and CrossFit subscriptions.

Each subscription can be:

- Weekly.
- Monthly.
- Bimonthly.
- Six-monthly.
- Yearly.
- Custom.

Ángel is the main user, but he may later have a small team helping him manage the subscriptions.

---

## 3. MVP Goal

The MVP should let Ángel:

- Open the app from phone, tablet, or desktop.
- Install the app as a PWA.
- Use the app offline.
- Add subscribers.
- Manage gym and CrossFit subscriptions.
- See subscription status with a traffic-light system.
- Filter subscribers by status.
- Renew subscriptions quickly.
- Sync changes when the device is back online.
- Export data to CSV.

---

## 4. Core Status System

The app uses a simple traffic-light system:

| Status | Spanish label | Meaning |
|---|---|---|
| 🟢 | Al corriente | Subscription is active and not close to expiring. |
| 🟡 | Por vencer | Subscription expires soon. |
| 🔴 | Vencido | Subscription is already expired. |

Suggested default warning window:

```txt
3 days before expiration
```

Status should be calculated dynamically from dates, not stored as a permanent database field.

### Per-subscription status

```txt
paid_until_date > today + warningWindow
→ 🟢 Al corriente

paid_until_date >= today AND paid_until_date <= today + warningWindow
→ 🟡 Por vencer

paid_until_date < today
→ 🔴 Vencido
```

### Per-subscriber status

A subscriber may have gym, CrossFit, or both.

Suggested subscriber-level status:

```txt
If at least one active subscription is expired:
→ 🔴 Vencido

If no subscriptions are expired, but at least one is expiring soon:
→ 🟡 Por vencer

If all active subscriptions are current:
→ 🟢 Al corriente
```

This conservative rule is useful because if a subscriber owes for either gym or CrossFit, they should appear as needing attention.

---

## 5. MVP Scope

### Included in MVP

- Web app accessible from any device.
- Installable PWA.
- Offline-first behavior.
- Supabase login.
- Subscriber list.
- Add subscriber.
- Edit subscriber.
- Archive subscriber.
- Add gym subscription.
- Add CrossFit subscription.
- Support weekly, monthly, bimonthly, and custom billing periods.
- Traffic-light status:
  - 🟢 Al corriente
  - 🟡 Por vencer
  - 🔴 Vencido
- Filter by status.
- Filter by subscription type.
- View vencidos.
- View por vencer.
- Renew subscription.
- Local-first storage and sync.
- Small team support.
- CSV export.

### Excluded from MVP

- Logos.
- Fancy branding.
- Payment processing.
- Invoicing.
- Charts and analytics.
- Complex roles and permissions.
- WhatsApp automation.
- SMS automation.
- Email automation.
- Native mobile app.
- Public landing page.

---

## 6. Future Milestone

After MVP, a strong next milestone is:

```txt
Payment reminders
```

Future user story:

> Y con un clic puedes enviar recordatorios de pago.

Possible future features:

- WhatsApp reminder link.
- Copyable reminder message.
- One-click payment reminder.
- Reminder history.
- Bulk reminders for vencidos.
- Bulk reminders for por vencer.
- Configurable reminder templates.

For the first post-MVP version, start with **WhatsApp deep links**, not full WhatsApp Business API automation.

Example:

```txt
https://wa.me/521XXXXXXXXXX?text=Hola%20...
```

This avoids API cost and complexity.

---

## 7. Chosen Technical Direction

Chosen stack:

```txt
Vite React SPA
+ TypeScript
+ Supabase
+ RxDB
+ Repository layer
+ PWA
```

The app should be:

- Web-first.
- Offline-first.
- Installable.
- Usable from any device.
- Prepared for sync.
- Prepared to swap the offline/sync layer later.

---

## 8. Why Vite React SPA?

A Vite React SPA fits because this app is not content-heavy.

It is an interactive CRUD app:

- Add subscriber.
- Edit subscriptions.
- Renew subscription.
- Filter status.
- Work offline.
- Sync later.

Astro would be good for mostly static pages with small interactive islands, but Monsterly is mostly interactive. A Vite SPA is simpler here.

---

## 9. Why Supabase?

Supabase provides:

- Hosted Postgres.
- Auth.
- Row Level Security.
- Realtime capabilities.
- Optional Edge Functions later.
- Good free tier for MVP.

Supabase is the cloud source of truth.

The local-first app syncs with Supabase so Ángel and his small team can use the app across devices.

---

## 10. Why RxDB?

Several offline-first options were considered:

- PowerSync.
- DIY Dexie / IndexedDB.
- RxDB.
- WatermelonDB.

RxDB was selected because it balances:

- Offline-first behavior.
- Sync support.
- No extra hosted sync service by default.
- Better structure than fully DIY Dexie.
- React compatibility.
- Supabase sync compatibility.
- Ability to work through a repository layer.

### Offline-first options comparison

| Option | Pros | Cons | Verdict |
|---|---|---|---|
| DIY Dexie / IndexedDB | Cheapest, simple local DB, no extra service | You own sync bugs and conflict logic | Good cheapest option |
| RxDB + Supabase | Offline-first, reactive local DB, replication support, no PowerSync service | More concepts to learn than Dexie | Chosen option |
| PowerSync + Supabase | Robust sync, local SQLite, strong Supabase integration | Paid production path may be expensive for tiny app | Best reliability, but probably overkill/costly |
| WatermelonDB + Supabase | Multiplatform, strong offline-first model | More backend sync work, more natural for React Native | Good if native app becomes likely |

---

## 11. Deployment Direction

Deployment should look like this:

```txt
Cloudflare Pages or Netlify
  ↓
hosts Vite React PWA

Browser/device
  ↓
RxDB local database
  ↓
syncs with Supabase

Supabase
  ↓
Auth + Postgres + RLS
```

Recommended hosting:

- Cloudflare Pages.
- Netlify.

Avoid Vercel Hobby for business use because its free tier is generally better suited for personal/non-commercial use.

### Expected MVP cost

Likely:

```txt
$0/month
```

Using:

```txt
Cloudflare Pages Free
+ Supabase Free
+ RxDB core/free setup
```

Potential future costs:

- Supabase Pro, if production reliability/backups are needed.
- RxDB Premium plugins, only if needed later for performance/storage/encryption features.
- Custom domain.
- WhatsApp Business API, only if full automation is added later.

For around 80 subscribers, the free-tier technical limits should be more than enough for MVP. The bigger concern is reliability, backups, and whether Ángel depends on the app daily.

---

## 12. High-Level Architecture

```txt
┌─────────────────────────────┐
│ User device                  │
│ Vite React PWA               │
│                              │
│ UI screens                   │
│ Repository layer             │
│ RxDB local database          │
│ Service worker / PWA shell   │
└──────────────┬──────────────┘
               │
               │ sync when online
               ▼
┌─────────────────────────────┐
│ Supabase                     │
│ Auth                         │
│ Postgres                     │
│ Row Level Security           │
│ Optional Realtime            │
└─────────────────────────────┘
```

The app should always read/write locally first.

```txt
User action
  ↓
Repository
  ↓
RxDB local write
  ↓
UI updates instantly
  ↓
Sync to Supabase when online
```

---

## 13. Repository Layer Strategy

The UI should not directly call RxDB.

Instead:

```txt
React components
  ↓
hooks/useSubscribers.ts
  ↓
repositories/subscribers.repository.ts
  ↓
RxDB implementation
```

This allows swapping RxDB later for:

- DIY Dexie.
- PowerSync.
- WatermelonDB.
- Direct Supabase online-only.

### Domain types

```ts
export type SubscriberStatus = "current" | "expiring_soon" | "expired";

export type SubscriptionKind = "gym" | "crossfit";

export type BillingPeriod =
  | "weekly"
  | "monthly"
  | "bimonthly"
  | "sixmonthly"
  | "yearly"
  | "custom";

export type Gender =
  | "male"
  | "female"
  | "other"
  | "unspecified";

export type Subscriber = {
  id: string;
  name: string;
  gender: Gender;
  phoneNumber: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
};

export type Subscription = {
  id: string;
  subscriberId: string;
  kind: SubscriptionKind;
  billingPeriod: BillingPeriod;
  startDate: string;
  paidUntilDate: string;
  customDays?: number;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
};

export type SubscriberWithSubscriptions = Subscriber & {
  subscriptions: Subscription[];
};
```

### Repository contracts

```ts
export interface SubscribersRepository {
  listSubscribers(): Promise<SubscriberWithSubscriptions[]>;
  getSubscriber(id: string): Promise<SubscriberWithSubscriptions | null>;
  createSubscriber(input: CreateSubscriberInput): Promise<Subscriber>;
  updateSubscriber(id: string, input: UpdateSubscriberInput): Promise<Subscriber>;
  archiveSubscriber(id: string): Promise<void>;
}

export interface SubscriptionsRepository {
  createSubscription(input: CreateSubscriptionInput): Promise<Subscription>;
  updateSubscription(id: string, input: UpdateSubscriptionInput): Promise<Subscription>;
  renewSubscription(id: string, input: RenewSubscriptionInput): Promise<Subscription>;
  archiveSubscription(id: string): Promise<void>;
}
```

### Domain logic should be independent

Keep status calculation out of RxDB and out of React components.

Suggested files:

```txt
src/domain/status.ts
src/domain/renewal.ts
src/domain/dates.ts
```

Example:

```ts
export function getSubscriptionStatus(
  paidUntilDate: string,
  today = new Date(),
  warningDays = 3
): "current" | "expiring_soon" | "expired" {
  const paidUntil = startOfDay(new Date(paidUntilDate));
  const currentDay = startOfDay(today);
  const warningDate = addDays(currentDay, warningDays);

  if (paidUntil < currentDay) return "expired";
  if (paidUntil <= warningDate) return "expiring_soon";
  return "current";
}
```

---

## 14. Suggested Project Structure

```txt
monsterly/
  src/
    app/
      App.tsx
      router.tsx
      providers.tsx

    pages/
      DashboardPage.tsx
      SubscribersPage.tsx
      ExpiringSoonPage.tsx
      ExpiredPage.tsx
      NewSubscriberPage.tsx
      EditSubscriberPage.tsx
      SettingsPage.tsx

    components/
      layout/
        AppShell.tsx
        BottomNav.tsx
        PageHeader.tsx

      subscribers/
        SubscriberForm.tsx
        SubscribersTable.tsx
        SubscriberCard.tsx
        SubscriberStatusBadge.tsx
        SubscriberFilters.tsx

      subscriptions/
        SubscriptionForm.tsx
        SubscriptionBadge.tsx
        RenewSubscriptionButton.tsx
        SubscriptionStatusBadge.tsx

      pwa/
        OfflineBadge.tsx
        SyncStatus.tsx
        InstallPrompt.tsx

    domain/
      dates.ts
      status.ts
      renewal.ts
      phone.ts

    repositories/
      subscribers.repository.ts
      subscriptions.repository.ts
      rxdb/
        rxdb.ts
        schemas/
          subscriber.schema.ts
          subscription.schema.ts
          renewal.schema.ts
        subscribers.rxdb.repository.ts
        subscriptions.rxdb.repository.ts
        replication.ts

    hooks/
      useSubscribers.ts
      useSubscriber.ts
      useSubscriptions.ts
      useSyncStatus.ts

    services/
      exportCsv.ts
      whatsappReminder.ts

    styles/
      globals.css

  public/
    manifest.webmanifest
    icons/

  supabase/
    migrations/
      001_create_subscribers.sql
      002_create_subscriptions.sql
      003_create_renewals.sql
      004_rls_policies.sql

  package.json
  pnpm-lock.yaml
  vite.config.ts
  tsconfig.json
  README.md
```

---

## 15. Suggested Database Model

### subscribers

```sql
create table subscribers (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  gender text not null default 'unspecified',
  phone_number text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
```

### subscriptions

```sql
create table subscriptions (
  id uuid primary key default gen_random_uuid(),
  subscriber_id uuid not null references subscribers(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('gym', 'crossfit')),
  billing_period text not null check (
    billing_period in ('weekly', 'monthly', 'bimonthly', 'custom')
  ),
  custom_days integer,
  start_date date not null,
  paid_until_date date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
```

### renewals

Optional for MVP, but recommended.

```sql
create table renewals (
  id uuid primary key default gen_random_uuid(),
  subscription_id uuid not null references subscriptions(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  previous_paid_until_date date not null,
  new_paid_until_date date not null,
  created_at timestamptz not null default now()
);
```

A renewal table helps answer:

- When did we renew this person?
- What was their previous paid-until date?
- Who has been renewed recently?

---

## 16. Suggested Spanish Labels

| English | Spanish |
|---|---|
| Subscriber | Socio |
| Subscription | Suscripción |
| Gym | Gimnasio |
| CrossFit | CrossFit |
| Current | Al corriente |
| Expiring soon | Por vencer |
| Expired | Vencido |
| Renew | Renovar |
| Paid until | Pagado hasta |
| Start date | Fecha de inicio |
| Phone number | Teléfono |
| Gender | Género |

---

## 17. Recommended MVP UI Screens

1. Dashboard.
2. Subscribers.
3. Por vencer.
4. Vencidos.
5. New subscriber.
6. Edit subscriber.
7. Subscriber detail.
8. Settings.

For mobile, use a simple bottom navigation:

```txt
Inicio
Socios
Por vencer
Vencidos
Ajustes
```

---

## 18. MVP Milestones and Linear-Style Issues

## Milestone 1 — Product Foundation

### Issue 1 — Define MVP scope

Acceptance criteria:

- MVP scope documented.
- Exclusions documented.
- Status rules documented.
- Subscription types documented.
- Billing periods documented.

### Issue 2 — Initialize Vite React project

Acceptance criteria:

- Project uses Vite.
- Project uses React.
- Project uses TypeScript.
- Project uses pnpm.
- Project runs locally.

### Issue 3 — Add routing and app shell

Acceptance criteria:

- Dashboard route exists.
- Subscribers route exists.
- Vencidos route exists.
- Por vencer route exists.
- Settings route exists.
- Basic mobile-friendly layout exists.

---

## Milestone 2 — Supabase Foundation

### Issue 4 — Create Supabase project

Acceptance criteria:

- Supabase project exists.
- Environment variables documented.
- Local `.env.example` exists.
- Supabase client configured.

### Issue 5 — Create database migrations

Acceptance criteria:

- subscribers table exists.
- subscriptions table exists.
- renewals table exists or is intentionally deferred.
- updated_at strategy exists.
- deleted_at soft-delete field exists.

### Issue 6 — Add Row Level Security policies

Acceptance criteria:

- RLS enabled.
- Users can only access own subscribers.
- Users can only access own subscriptions.
- Users can only access own renewals.

---

## Milestone 3 — Offline-First Foundation

### Issue 7 — Add RxDB

Acceptance criteria:

- RxDB installed.
- Local database initializes.
- Subscriber collection exists.
- Subscription collection exists.
- Basic local reads/writes work.

### Issue 8 — Add repository layer

Acceptance criteria:

- Subscriber repository interface exists.
- Subscription repository interface exists.
- RxDB implementation exists.
- UI does not directly call RxDB.

### Issue 9 — Add Supabase replication

Acceptance criteria:

- Local changes can sync to Supabase.
- Supabase changes can sync to local RxDB.
- App survives offline usage.
- Sync resumes when online.
- Basic sync error state is visible.

---

## Milestone 4 — PWA Foundation

### Issue 10 — Add PWA support

Acceptance criteria:

- Web manifest exists.
- Service worker exists.
- App shell loads offline.
- App can be installed on desktop/mobile.

### Issue 11 — Add offline and sync indicators

Acceptance criteria:

- User can see when app is offline.
- User can see when app is syncing.
- User can see when sync has failed.

---

## Milestone 5 — Subscriber Management

### Issue 12 — Create subscriber

Acceptance criteria:

- User can add name.
- User can add gender.
- User can add phone number.
- Subscriber is saved locally first.
- Subscriber syncs when online.

### Issue 13 — List subscribers

Acceptance criteria:

- User can see all active subscribers.
- Subscriber status is visible.
- Subscriber phone number is visible.
- Subscriber subscription badges are visible.

### Issue 14 — Edit subscriber

Acceptance criteria:

- User can edit name.
- User can edit gender.
- User can edit phone number.
- Changes persist offline.
- Changes sync later.

### Issue 15 — Archive subscriber

Acceptance criteria:

- User can archive a subscriber.
- Archived subscribers disappear from active list.
- Soft delete is used.

---

## Milestone 6 — Subscription Management

### Issue 16 — Add subscription to subscriber

Acceptance criteria:

- User can add gym subscription.
- User can add CrossFit subscription.
- User can choose weekly/monthly/bimonthly/custom.
- User can set start date.
- User can set paid-until date.

### Issue 17 — Renew subscription

Acceptance criteria:

- User can renew weekly.
- User can renew monthly.
- User can renew bimonthly.
- User can renew custom period.
- `paid_until_date` updates correctly.
- Renewal history is recorded if renewals table is included.

### Issue 18 — Edit subscription

Acceptance criteria:

- User can change type.
- User can change billing period.
- User can change dates.
- Status recalculates automatically.

### Issue 19 — Archive subscription

Acceptance criteria:

- User can remove/deactivate a subscription.
- Subscriber remains active if they have another subscription.

---

## Milestone 7 — Operational Views

### Issue 20 — Dashboard

Acceptance criteria:

- Shows count of al corriente.
- Shows count of por vencer.
- Shows count of vencidos.
- Shows quick links to each list.

### Issue 21 — Por vencer view

Acceptance criteria:

- Shows subscribers with expiring subscriptions.
- Sorted by nearest expiration.
- Yellow status is visible.

### Issue 22 — Vencidos view

Acceptance criteria:

- Shows subscribers with expired subscriptions.
- Sorted by most overdue or nearest expiration.
- Red status is visible.

### Issue 23 — Filters and search

Acceptance criteria:

- Search by name.
- Search by phone.
- Filter by gym.
- Filter by CrossFit.
- Filter by status.

---

## Milestone 8 — Export and MVP Delivery

### Issue 24 — CSV export

Acceptance criteria:

- User can export subscriber list.
- CSV includes name, gender, phone, subscriptions, paid-until dates, and statuses.

### Issue 25 — Deploy MVP

Acceptance criteria:

- App deployed to Cloudflare Pages or Netlify.
- Supabase production project configured.
- Environment variables configured.
- PWA install tested on phone.
- Offline behavior tested.
- Sync behavior tested.

---

## Milestone 9 — Payment Reminders

Post-MVP milestone.

### Issue 26 — Generate WhatsApp reminder link

Acceptance criteria:

- User can click reminder button.
- WhatsApp opens with prefilled message.
- Message includes subscriber name.
- Message includes subscription type.
- Message includes due date.

### Issue 27 — Reminder templates

Acceptance criteria:

- User can configure message for vencidos.
- User can configure message for por vencer.

### Issue 28 — Bulk reminders

Acceptance criteria:

- User can prepare reminders for all vencidos.
- User confirms before opening/sending.

---

## 19. MVP Success Criteria

The MVP is successful if Ángel can:

- Open the app from phone or computer.
- Install it as a PWA.
- Add around 80 active socios.
- Assign gym, CrossFit, or both.
- See who is al corriente, por vencer, and vencido.
- Renew a subscription in a few seconds.
- Use the app offline.
- See changes sync when back online.
- Export his data.

---

## 20. Final Recommendation

Build the MVP as:

```txt
Vite React SPA
+ TypeScript
+ Supabase
+ RxDB
+ Repository layer
+ PWA
+ Cloudflare Pages or Netlify
```

Keep the UI simple and operational.

The app should not feel like a SaaS dashboard. It should feel like a fast, practical control panel for Ángel’s gym:

```txt
Open app.
Search socio.
See semáforo.
Renew.
Done.
```
