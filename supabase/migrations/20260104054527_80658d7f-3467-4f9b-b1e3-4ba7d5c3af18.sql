-- Таблица для Identity Keys пользователей (открытые ключи)
CREATE TABLE public.e2ee_identity_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  identity_key BYTEA NOT NULL,
  signing_key BYTEA NOT NULL,
  registration_id INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Индекс для быстрого поиска по user_id
CREATE INDEX idx_e2ee_identity_keys_user_id ON public.e2ee_identity_keys(user_id);

-- Таблица для Signed PreKeys
CREATE TABLE public.e2ee_signed_prekeys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  key_id INTEGER NOT NULL,
  public_key BYTEA NOT NULL,
  signature BYTEA NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, key_id)
);

CREATE INDEX idx_e2ee_signed_prekeys_user_id ON public.e2ee_signed_prekeys(user_id);

-- Таблица для One-Time PreKeys
CREATE TABLE public.e2ee_one_time_prekeys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  key_id INTEGER NOT NULL,
  public_key BYTEA NOT NULL,
  used BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, key_id)
);

CREATE INDEX idx_e2ee_one_time_prekeys_user_id ON public.e2ee_one_time_prekeys(user_id);
CREATE INDEX idx_e2ee_one_time_prekeys_unused ON public.e2ee_one_time_prekeys(user_id, used) WHERE used = false;

-- Таблица для PreKey Bundles (публичная информация для обмена ключами)
CREATE TABLE public.e2ee_prekey_bundles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  bundle BYTEA NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_e2ee_prekey_bundles_user_id ON public.e2ee_prekey_bundles(user_id);

-- Добавляем колонки для зашифрованных сообщений
ALTER TABLE public.messages 
ADD COLUMN encrypted_content BYTEA,
ADD COLUMN is_encrypted BOOLEAN DEFAULT false,
ADD COLUMN sender_ratchet_key BYTEA;

-- RLS Policies
ALTER TABLE public.e2ee_identity_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.e2ee_signed_prekeys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.e2ee_one_time_prekeys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.e2ee_prekey_bundles ENABLE ROW LEVEL SECURITY;

-- Identity Keys: владелец может управлять, все авторизованные могут читать открытые ключи
CREATE POLICY "Users can manage own identity keys"
ON public.e2ee_identity_keys FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view other identity keys"
ON public.e2ee_identity_keys FOR SELECT
TO authenticated
USING (true);

-- Signed PreKeys: владелец управляет, все читают
CREATE POLICY "Users can manage own signed prekeys"
ON public.e2ee_signed_prekeys FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view other signed prekeys"
ON public.e2ee_signed_prekeys FOR SELECT
TO authenticated
USING (true);

-- One-Time PreKeys: владелец управляет, все могут забрать (и пометить использованным)
CREATE POLICY "Users can manage own one-time prekeys"
ON public.e2ee_one_time_prekeys FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can consume one-time prekeys"
ON public.e2ee_one_time_prekeys FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (used = true);

CREATE POLICY "Users can view unused one-time prekeys"
ON public.e2ee_one_time_prekeys FOR SELECT
TO authenticated
USING (true);

-- PreKey Bundles: владелец управляет, все читают
CREATE POLICY "Users can manage own prekey bundle"
ON public.e2ee_prekey_bundles FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view prekey bundles"
ON public.e2ee_prekey_bundles FOR SELECT
TO authenticated
USING (true);

-- Trigger для updated_at
CREATE TRIGGER update_e2ee_identity_keys_updated_at
BEFORE UPDATE ON public.e2ee_identity_keys
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_e2ee_prekey_bundles_updated_at
BEFORE UPDATE ON public.e2ee_prekey_bundles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();