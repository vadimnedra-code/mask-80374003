-- Create calls table for signaling
CREATE TABLE public.calls (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  caller_id uuid NOT NULL,
  callee_id uuid NOT NULL,
  chat_id uuid NOT NULL REFERENCES public.chats(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending', -- pending, ringing, active, ended, rejected, missed
  call_type text NOT NULL DEFAULT 'voice', -- voice or video
  offer jsonb,
  answer jsonb,
  ice_candidates jsonb[] DEFAULT '{}',
  started_at timestamp with time zone,
  ended_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.calls ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view calls they are part of"
ON public.calls
FOR SELECT
USING (auth.uid() = caller_id OR auth.uid() = callee_id);

CREATE POLICY "Users can create calls"
ON public.calls
FOR INSERT
WITH CHECK (auth.uid() = caller_id);

CREATE POLICY "Users can update calls they are part of"
ON public.calls
FOR UPDATE
USING (auth.uid() = caller_id OR auth.uid() = callee_id);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.calls;

-- Add trigger for updated_at
CREATE TRIGGER update_calls_updated_at
BEFORE UPDATE ON public.calls
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();