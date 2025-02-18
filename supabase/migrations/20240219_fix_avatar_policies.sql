-- Drop existing storage policies
drop policy if exists "Avatar images are publicly accessible" on storage.objects;
drop policy if exists "Users can upload their own avatar" on storage.objects;
drop policy if exists "Users can update their own avatar" on storage.objects;
drop policy if exists "Users can delete their own avatar" on storage.objects;

-- Ensure the avatars bucket exists and is public
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do update set public = true;

-- Create new storage policies
create policy "Avatars are publicly accessible"
    on storage.objects for select
    using (bucket_id = 'avatars');

create policy "Users can upload their own avatar"
    on storage.objects for insert
    with check (
        bucket_id = 'avatars' 
        and auth.role() = 'authenticated'
    );

create policy "Users can update their own avatar"
    on storage.objects for update
    using (
        bucket_id = 'avatars' 
        and auth.role() = 'authenticated'
    );

create policy "Users can delete their own avatar"
    on storage.objects for delete
    using (
        bucket_id = 'avatars' 
        and auth.role() = 'authenticated'
    ); 