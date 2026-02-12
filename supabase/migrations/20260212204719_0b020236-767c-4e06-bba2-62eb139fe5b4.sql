
-- Update the RPC to include sender_id in each candidate
CREATE OR REPLACE FUNCTION public.append_call_ice_candidate(_call_id uuid, _candidate jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller uuid;
  v_callee uuid;
  v_tagged jsonb;
BEGIN
  SELECT caller_id::uuid, callee_id::uuid
    INTO v_caller, v_callee
  FROM public.calls
  WHERE id = _call_id;

  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'Call not found';
  END IF;

  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF auth.uid() <> v_caller AND auth.uid() <> v_callee THEN
    RAISE EXCEPTION 'Not allowed';
  END IF;

  -- Tag candidate with sender_id so each side can filter out its own
  v_tagged := jsonb_build_object('sender_id', auth.uid()::text, 'candidate', _candidate);

  UPDATE public.calls
  SET ice_candidates = array_append(COALESCE(ice_candidates, '{}'::jsonb[]), v_tagged),
      updated_at = now()
  WHERE id = _call_id;
END;
$$;
