import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import type { StudioFile } from '@/types/studio';

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB
const ALLOWED_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'text/csv',
  'image/jpeg',
  'image/png',
  'image/webp',
];

export const useStudioFiles = () => {
  const { user } = useAuth();
  const [files, setFiles] = useState<StudioFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);

  const fetchFiles = useCallback(async () => {
    if (!user?.id) return;
    
    setLoading(true);
    const { data, error } = await supabase
      .from('studio_files')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setFiles(data as unknown as StudioFile[]);
    }
    setLoading(false);
  }, [user?.id]);

  const uploadFile = useCallback(async (file: File): Promise<StudioFile | null> => {
    if (!user?.id) return null;

    // Validate file
    if (file.size > MAX_FILE_SIZE) {
      throw new Error('Файл слишком большой (максимум 20MB)');
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      throw new Error('Неподдерживаемый тип файла');
    }

    setUploading(true);
    
    try {
      // Sanitize filename - remove non-ASCII characters and special chars
      const extension = file.name.split('.').pop() || '';
      const sanitizedName = `file_${Date.now()}.${extension}`;
      const filename = `${crypto.randomUUID()}-${sanitizedName}`;
      const storagePath = `${user.id}/${filename}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('studio-files')
        .upload(storagePath, file);

      if (uploadError) throw uploadError;

      // Create record - type assertion needed until Supabase types are regenerated
      const insertData = {
        user_id: user.id,
        filename,
        original_name: file.name,
        mime_type: file.type,
        file_size: file.size,
        storage_path: storagePath,
      };

      const { data, error } = await supabase
        .from('studio_files')
        .insert(insertData as any)
        .select()
        .single();

      if (error) throw error;

      const newFile = data as unknown as StudioFile;
      setFiles(prev => [newFile, ...prev]);
      return newFile;
    } finally {
      setUploading(false);
    }
  }, [user?.id]);

  const deleteFile = useCallback(async (fileId: string) => {
    const file = files.find(f => f.id === fileId);
    if (!file) return;

    // Delete from storage
    await supabase.storage
      .from('studio-files')
      .remove([file.storage_path]);

    // Delete record
    await supabase
      .from('studio_files')
      .delete()
      .eq('id', fileId);

    setFiles(prev => prev.filter(f => f.id !== fileId));
  }, [files]);

  const saveToVault = useCallback(async (fileId: string) => {
    const { error } = await supabase
      .from('studio_files')
      .update({ is_vault: true, ttl_expires_at: null })
      .eq('id', fileId);

    if (!error) {
      setFiles(prev => prev.map(f => 
        f.id === fileId ? { ...f, is_vault: true, ttl_expires_at: null } : f
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
    files,
    uploading,
    loading,
    fetchFiles,
    uploadFile,
    deleteFile,
    saveToVault,
    getSignedUrl,
  };
};
