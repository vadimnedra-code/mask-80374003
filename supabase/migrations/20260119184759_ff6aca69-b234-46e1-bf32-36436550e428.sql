-- Create table for group call participants (extends current calls system)
CREATE TABLE public.call_participants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  call_id UUID NOT NULL REFERENCES public.calls(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, ringing, connecting, active, left
  joined_at TIMESTAMP WITH TIME ZONE,
  left_at TIMESTAMP WITH TIME ZONE,
  is_muted BOOLEAN NOT NULL DEFAULT false,
  is_video_off BOOLEAN NOT NULL DEFAULT false,
  is_screen_sharing BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(call_id, user_id)
);

-- Create table for peer-to-peer connections within group calls
CREATE TABLE public.call_peer_connections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  call_id UUID NOT NULL REFERENCES public.calls(id) ON DELETE CASCADE,
  from_user_id UUID NOT NULL,
  to_user_id UUID NOT NULL,
  offer JSONB,
  answer JSONB,
  ice_candidates JSONB[] DEFAULT '{}',
  connection_state TEXT DEFAULT 'new',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(call_id, from_user_id, to_user_id)
);

-- Add is_group_call flag to calls table
ALTER TABLE public.calls ADD COLUMN IF NOT EXISTS is_group_call BOOLEAN NOT NULL DEFAULT false;

-- Add max_participants column for group calls
ALTER TABLE public.calls ADD COLUMN IF NOT EXISTS max_participants INTEGER DEFAULT 8;

-- Enable RLS on new tables
ALTER TABLE public.call_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.call_peer_connections ENABLE ROW LEVEL SECURITY;

-- RLS policies for call_participants
CREATE POLICY "Call participants can view participants in their calls"
  ON public.call_participants
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.call_participants cp
      WHERE cp.call_id = call_participants.call_id
      AND cp.user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM public.calls c
      WHERE c.id = call_participants.call_id
      AND (c.caller_id = auth.uid() OR c.callee_id = auth.uid())
    )
  );

CREATE POLICY "Users can join calls they are invited to"
  ON public.call_participants
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own participation"
  ON public.call_participants
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can leave calls"
  ON public.call_participants
  FOR DELETE
  USING (auth.uid() = user_id);

-- RLS policies for call_peer_connections
CREATE POLICY "Users can view their peer connections"
  ON public.call_peer_connections
  FOR SELECT
  USING (auth.uid() = from_user_id OR auth.uid() = to_user_id);

CREATE POLICY "Users can create peer connections"
  ON public.call_peer_connections
  FOR INSERT
  WITH CHECK (auth.uid() = from_user_id);

CREATE POLICY "Users can update peer connections they are part of"
  ON public.call_peer_connections
  FOR UPDATE
  USING (auth.uid() = from_user_id OR auth.uid() = to_user_id);

CREATE POLICY "Users can delete their peer connections"
  ON public.call_peer_connections
  FOR DELETE
  USING (auth.uid() = from_user_id OR auth.uid() = to_user_id);

-- Create function to append ICE candidate for group calls
CREATE OR REPLACE FUNCTION public.append_group_call_ice_candidate(
  _call_id UUID,
  _from_user_id UUID,
  _to_user_id UUID,
  _candidate JSONB
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF auth.uid() <> _from_user_id THEN
    RAISE EXCEPTION 'Not allowed';
  END IF;

  UPDATE public.call_peer_connections
  SET ice_candidates = array_append(COALESCE(ice_candidates, '{}'::jsonb[]), _candidate),
      updated_at = now()
  WHERE call_id = _call_id AND from_user_id = _from_user_id AND to_user_id = _to_user_id;
  
  -- If no row was updated, the connection might be in the reverse direction
  IF NOT FOUND THEN
    UPDATE public.call_peer_connections
    SET ice_candidates = array_append(COALESCE(ice_candidates, '{}'::jsonb[]), _candidate),
        updated_at = now()
    WHERE call_id = _call_id AND from_user_id = _to_user_id AND to_user_id = _from_user_id;
  END IF;
END;
$$;

-- Enable realtime for new tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.call_participants;
ALTER PUBLICATION supabase_realtime ADD TABLE public.call_peer_connections;

-- Create trigger for updated_at
CREATE TRIGGER update_call_participants_updated_at
  BEFORE UPDATE ON public.call_participants
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_call_peer_connections_updated_at
  BEFORE UPDATE ON public.call_peer_connections
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();