-- Enable required extensions
create extension if not exists "uuid-ossp";
create extension if not exists "postgis"; -- for proximity queries

-- ─────────────────────────────────────────────
-- PROFILES
-- ─────────────────────────────────────────────
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  full_name text,
  phone text unique,
  gender text check (gender in ('male', 'female', 'non-binary', 'prefer-not-to-say')),
  age integer check (age >= 18 and age <= 99),
  occupation text,
  bio text,
  avatar_url text,
  intent text check (intent in ('dating', 'networking', 'exploring', 'friends', 'open')) default 'open',
  gender_preference text check (gender_preference in ('male', 'female', 'everyone')) default 'everyone',
  age_min integer default 18,
  age_max integer default 99,
  anonymity_preference text check (anonymity_preference in ('anonymous', 'semi', 'open')) default 'anonymous',
  is_onboarded boolean default false,
  is_male_verified boolean default false,
  recommendation_score float default 5.0,
  spotify_connected boolean default false,
  current_lat float,
  current_lng float,
  last_location_update timestamp with time zone,
  created_at timestamp with time zone default timezone('utc', now()) not null,
  updated_at timestamp with time zone default timezone('utc', now()) not null
);

alter table public.profiles enable row level security;

create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, phone)
  values (new.id, new.phone);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Auto-update updated_at
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$ language plpgsql;

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.handle_updated_at();

-- ─────────────────────────────────────────────
-- USER INTERESTS
-- ─────────────────────────────────────────────
create table public.user_interests (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  category text not null,
  subcategory text,
  passion_level text check (passion_level in ('interested', 'passionate', 'obsessed')) default 'interested',
  created_at timestamp with time zone default timezone('utc', now()) not null
);

alter table public.user_interests enable row level security;

create policy "Users manage own interests"
  on public.user_interests for all
  using (auth.uid() = user_id);

-- ─────────────────────────────────────────────
-- PERSONALITY RESPONSES
-- ─────────────────────────────────────────────
create table public.personality_responses (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null unique,
  question_1 text,
  question_2 text,
  question_3 text,
  ai_personality_vector jsonb,
  created_at timestamp with time zone default timezone('utc', now()) not null
);

alter table public.personality_responses enable row level security;

create policy "Users manage own responses"
  on public.personality_responses for all
  using (auth.uid() = user_id);

-- ─────────────────────────────────────────────
-- INVITES (women invite men)
-- ─────────────────────────────────────────────
create table public.invites (
  id uuid default gen_random_uuid() primary key,
  inviter_id uuid references public.profiles(id) on delete cascade not null,
  invite_code text unique default encode(gen_random_bytes(6), 'hex'),
  invitee_phone text,
  invitee_id uuid references public.profiles(id),
  status text check (status in ('pending', 'accepted', 'expired')) default 'pending',
  expires_at timestamp with time zone default (now() + interval '30 days'),
  created_at timestamp with time zone default timezone('utc', now()) not null
);

alter table public.invites enable row level security;

create policy "Inviters can manage own invites"
  on public.invites for all
  using (auth.uid() = inviter_id);

create policy "Invitees can view their invite"
  on public.invites for select
  using (auth.uid() = invitee_id);

-- ─────────────────────────────────────────────
-- ROOMS
-- ─────────────────────────────────────────────
create table public.rooms (
  id uuid default gen_random_uuid() primary key,
  user_1_id uuid references public.profiles(id) on delete cascade not null,
  user_2_id uuid references public.profiles(id) on delete cascade not null,
  status text check (status in ('active', 'closed', 'revealed')) default 'active',
  timer_expires_at timestamp with time zone default (now() + interval '24 hours'),
  timer_extended boolean default false,
  extension_requested_by_1 boolean default false,
  extension_requested_by_2 boolean default false,
  reveal_requested_by_1 boolean default false,
  reveal_requested_by_2 boolean default false,
  icebreaker text,
  session_intent text,
  venue_name text,
  venue_lat float,
  venue_lng float,
  created_at timestamp with time zone default timezone('utc', now()) not null,
  closed_at timestamp with time zone
);

alter table public.rooms enable row level security;

create policy "Room participants can view room"
  on public.rooms for select
  using (auth.uid() = user_1_id or auth.uid() = user_2_id);

create policy "Room participants can update room"
  on public.rooms for update
  using (auth.uid() = user_1_id or auth.uid() = user_2_id);

-- ─────────────────────────────────────────────
-- MESSAGES
-- ─────────────────────────────────────────────
create table public.messages (
  id uuid default gen_random_uuid() primary key,
  room_id uuid references public.rooms(id) on delete cascade not null,
  sender_id uuid references public.profiles(id) on delete cascade not null,
  content text not null,
  created_at timestamp with time zone default timezone('utc', now()) not null
);

alter table public.messages enable row level security;

create policy "Room participants can view messages"
  on public.messages for select
  using (
    exists (
      select 1 from public.rooms
      where id = messages.room_id
      and (user_1_id = auth.uid() or user_2_id = auth.uid())
    )
  );

create policy "Room participants can send messages"
  on public.messages for insert
  with check (
    auth.uid() = sender_id and
    exists (
      select 1 from public.rooms
      where id = room_id
      and status = 'active'
      and (user_1_id = auth.uid() or user_2_id = auth.uid())
    )
  );

-- Enable realtime for messages
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.rooms;

-- ─────────────────────────────────────────────
-- RATINGS
-- ─────────────────────────────────────────────
create table public.ratings (
  id uuid default gen_random_uuid() primary key,
  room_id uuid references public.rooms(id) on delete cascade not null,
  rater_id uuid references public.profiles(id) on delete cascade not null,
  rated_user_id uuid references public.profiles(id) on delete cascade not null,
  respectful boolean,
  interesting boolean,
  would_recommend boolean,
  visible_at timestamp with time zone default (now() + interval '24 hours'),
  created_at timestamp with time zone default timezone('utc', now()) not null,
  unique(room_id, rater_id)
);

alter table public.ratings enable row level security;

create policy "Users can submit own ratings"
  on public.ratings for insert
  with check (auth.uid() = rater_id);

create policy "Users can view ratings after visibility window"
  on public.ratings for select
  using (auth.uid() = rater_id or (auth.uid() = rated_user_id and visible_at <= now()));

-- ─────────────────────────────────────────────
-- VENUE SPOTS
-- ─────────────────────────────────────────────
create table public.venue_spots (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  address text,
  lat float not null,
  lng float not null,
  category text check (category in ('cafe', 'coworking', 'airport', 'gym', 'mall', 'other')) default 'other',
  crowd_profile jsonb,
  peak_times jsonb,
  tier text check (tier in ('listed', 'active', 'featured')) default 'listed',
  is_active boolean default true,
  created_at timestamp with time zone default timezone('utc', now()) not null
);

alter table public.venue_spots enable row level security;

create policy "Anyone can view active venues"
  on public.venue_spots for select
  using (is_active = true);

-- ─────────────────────────────────────────────
-- VENUE OFFERS
-- ─────────────────────────────────────────────
create table public.venue_offers (
  id uuid default gen_random_uuid() primary key,
  venue_id uuid references public.venue_spots(id) on delete cascade not null,
  title text not null,
  description text,
  discount_percent integer check (discount_percent >= 0 and discount_percent <= 100),
  valid_until timestamp with time zone,
  is_active boolean default true,
  created_at timestamp with time zone default timezone('utc', now()) not null
);

alter table public.venue_offers enable row level security;

create policy "Anyone can view active offers"
  on public.venue_offers for select
  using (is_active = true);

-- ─────────────────────────────────────────────
-- SEED: Sample venue spots
-- ─────────────────────────────────────────────
insert into public.venue_spots (name, address, lat, lng, category, crowd_profile, tier) values
  ('Blue Tokai Coffee', 'Koramangala, Bengaluru', 12.9352, 77.6245, 'cafe', '{"Founders": 60, "Designers": 25, "Other": 15}', 'featured'),
  ('91springboard', 'Koramangala, Bengaluru', 12.9340, 77.6200, 'coworking', '{"Founders": 70, "Developers": 20, "Other": 10}', 'active'),
  ('Kempegowda International Airport', 'Bengaluru', 13.1986, 77.7066, 'airport', '{"Business Travellers": 50, "Founders": 30, "Other": 20}', 'featured');
