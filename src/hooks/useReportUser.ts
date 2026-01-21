import { useCallback, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type ReportReason = 'spam' | 'harassment' | 'illegal' | 'other';

export const useReportUser = () => {
  const [loading, setLoading] = useState(false);

  const reportUser = useCallback(async (
    reportedUserId: string,
    reason: ReportReason,
    description?: string
  ) => {
    setLoading(true);

    const { error } = await supabase
      .from('reports')
      .insert({
        reported_user_id: reportedUserId,
        reason,
        description: description || null,
      });

    setLoading(false);

    if (error) {
      console.error('Error reporting user:', error);
      return { error };
    }

    return { error: null };
  }, []);

  const getReasonLabel = useCallback((reason: ReportReason) => {
    switch (reason) {
      case 'spam':
        return 'Спам';
      case 'harassment':
        return 'Оскорбления';
      case 'illegal':
        return 'Незаконный контент';
      case 'other':
        return 'Другое';
      default:
        return reason;
    }
  }, []);

  return {
    reportUser,
    loading,
    getReasonLabel,
  };
};
