-- Function to get all users for admin panel
CREATE OR REPLACE FUNCTION public.get_admin_users()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result json;
BEGIN
  -- Check if user is admin
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;

  SELECT json_agg(row_to_json(t))
  INTO result
  FROM (
    SELECT 
      p.user_id,
      p.display_name,
      p.username,
      p.avatar_url,
      p.status,
      p.last_seen,
      p.created_at,
      p.bio,
      (SELECT array_agg(ur.role) FROM public.user_roles ur WHERE ur.user_id = p.user_id) as roles,
      (SELECT COUNT(*) FROM public.blocked_users bu WHERE bu.blocked_id = p.user_id) as times_blocked,
      (SELECT COUNT(*) FROM public.messages m WHERE m.sender_id = p.user_id) as message_count
    FROM public.profiles p
    ORDER BY p.created_at DESC
  ) t;

  RETURN COALESCE(result, '[]'::json);
END;
$$;

-- Function for admin to set user role
CREATE OR REPLACE FUNCTION public.admin_set_user_role(_target_user_id uuid, _role app_role, _action text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if user is admin
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;

  -- Cannot change own role
  IF auth.uid() = _target_user_id THEN
    RAISE EXCEPTION 'Cannot modify your own role';
  END IF;

  IF _action = 'add' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (_target_user_id, _role)
    ON CONFLICT (user_id, role) DO NOTHING;
  ELSIF _action = 'remove' THEN
    DELETE FROM public.user_roles
    WHERE user_id = _target_user_id AND role = _role;
  ELSE
    RAISE EXCEPTION 'Invalid action: use add or remove';
  END IF;

  RETURN true;
END;
$$;

-- Function for admin to block/unblock user globally
CREATE OR REPLACE FUNCTION public.admin_block_user(_target_user_id uuid, _block boolean)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if user is admin
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;

  -- Cannot block yourself
  IF auth.uid() = _target_user_id THEN
    RAISE EXCEPTION 'Cannot block yourself';
  END IF;

  IF _block THEN
    -- Add 'blocked' role (we'll use moderator as blocked indicator for now)
    -- Or we can update the profile status
    UPDATE public.profiles
    SET status = 'banned'
    WHERE user_id = _target_user_id;
  ELSE
    -- Unblock - set to offline
    UPDATE public.profiles
    SET status = 'offline'
    WHERE user_id = _target_user_id;
  END IF;

  RETURN true;
END;
$$;