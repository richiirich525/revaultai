# Testing the payout path before real money is in it

The creator payout flow has never run end to end. Four columns were missing
from `profiles` until 21 October 2026, so `connect-onboard` failed at its last
step every time. Nobody reached it, so nothing is broken — but it also means
the first run would otherwise happen on a real creator's money.

All of this works in Stripe **test mode**. No real funds move. Do it there
first.

Two numbers the whole thing turns on, both from `src/lib/payouts.js`:

- **80% of NET** — net means after the processing fee Stripe actually charged,
  which is only knowable once the charge settles. Not 80% of gross.
- **A 7-day hold** — a sale sits for a week before its payout is offered, so
  refunds and chargebacks surface before money has left.

And the trap the code warns about twice, in capitals, because it would send a
creator's earnings to the person who bought the film:

> On a `purchases` row, `user_id` is the **buyer**. The creator who gets paid
> is `creations.user_id`.

---

## Before you start

1. Run the two migrations:
   - `sql/2026-10-21-profiles-stripe-connect.sql`
   - `sql/2026-10-21-shared-rehearsals.sql`
2. Run `sql/check-schema.sql`. Every row must say `ok`. It also checks two
   unique constraints that upserts depend on silently — `payouts
   (stripe_session_id)` and `purchases (user_id, creation_id)`. Without those
   the upserts error and nothing is recorded.
3. Confirm all three Stripe variables exist in Vercel:
   `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_CONNECT_WEBHOOK_SECRET`.
4. Decide which Stripe mode you are testing. If `STRIPE_SECRET_KEY` begins
   `sk_test_`, everything below happens in test mode and the live dashboard
   will look empty. That is correct, not a failure.

You will need two accounts: **you** (admin, the email in `ADMIN_EMAILS`) and a
**second account** to act as the creator. A throwaway address is fine.

---

## Step 1 — the creator sets up payouts

As the second account, go to **/settings** and find the payout section.
It calls `/api/connect-onboard`, which creates a Stripe account and then
records its id on the profile.

**Verify:**

```sql
select id, stripe_account_id, stripe_country,
       stripe_payouts_enabled, stripe_details_submitted
from public.profiles
where id = '<the creator user id>';
```

`stripe_account_id` must be a value starting `acct_`. If it is null and you
got an error telling you to email support, the columns still are not there —
stop and re-run the migration.

Complete Stripe's onboarding form. In test mode Stripe accepts its own test
values; use the prefill button it offers rather than inventing details.

Back on /settings, the panel calls `/api/connect-status`, which reads the live
account from Stripe and writes back what it finds.

**Verify** the same query again. `stripe_details_submitted` should now be
`true`, and `stripe_payouts_enabled` `true` once Stripe clears the account.

> If `payouts_enabled` stays false, `blockedReason` will report "Stripe has
> not cleared the creator yet" later on. That is the system working, not a bug.

---

## Step 2 — a film to sell

As the creator, have a film published with a price. Note its `creations.id`
and confirm `creations.user_id` is the **creator**, not you.

```sql
select id, title, price_cents, user_id from public.creations
where id = '<creation id>';
```

---

## Step 3 — buy it

As **you** (or a third account — any buyer that is not the creator), buy the
film. `/api/checkout` builds the Stripe Checkout session; pay with Stripe's
test card `4242 4242 4242 4242`, any future expiry, any CVC.

The webhook then writes the sale. This is the step most likely to fail
silently, because it depends on the webhook endpoint being registered and its
signing secret matching.

**Verify:**

```sql
select user_id, creation_id, stripe_session_id,
       amount_total, stripe_fee, amount_net, currency, created_at
from public.purchases
order by created_at desc limit 5;
```

Three things to check, in this order:

1. **The row exists.** If not, the webhook never arrived or failed signature
   verification. Stripe Dashboard → Developers → Webhooks → your endpoint
   shows each delivery and its response.
2. **`user_id` is the buyer**, and it is not the same as `creations.user_id`.
3. **`amount_net` and `stripe_fee` are not null.** The webhook reads them from
   the charge's balance transaction. If they are null, `blockedReason` will say
   "net unknown — Stripe fee not recorded" and the sale can never be paid.
   `amount_net` should be a little less than `amount_total`.

---

## Step 4 — see what is owed, without sending anything

As the admin account, go to **/admin** → Payouts. This calls
`/api/payouts-due`, which is **read only** — it reads sales, reads Stripe
where a fee is missing, and writes nothing. No transfer, no row marked paid.

Expect your sale to appear as **held**, with roughly "held 7 more days". That
is right. Check the arithmetic by hand:

```
creator's share = round(amount_net * 0.80)
```

If that figure is wrong, stop. Everything downstream is built on it.

`blockedReason` reports the most actionable problem first, in this order:
already paid → no creator on the film → creator has not set up payouts →
Stripe has not cleared the creator → net unknown → nothing owed → held N days.

---

## Step 5 — clear the hold

Seven days is too long to wait for a test, so backdate the sale:

```sql
update public.purchases
   set created_at = now() - interval '8 days'
 where stripe_session_id = '<the session id from step 3>';
```

Reload /admin → Payouts. The sale should move from held to ready, with no
blocking reason.

---

## Step 6 — send it

Press the send button for that creator. It calls `/api/payouts-send` with the
explicit list of session ids — it never pays "everything owed", and it refuses
more than fifty at a time.

**Verify:**

```sql
select stripe_session_id, creator_id, creation_id, amount_cents,
       currency, status, stripe_account_id, stripe_transfer_id, error, paid_at
from public.payouts
order by paid_at desc nulls last limit 5;
```

- `status` = `paid`, `stripe_transfer_id` starts `tr_`, `error` is null.
- `creator_id` is the **creator**, not the buyer. Check it against
  `creations.user_id` one more time. This is the one that costs real money.
- `amount_cents` equals your hand calculation from step 4.

In Stripe: **Connect → Transfers** should show the transfer, destined for the
connected account from step 1.

**If `status` is `failed`**, read `error`. `balance_insufficient` means the
platform has no available balance to transfer from — expected if you are
testing before the test charge has settled. The code handles that case by
name, so the row is recorded as failed rather than lost.

---

## Step 7 — the things that only break the second time

- **Press send again for the same sale.** It must not pay twice.
  `blockedReason` returns "already paid" and the upsert on
  `stripe_session_id` keeps one row. Confirm `payouts` still has exactly one
  row for that session.
- **Buy the same film twice as the same buyer.** The `purchases` upsert is on
  `(user_id, creation_id)`, so the second purchase overwrites the first rather
  than creating a second payable sale. Decide whether that is what you want —
  it means a buyer cannot buy the same film twice, and if that is intended it
  should be enforced at checkout rather than discovered here.

---

## When you are done

Delete the test rows so they never appear in a real payout run:

```sql
delete from public.payouts   where stripe_session_id = '<session id>';
delete from public.purchases where stripe_session_id = '<session id>';
```

Then switch `STRIPE_SECRET_KEY` to the live key only once every step above has
passed in test mode.
