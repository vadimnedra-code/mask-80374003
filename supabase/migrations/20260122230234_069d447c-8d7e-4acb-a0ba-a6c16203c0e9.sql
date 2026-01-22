-- Enable realtime for chat_participants table (for new chat notifications)
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_participants;

-- Enable realtime for chats table
ALTER PUBLICATION supabase_realtime ADD TABLE public.chats;

-- Enable realtime for profiles_public table (for contact status updates)
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles_public;