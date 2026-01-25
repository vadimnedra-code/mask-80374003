import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import type { StudioArtifact, ArtifactType } from '@/types/studio';

export const useStudioArtifacts = () => {
  const { user } = useAuth();
  const [artifacts, setArtifacts] = useState<StudioArtifact[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchArtifacts = useCallback(async () => {
    if (!user?.id) return;
    
    setLoading(true);
    const { data, error } = await supabase
      .from('studio_artifacts')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setArtifacts(data as unknown as StudioArtifact[]);
    }
    setLoading(false);
  }, [user?.id]);

  const createArtifact = useCallback(async (
    type: ArtifactType,
    title: string,
    content: string,
    sourceFileId?: string,
    metadata?: Record<string, unknown>
  ): Promise<StudioArtifact | null> => {
    if (!user?.id) return null;

    // Type assertion needed until Supabase types are regenerated
    const insertData = {
      user_id: user.id,
      artifact_type: type,
      title,
      text_content: content,
      source_file_id: sourceFileId || null,
      metadata: metadata || {},
    };

    const { data, error } = await supabase
      .from('studio_artifacts')
      .insert(insertData as any)
      .select()
      .single();

    if (error) {
      console.error('Error creating artifact:', error);
      return null;
    }

    const newArtifact = data as unknown as StudioArtifact;
    setArtifacts(prev => [newArtifact, ...prev]);
    return newArtifact;
  }, [user?.id]);

  const deleteArtifact = useCallback(async (artifactId: string) => {
    const artifact = artifacts.find(a => a.id === artifactId);
    if (!artifact) return;

    // Delete from storage if exists
    if (artifact.storage_path) {
      await supabase.storage
        .from('studio-files')
        .remove([artifact.storage_path]);
    }

    // Delete record
    await supabase
      .from('studio_artifacts')
      .delete()
      .eq('id', artifactId);

    setArtifacts(prev => prev.filter(a => a.id !== artifactId));
  }, [artifacts]);

  const saveToVault = useCallback(async (artifactId: string) => {
    const { error } = await supabase
      .from('studio_artifacts')
      .update({ is_vault: true, ttl_expires_at: null })
      .eq('id', artifactId);

    if (!error) {
      setArtifacts(prev => prev.map(a => 
        a.id === artifactId ? { ...a, is_vault: true, ttl_expires_at: null } : a
      ));
    }
    return { error };
  }, []);

  const getSignedUrl = useCallback(async (storagePath: string): Promise<string | null> => {
    const { data, error } = await supabase.storage
      .from('studio-files')
      .createSignedUrl(storagePath, 3600);

    if (error) return null;
    return data.signedUrl;
  }, []);

  return {
    artifacts,
    loading,
    fetchArtifacts,
    createArtifact,
    deleteArtifact,
    saveToVault,
    getSignedUrl,
  };
};
