-- Drop existing profile policies
drop policy if exists "Profiles are viewable by everyone" on profiles;
drop policy if exists "Users can insert their own profile" on profiles;
drop policy if exists "Users can update their own profile" on profiles;
drop policy if exists "Users can delete their own profile" on profiles;

-- Create new profile policies
create policy "Profiles are viewable by everyone"
    on profiles for select
    using (true);

create policy "Users can create their own profile"
    on profiles for insert
    with check (
        auth.uid() = id
        and auth.role() = 'authenticated'
    );

create policy "Users can update their own profile"
    on profiles for update
    using (auth.uid() = id)
    with check (auth.role() = 'authenticated');

-- Enable RLS
alter table profiles enable row level security;

-- Create or replace the handle_new_user function
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
    insert into public.profiles (id, email, username, has_completed_setup)
    values (
        new.id,
        new.email,
        split_part(new.email, '@', 1),
        false
    );
    return new;
end;
$$;

-- Drop the trigger if it exists
drop trigger if exists on_auth_user_created on auth.users;

-- Create the trigger
create trigger on_auth_user_created
    after insert on auth.users
    for each row execute procedure public.handle_new_user(); 