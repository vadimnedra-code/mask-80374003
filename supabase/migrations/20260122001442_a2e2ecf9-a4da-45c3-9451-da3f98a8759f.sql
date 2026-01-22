-- Remove the old duplicate policy that still allows anonymous access
DROP POLICY IF EXISTS "Authenticated users can view chat media" ON storage.objects;