-- Drop existing profile policies
drop policy if exists "Public profiles are viewable by everyone" on profiles;
drop policy if exists "Users can update their own profile" on profiles;
drop policy if exists "Users can insert their own profile" on profiles;

-- Create new profile policies
create policy "Profiles are viewable by everyone"
    on profiles for select
    using (true);

create policy "Users can insert their own profile"
    on profiles for insert
    with check (auth.uid() = id);

create policy "Users can update their own profile"
    on profiles for update
    using (auth.uid() = id);

create policy "Users can delete their own profile"
    on profiles for delete
    using (auth.uid() = id);

-- Create a storage bucket for avatars if it doesn't exist
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- Drop existing storage policies
drop policy if exists "Avatar images are publicly accessible" on storage.objects;
drop policy if exists "Users can upload their own avatar" on storage.objects;
drop policy if exists "Users can update their own avatar" on storage.objects;

-- Create new storage policies
create policy "Avatars are publicly accessible"
    on storage.objects for select
    using (bucket_id = 'avatars');

create policy "Users can upload their own avatar"
    on storage.objects for insert
    with check (
        bucket_id = 'avatars' 
        and (storage.foldername(name))[1] = auth.uid()::text
    );

create policy "Users can update their own avatar"
    on storage.objects for update
    using (
        bucket_id = 'avatars' 
        and (storage.foldername(name))[1] = auth.uid()::text
    );

create policy "Users can delete their own avatar"
    on storage.objects for delete
    using (
        bucket_id = 'avatars' 
        and (storage.foldername(name))[1] = auth.uid()::text
    ); 