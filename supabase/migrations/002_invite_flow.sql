-- Track whether a male user has redeemed a valid invite
alter table public.profiles
  add column if not exists is_invite_verified boolean default false;

-- Allow server-side invite lookup by code (redeem API uses service role, no RLS issue)
-- But also allow the inviter to read their own invites (already covered by existing policy)

-- Allow authenticated users to read invite details by code for the redemption UI
-- The code itself is a 12-char random hex so brute-force is not a practical concern
create policy "Users can look up a pending invite by code"
  on public.invites for select
  using (
    status = 'pending'
    and expires_at > now()
    and auth.uid() is not null
  );
