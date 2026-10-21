-- Gestión de personal: contraseña provisional que el usuario debe cambiar al entrar

alter table perfiles add column cambiar_password boolean not null default false;

-- El propio usuario marca que ya cambió su contraseña provisional
create function password_cambiada() returns void
language sql security definer set search_path = public as $$
  update perfiles set cambiar_password = false where id = auth.uid()
$$;
