import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useProfile } from "./useProfile";
import { toast } from "sonner";

export function useAvatarUpload() {
  const { user } = useAuth();
  const { updateProfile } = useProfile();
  const [isUploading, setIsUploading] = useState(false);

  const uploadAvatar = async (file: File): Promise<string | null> => {
    if (!user) {
      toast.error("You must be logged in to upload an avatar");
      return null;
    }

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return null;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be less than 5MB");
      return null;
    }

    setIsUploading(true);

    try {
      // Generate a unique file name
      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}/avatar-${Date.now()}.${fileExt}`;

      // Upload the file
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(fileName, file, {
          cacheControl: "3600",
          upsert: true,
        });

      if (uploadError) {
        console.error("Upload error:", uploadError);
        throw uploadError;
      }

      // Get the public URL
      const { data: urlData } = supabase.storage
        .from("avatars")
        .getPublicUrl(uploadData.path);

      const avatarUrl = urlData.publicUrl;

      // Update the profile with the new avatar URL
      await updateProfile({ avatar_url: avatarUrl });

      toast.success("Profile picture updated");
      return avatarUrl;
    } catch (error) {
      console.error("Error uploading avatar:", error);
      toast.error("Failed to upload profile picture");
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  const removeAvatar = async (): Promise<boolean> => {
    if (!user) return false;

    setIsUploading(true);

    try {
      // Update profile to remove avatar URL
      await updateProfile({ avatar_url: null });
      toast.success("Profile picture removed");
      return true;
    } catch (error) {
      console.error("Error removing avatar:", error);
      toast.error("Failed to remove profile picture");
      return false;
    } finally {
      setIsUploading(false);
    }
  };

  return {
    uploadAvatar,
    removeAvatar,
    isUploading,
  };
}
