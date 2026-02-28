
-- Update admin analytics to only return aggregate counts, no "who with whom" data
CREATE OR REPLACE FUNCTION public.get_admin_analytics()
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  result json;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;

  SELECT json_build_object(
    'total_users', (SELECT COUNT(*) FROM profiles),
    'total_chats', (SELECT COUNT(*) FROM chats),
    'total_messages', (SELECT COUNT(*) FROM messages),
    'messages_today', (SELECT COUNT(*) FROM messages WHERE created_at >= CURRENT_DATE),
    'messages_week', (SELECT COUNT(*) FROM messages WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'),
    'new_users_today', (SELECT COUNT(*) FROM profiles WHERE created_at >= CURRENT_DATE),
    'new_users_week', (SELECT COUNT(*) FROM profiles WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'),
    'group_chats', (SELECT COUNT(*) FROM chats WHERE is_group = true),
    'messages_by_day', (
      SELECT json_agg(row_to_json(t))
      FROM (
        SELECT 
          DATE(created_at) as date,
          COUNT(*) as count
        FROM messages
        WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
        GROUP BY DATE(created_at)
        ORDER BY DATE(created_at)
      ) t
    ),
    'users_by_day', (
      SELECT json_agg(row_to_json(t))
      FROM (
        SELECT 
          DATE(created_at) as date,
          COUNT(*) as count
        FROM profiles
        WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
        GROUP BY DATE(created_at)
        ORDER BY DATE(created_at)
      ) t
    )
  ) INTO result;

  RETURN result;
END;
$function$;
