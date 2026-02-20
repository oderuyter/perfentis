import { useState } from "react";
import { motion } from "framer-motion";
import { Plus, Globe, Building2, Flag, Footprints, RefreshCw } from "lucide-react";
import { useSocialFeed, useSocialStories, useUserCommunities, type ScopeType } from "@/hooks/useSocial";
import { useAuth } from "@/hooks/useAuth";
import { StoriesRow } from "@/components/social/StoriesRow";
import { PostCard } from "@/components/social/PostCard";
import { CreatePostSheet } from "@/components/social/CreatePostSheet";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type FeedScope = {
  type: ScopeType;
  id?: string;
  label: string;
  icon: React.ElementType;
};

export default function Social() {
  const { user } = useAuth();
  const [showCreate, setShowCreate] = useState(false);
  const [activeScope, setActiveScope] = useState<FeedScope>({
    type: "public",
    label: "Public",
    icon: Globe,
  });

  const { data: communities, isLoading: commLoading } = useUserCommunities();

  const feedFilter = {
    scopeType: activeScope.type,
    scopeId: activeScope.id,
  };

  const { data: posts = [], isLoading: postsLoading, refetch } = useSocialFeed(feedFilter);
  const { data: stories = [] } = useSocialStories(feedFilter);

  const scopes: FeedScope[] = [
    { type: "public", label: "Public", icon: Globe },
    ...(communities?.gyms || []).map((g) => ({
      type: "gym" as ScopeType,
      id: String(g.id || ""),
      label: String(g.name || "Gym"),
      icon: Building2,
    })),
    ...(communities?.events || []).map((e) => ({
      type: "event" as ScopeType,
      id: String(e.id || ""),
      label: String(e.name || "Event"),
      icon: Flag,
    })),
    ...(communities?.runClubs || []).map((rc) => ({
      type: "run_club" as ScopeType,
      id: String(rc.id || ""),
      label: String(rc.name || "Run Club"),
      icon: Footprints,
    })),
  ];

  const isLoading = postsLoading || (commLoading && scopes.length <= 1);

  return (
    <div className="min-h-screen pt-safe pb-24">
      {/* Header */}
      <header className="pt-6 pb-3 px-4 flex items-center justify-between">
        <div>
          <motion.h1
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-2xl font-semibold tracking-tight"
          >
            Community
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="text-muted-foreground text-sm mt-0.5"
          >
            {activeScope.label} feed
          </motion.p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => refetch()}
            className="h-9 w-9 rounded-full bg-muted flex items-center justify-center text-muted-foreground"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            onClick={() => setShowCreate(true)}
            className="h-9 w-9 rounded-full bg-primary flex items-center justify-center text-primary-foreground shadow-md"
          >
            <Plus className="h-5 w-5" />
          </motion.button>
        </div>
      </header>

      {/* Feed scope selector */}
      {scopes.length > 1 && (
        <div className="flex gap-2 overflow-x-auto px-4 pb-3 no-scrollbar">
          {scopes.map((scope) => {
            const Icon = scope.icon;
            const isActive = activeScope.type === scope.type && activeScope.id === scope.id;
            return (
              <button
                key={`${scope.type}-${scope.id || "public"}`}
                onClick={() => setActiveScope(scope)}
                className={cn(
                  "flex items-center gap-1.5 shrink-0 rounded-full px-3 py-1.5 border text-sm transition-all",
                  isActive
                    ? "bg-primary border-primary text-primary-foreground shadow-sm"
                    : "border-border bg-muted/30 text-muted-foreground hover:text-foreground hover:border-muted-foreground"
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                <span className="max-w-[100px] truncate">{scope.label}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Stories */}
      {(stories.length > 0 || user) && (
        <div className="mb-2">
          <StoriesRow
            stories={stories}
            scopeType={activeScope.type}
            scopeId={activeScope.id}
          />
        </div>
      )}

      {/* Feed */}
      <div className="px-4 space-y-3">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-card rounded-xl border border-border/50 p-4 animate-pulse">
              <div className="flex items-center gap-3 mb-3">
                <div className="h-10 w-10 rounded-full bg-muted" />
                <div className="space-y-1.5 flex-1">
                  <div className="h-3 bg-muted rounded w-1/4" />
                  <div className="h-2.5 bg-muted rounded w-1/6" />
                </div>
              </div>
              <div className="space-y-1.5">
                <div className="h-3 bg-muted rounded w-full" />
                <div className="h-3 bg-muted rounded w-3/4" />
              </div>
            </div>
          ))
        ) : posts.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card rounded-xl border border-border/50 p-8 text-center"
          >
            <Globe className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="font-medium text-sm">No posts yet</p>
            <p className="text-xs text-muted-foreground mt-1 mb-4">
              Be the first to share something with {activeScope.label}
            </p>
            <button
              onClick={() => setShowCreate(true)}
              className="text-sm text-primary font-medium"
            >
              Create a post →
            </button>
          </motion.div>
        ) : (
          posts.map((post, idx) => (
            <motion.div
              key={post.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.03 }}
            >
              <PostCard
                post={post}
                showScopeBadge={activeScope.type === "public"}
              />
            </motion.div>
          ))
        )}
      </div>

      {/* Create post sheet */}
      <CreatePostSheet
        open={showCreate}
        onClose={() => setShowCreate(false)}
        defaultScopeType={activeScope.type}
        defaultScopeId={activeScope.id}
      />
    </div>
  );
}
