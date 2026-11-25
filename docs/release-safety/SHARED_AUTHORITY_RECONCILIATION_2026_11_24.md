# Ask Intros: shared authority reconciliation (2026-11-24)

Read-only inspection of the Ask Intros Lovable Cloud project, not the similarly
named empty external Supabase project, confirmed:
- The raw professional_opportunities ACL is already service-only. The historical
  generic domain replay restored grants; forward reconciliation reasserts the
  canonical exchange RPC boundary.
- The live referral tables contain the legacy for_member_id/suggested_member_id
  and target_member_id columns plus the additive 0100 aliases.
- The canonical live roster is syndication_room_members, with member_id and
  user_id aliases; the historical syndication_members table is absent in live.
- Live referrals and syndication had permissive table grants and direct
  mutation policies. No rows were returned by the grouped status counts in
  these four feature tables on the inspection date.

0113 preserves all rows and source history. It locks raw exchange/referral
writes and introduces atomic guarded room/roster/vote actions. A historical
dual-roster replay copies only missing roster rows, never replaces votes or
deletes historical data. Test fixtures model observed live-only aliases.

Do not apply to production until the repository checks pass, the actual
production migration ledger and backup are verified, and authenticated
owner/participant/outsider tests are run against a disposable staging copy.
Deployment must coordinate the new server action code with the SQL; the older
client code must not be left pointing at newly revoked raw write permissions.
No live DDL or member record change was performed during source implementation.
