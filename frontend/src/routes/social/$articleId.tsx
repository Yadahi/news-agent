/* eslint-disable react-refresh/only-export-components */
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { getArticle } from "@/lib/api";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn, formatDate } from "@/lib/utils";
import { Copy, Check, Sparkles, RefreshCw, ExternalLink } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/social/$articleId")({
  component: SocialWorkspacePage,
});

// ─── Types & constants ────────────────────────────────────────────────────────

type Platform = "twitter" | "instagram" | "facebook" | "telegram";
type Tone = "neutral" | "punchy" | "curious" | "formal";
type PostLength = "short" | "medium" | "long";

const PLATFORM_ORDER: Platform[] = [
  "twitter",
  "instagram",
  "facebook",
  "telegram",
];

const PLATFORMS: Record<
  Platform,
  { label: string; shortLabel: string; iconBg: string; charLimit: number; openUrl: (text: string) => string }
> = {
  twitter: {
    label: "X / Twitter",
    shortLabel: "X",
    iconBg: "bg-black text-white",
    charLimit: 280,
    openUrl: (text) => `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`,
  },
  instagram: {
    label: "Instagram",
    shortLabel: "IG",
    iconBg: "bg-[#E1306C] text-white",
    charLimit: 2200,
    openUrl: () => "https://www.instagram.com/",
  },
  facebook: {
    label: "Facebook",
    shortLabel: "FB",
    iconBg: "bg-[#1877F2] text-white",
    charLimit: 63206,
    openUrl: () => "https://www.facebook.com/sharer/sharer.php",
  },
  telegram: {
    label: "Telegram",
    shortLabel: "TG",
    iconBg: "bg-[#0088CC] text-white",
    charLimit: 4096,
    openUrl: (text) => `https://t.me/share/url?url=https://newsagent.io&text=${encodeURIComponent(text)}`,
  },
};

const TONES: Tone[] = ["neutral", "punchy", "curious", "formal"];
const LENGTHS: PostLength[] = ["short", "medium", "long"];

interface PostState {
  postText: string;
  hashtags: string;
  tone: Tone;
  length: PostLength;
  refine: string;
}

function emptyPostState(): PostState {
  return { postText: "", hashtags: "", tone: "neutral", length: "medium", refine: "" };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function PlatformIcon({ platform }: { platform: Platform }) {
  const { shortLabel, iconBg } = PLATFORMS[platform];
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold shrink-0",
        iconBg,
      )}
    >
      {shortLabel}
    </span>
  );
}

function PillButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "text-xs px-2.5 py-1 rounded-full border transition-colors",
        active
          ? "bg-foreground text-background border-foreground"
          : "border-border text-muted-foreground hover:border-foreground hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

function TabWorkspace({
  platform,
  state,
  onChange,
}: {
  platform: Platform;
  state: PostState;
  onChange: (updates: Partial<PostState>) => void;
}) {
  const { charLimit, shortLabel, openUrl } = PLATFORMS[platform];
  const charCount = state.postText.length;
  const overLimit = charCount > charLimit;

  function handleCopy() {
    const content = [state.postText, state.hashtags].filter(Boolean).join("\n");
    navigator.clipboard.writeText(content);
    toast.success("Copied to clipboard");
  }

  function handleOpen() {
    const fullText = [state.postText, state.hashtags].filter(Boolean).join("\n");
    window.open(openUrl(fullText), "_blank");
  }

  return (
    <div className="pt-6 space-y-6">
      {/* Two-column editor / preview */}
      <div className="grid grid-cols-2 gap-8">
        {/* Left: post editor */}
        <div className="space-y-5">
          {/* Post text */}
          <div className="space-y-2">
            <Label>Post text</Label>
            <Textarea
              value={state.postText}
              onChange={(e) => onChange({ postText: e.target.value })}
              rows={7}
              className="resize-none"
              placeholder="Write your post here…"
            />
            <p
              className={cn(
                "text-xs tabular-nums",
                overLimit ? "text-destructive font-medium" : "text-muted-foreground",
              )}
            >
              {charCount.toLocaleString()} / {charLimit.toLocaleString()} characters
            </p>
          </div>

          {/* Hashtags */}
          <div className="space-y-2">
            <Label>Hashtags</Label>
            <Input
              value={state.hashtags}
              onChange={(e) => onChange({ hashtags: e.target.value })}
              placeholder="Add hashtags..."
            />
          </div>

          {/* Image */}
          <div className="space-y-2">
            <Label>Image</Label>
            <div className="rounded-lg border border-dashed border-border bg-muted/30 flex items-center justify-center h-32">
              <p className="text-sm text-muted-foreground">No image yet</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="flex-1">
                Upload image
              </Button>
              <Button variant="outline" size="sm" className="flex-1">
                Generate with AI
              </Button>
            </div>
          </div>

          {/* Regenerate with */}
          <div className="space-y-3">
            <Label>Regenerate with</Label>
            <div className="space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-muted-foreground w-12 shrink-0">tone</span>
                {TONES.map((t) => (
                  <PillButton key={t} active={state.tone === t} onClick={() => onChange({ tone: t })}>
                    {t}
                  </PillButton>
                ))}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-muted-foreground w-12 shrink-0">length</span>
                {LENGTHS.map((l) => (
                  <PillButton key={l} active={state.length === l} onClick={() => onChange({ length: l })}>
                    {l}
                  </PillButton>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground w-12 shrink-0">refine</span>
                <Input
                  value={state.refine}
                  onChange={(e) => onChange({ refine: e.target.value })}
                  placeholder="emphasise a specific point..."
                  className="flex-1 text-sm"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right: preview placeholder */}
        <div className="space-y-3">
          <Label>Preview · {shortLabel}</Label>
          <div className="rounded-xl border border-dashed border-border bg-muted/30 overflow-hidden">
            <div className="aspect-video bg-muted flex items-center justify-center border-b border-dashed border-border">
              <span className="text-xs text-muted-foreground font-mono">HERO</span>
            </div>
            <div className="flex items-center justify-center h-32">
              <p className="text-sm text-muted-foreground">Preview will appear here</p>
            </div>
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-2 pt-2">
        <Button size="sm" className="gap-1.5">
          <RefreshCw className="size-3" />
          regenerate
        </Button>
        <Button variant="outline" size="sm" onClick={handleCopy} className="gap-1.5">
          <Copy className="size-3" />
          copy
        </Button>
        <Button variant="outline" size="sm" onClick={handleOpen} className="gap-1.5">
          <ExternalLink className="size-3" />
          open in {shortLabel}
        </Button>
        <Button variant="outline" size="sm" className="gap-1.5 ml-auto">
          <Check className="size-3" />
          mark posted
        </Button>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

function SocialWorkspacePage() {
  const { articleId } = Route.useParams();
  const [activeTab, setActiveTab] = useState<Platform>("twitter");
  const [postStates, setPostStates] = useState<Record<Platform, PostState>>({
    twitter: emptyPostState(),
    instagram: emptyPostState(),
    facebook: emptyPostState(),
    telegram: emptyPostState(),
  });

  const { data: article, isLoading } = useQuery({
    queryKey: ["article", articleId],
    queryFn: () => getArticle(articleId),
  });

  function updatePost(platform: Platform, updates: Partial<PostState>) {
    setPostStates((prev) => ({
      ...prev,
      [platform]: { ...prev[platform], ...updates },
    }));
  }

  // Parse article metadata from the task result JSON
  let articleTitle = "";
  let articleDate = "";
  let articleWordCount = 0;
  let articleType = "Article";

  if (article) {
    try {
      const result = JSON.parse(article.result ?? "{}");
      articleTitle = result.title ?? "Untitled";
      articleWordCount = result.body
        ? result.body.split(/\s+/).filter(Boolean).length
        : 0;
      articleType = article.type === "edit_article" ? "Edited" : "Policy";
    } catch {
      articleTitle = "Untitled";
    }
    if (article.completed_at) {
      articleDate = formatDate(article.completed_at);
    }
  }

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <div className="h-5 bg-muted animate-pulse rounded w-1/4" />
        <div className="h-20 bg-muted animate-pulse rounded" />
        <div className="h-48 bg-muted animate-pulse rounded" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Page header */}
      <div className="flex items-start justify-between">
        <h1 className="text-2xl font-bold">Social Media</h1>
        <Link to="/social">
          <Button variant="outline" size="sm">
            change article ⇄
          </Button>
        </Link>
      </div>

      {/* Article info card */}
      <div className="flex items-center gap-4 p-4 border border-border rounded-lg">
        <div className="w-16 h-16 bg-muted rounded-md border border-dashed border-muted-foreground/30 flex items-center justify-center shrink-0">
          <span className="text-[10px] text-muted-foreground font-mono">HERO</span>
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="font-semibold text-sm leading-snug truncate">
            {articleTitle}
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            {articleType}
            {articleDate ? ` · ${articleDate}` : ""}
            {articleWordCount > 0 ? ` · ${articleWordCount} w` : ""}
          </p>
        </div>
        <Button size="sm" variant="outline" className="gap-1.5 shrink-0">
          <Sparkles className="size-3" />
          Generate Posts
        </Button>
      </div>

      {/* Platform tabs */}
      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as Platform)}
      >
        <TabsList
          variant="line"
          className="w-full justify-start border-b border-border rounded-none h-auto pb-0 bg-transparent"
        >
          {PLATFORM_ORDER.map((p) => (
            <TabsTrigger key={p} value={p} className="gap-2 pb-3 px-3">
              <PlatformIcon platform={p} />
              <span>{PLATFORMS[p].label}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        {PLATFORM_ORDER.map((p) => (
          <TabsContent key={p} value={p}>
            <TabWorkspace
              platform={p}
              state={postStates[p]}
              onChange={(updates) => updatePost(p, updates)}
            />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
