import { useState } from 'react';
import { 
  FileText, 
  ImageIcon, 
  Presentation, 
  Table, 
  Download, 
  Send, 
  Vault, 
  Trash2,
  Eye,
  Clock,
  Lock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { StudioArtifact, ArtifactType } from '@/types/studio';
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';

const artifactIcons: Record<ArtifactType, React.ElementType> = {
  document: FileText,
  summary: FileText,
  presentation: Presentation,
  image: ImageIcon,
  table: Table,
  text: FileText,
};

interface ArtifactCardProps {
  artifact: StudioArtifact;
  onPreview: () => void;
  onDownload: () => void;
  onSend: () => void;
  onSaveToVault: () => void;
  onDelete: () => void;
}

export const ArtifactCard = ({
  artifact,
  onPreview,
  onDownload,
  onSend,
  onSaveToVault,
  onDelete,
}: ArtifactCardProps) => {
  const Icon = artifactIcons[artifact.artifact_type] || FileText;
  const timeAgo = formatDistanceToNow(new Date(artifact.created_at), { 
    addSuffix: true, 
    locale: ru 
  });

  return (
    <Card className="p-3 bg-background/80 border-border/50 hover:border-primary/30 transition-colors">
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
          <Icon className="w-6 h-6 text-primary" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="text-sm font-medium text-foreground truncate">
              {artifact.title}
            </h4>
            {artifact.is_vault && (
              <Lock className="w-3 h-3 text-primary flex-shrink-0" />
            )}
          </div>
          
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
              {artifact.artifact_type}
            </Badge>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {timeAgo}
            </span>
          </div>

          {/* Preview text */}
          {artifact.text_content && (
            <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
              {artifact.text_content.slice(0, 150)}...
            </p>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 mt-3 pt-3 border-t border-border/30">
        <Button variant="ghost" size="sm" onClick={onPreview} className="flex-1">
          <Eye className="w-4 h-4 mr-1" />
          Preview
        </Button>
        <Button variant="ghost" size="sm" onClick={onDownload}>
          <Download className="w-4 h-4" />
        </Button>
        <Button variant="ghost" size="sm" onClick={onSend}>
          <Send className="w-4 h-4" />
        </Button>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm">•••</Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {!artifact.is_vault && (
              <DropdownMenuItem onClick={onSaveToVault}>
                <Vault className="w-4 h-4 mr-2" />
                Save to Vault
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onDelete} className="text-destructive">
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </Card>
  );
};
