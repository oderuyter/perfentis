import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Shield, BarChart3, LineChart, Download, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useProfile } from "@/hooks/useProfile";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface PrivacySheetProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PrivacySheet({ isOpen, onClose }: PrivacySheetProps) {
  const { profile, updateProfile } = useProfile();
  const [privacyAnalytics, setPrivacyAnalytics] = useState(true);
  const [privacyInsights, setPrivacyInsights] = useState(true);

  useEffect(() => {
    if (profile) {
      setPrivacyAnalytics(profile.privacy_analytics !== false);
      setPrivacyInsights(profile.privacy_insights !== false);
    }
  }, [profile]);

  const handleAnalyticsToggle = async (value: boolean) => {
    setPrivacyAnalytics(value);
    try {
      await updateProfile({ privacy_analytics: value });
    } catch {
      setPrivacyAnalytics(!value);
      toast.error("Failed to update preference");
    }
  };

  const handleInsightsToggle = async (value: boolean) => {
    setPrivacyInsights(value);
    try {
      await updateProfile({ privacy_insights: value });
    } catch {
      setPrivacyInsights(!value);
      toast.error("Failed to update preference");
    }
  };

  const handleDownloadData = () => {
    toast.info("Data export feature coming soon");
  };

  const handleDeleteAccount = () => {
    toast.info("Please contact support to delete your account");
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            onClick={onClose}
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed inset-x-0 bottom-0 z-50 max-h-[90vh] overflow-hidden rounded-t-2xl bg-background"
          >
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">Privacy & Data</h2>
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="h-5 w-5" />
              </Button>
            </div>
            
            <div className="overflow-y-auto max-h-[calc(90vh-80px)] p-4 pb-24 space-y-6">
              {/* Privacy Toggles */}
              <section className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Shield className="h-4 w-4" />
                  <span>Privacy Settings</span>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between p-4 rounded-xl border">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <BarChart3 className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <div className="font-medium">Anonymised Analytics</div>
                        <div className="text-sm text-muted-foreground">
                          Help improve the app with anonymous usage data
                        </div>
                      </div>
                    </div>
                    <Switch
                      checked={privacyAnalytics}
                      onCheckedChange={handleAnalyticsToggle}
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-xl border">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <LineChart className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <div className="font-medium">Performance Insights</div>
                        <div className="text-sm text-muted-foreground">
                          Receive personalised training insights
                        </div>
                      </div>
                    </div>
                    <Switch
                      checked={privacyInsights}
                      onCheckedChange={handleInsightsToggle}
                    />
                  </div>
                </div>
              </section>

              <Separator />

              {/* Data Actions */}
              <section className="space-y-3">
                <div className="text-sm font-medium text-muted-foreground">
                  Your Data
                </div>

                <div className="space-y-2">
                  <Button
                    variant="outline"
                    className="w-full justify-start h-auto py-4"
                    onClick={handleDownloadData}
                  >
                    <Download className="h-5 w-5 mr-3 text-primary" />
                    <div className="text-left">
                      <div className="font-medium">Download My Data</div>
                      <div className="text-sm text-muted-foreground">
                        Get a copy of all your data
                      </div>
                    </div>
                  </Button>

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start h-auto py-4 border-destructive/30 hover:bg-destructive/5"
                      >
                        <Trash2 className="h-5 w-5 mr-3 text-destructive" />
                        <div className="text-left">
                          <div className="font-medium text-destructive">Delete Account</div>
                          <div className="text-sm text-muted-foreground">
                            Permanently delete your account and data
                          </div>
                        </div>
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Account</AlertDialogTitle>
                        <AlertDialogDescription>
                          This action cannot be undone. This will permanently delete your
                          account and remove all your data from our servers.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleDeleteAccount}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Request Deletion
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </section>

              <p className="text-xs text-muted-foreground text-center">
                Your privacy is important to us. Read our{" "}
                <button className="text-primary underline">Privacy Policy</button> for more details.
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
