-- Add new columns to profiles table
alter table public.profiles
add column has_completed_setup boolean default false;

-- Create a storage bucket for avatars if it doesn't exist
insert into storage.buckets (id, name)
values ('avatars', 'avatars')
on conflict (id) do nothing;

-- Set up storage policies for avatars
create policy "Avatar images are publicly accessible"
  on storage.objects for select
  using ( bucket_id = 'avatars' );

create policy "Users can upload their own avatar"
  on storage.objects for insert
  with check (
    bucket_id = 'avatars' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users can update their own avatar"
  on storage.objects for update
  using (
    bucket_id = 'avatars' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Update existing profiles to require setup
update public.profiles
set has_completed_setup = false
where has_completed_setup is null; 