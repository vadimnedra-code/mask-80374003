import { LinkPreviewData } from '@/hooks/useLinkPreview';
import { ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LinkPreviewProps {
  data: LinkPreviewData;
  isOwn: boolean;
}

export const LinkPreview = ({ data, isOwn }: LinkPreviewProps) => {
  const hostname = (() => {
    try { return new URL(data.url).hostname.replace('www.', ''); } catch { return data.url; }
  })();

  return (
    <a
      href={data.url}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "block rounded-md overflow-hidden mb-1 border transition-colors",
        isOwn
          ? "border-primary/20 bg-primary/5 hover:bg-primary/10"
          : "border-border bg-muted/50 hover:bg-muted"
      )}
    >
      {data.image && (
        <img
          src={data.image}
          alt={data.title || ''}
          className="w-full h-32 object-cover"
          loading="lazy"
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
        />
      )}
      <div className="px-2.5 py-2 space-y-0.5">
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          {data.favicon && (
            <img
              src={data.favicon}
              alt=""
              className="w-3.5 h-3.5 rounded-sm"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          )}
          <span className="truncate">{data.siteName || hostname}</span>
          <ExternalLink className="w-3 h-3 shrink-0 ml-auto" />
        </div>
        {data.title && (
          <p className="text-[13px] font-medium leading-tight line-clamp-2">
            {data.title}
          </p>
        )}
        {data.description && (
          <p className="text-[12px] text-muted-foreground leading-tight line-clamp-2">
            {data.description}
          </p>
        )}
      </div>
    </a>
  );
};
