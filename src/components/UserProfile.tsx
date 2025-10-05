import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Label } from "@/components/ui/label";
import { User, Settings, Camera, Upload } from "lucide-react";
import { getCurrentUser, updateUserProfile, uploadAvatar } from "@/services/supabase";
import { User as UserType } from "@/types/user";
import { useToast } from "@/hooks/use-toast";
import { ImageCropper } from "@/components/ImageCropper";

export const UserProfile = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<UserType | null>(null);
  const [formData, setFormData] = useState({
    displayName: "",
    username: "",
    email: "",
    bio: ""
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isCropperOpen, setIsCropperOpen] = useState(false);
  const [croppedBlob, setCroppedBlob] = useState<Blob | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    const fetchUser = async () => {
      const user = await getCurrentUser();
      if (user) {
        setCurrentUser(user);
        setFormData({
          displayName: user.displayName || "",
          username: user.username || "",
          email: user.email || "",
          bio: user.bio || ""
        });
        setPreviewUrl(user.avatar || null);
      }
    };
    
    if (isOpen) {
      fetchUser();
    } else {
      setSelectedFile(null);
      setPreviewUrl(null);
      setCroppedBlob(null);
      setIsCropperOpen(false);
    }
  }, [isOpen]);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please select an image under 5MB",
          variant: "destructive",
        });
        return;
      }
      
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Invalid file type",
          description: "Please select an image file",
          variant: "destructive",
        });
        return;
      }
      
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
        setIsCropperOpen(true);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCropComplete = (blob: Blob) => {
    setCroppedBlob(blob);
    const url = URL.createObjectURL(blob);
    setPreviewUrl(url);
    setIsCropperOpen(false);
  };

  const handleSave = async () => {
    if (currentUser) {
      setIsUploading(true);
      
      let avatarUrl = currentUser.avatar;
      
      // Upload avatar if a cropped image exists
      if (croppedBlob) {
        const file = new File([croppedBlob], selectedFile?.name || "avatar.jpg", { type: "image/jpeg" });
        const uploadedUrl = await uploadAvatar(currentUser.id, file);
        if (uploadedUrl) {
          avatarUrl = uploadedUrl;
        } else {
          toast({
            title: "Upload failed",
            description: "Failed to upload avatar. Please try again.",
            variant: "destructive",
          });
          setIsUploading(false);
          return;
        }
      }
      
      const updatedUser = {
        ...currentUser,
        ...formData,
        avatar: avatarUrl
      };
      
      // Update profile in Supabase
      const success = await updateUserProfile(currentUser.id, updatedUser);
      
      setIsUploading(false);
      
      if (success) {
        // Update sessionStorage for immediate UI update
        sessionStorage.setItem("currentUser", JSON.stringify(updatedUser));
        setCurrentUser(updatedUser);
        
        toast({
          title: "Profile updated!",
          description: "Your profile has been updated successfully.",
        });
        
        // Trigger a page refresh to update all components with new user data
        window.location.reload();
      } else {
        toast({
          title: "Update failed",
          description: "Failed to update profile. Please try again.",
          variant: "destructive",
        });
      }
    }
    
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2">
          <Settings className="w-4 h-4" />
          <span className="hidden sm:inline">Profile</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Profile Settings
          </DialogTitle>
        </DialogHeader>
        {!currentUser ? (
          <div className="py-8 text-center text-muted-foreground">Loading...</div>
        ) : (
          <div className="space-y-4">
            {/* Avatar Section */}
            <div className="flex items-center gap-4">
              <div className="relative">
                <Avatar className="w-20 h-20">
                  <AvatarImage src={previewUrl || currentUser.avatar} className="object-cover" />
                  <AvatarFallback className="bg-primary/20 text-primary text-lg">
                    {currentUser.displayName ? currentUser.displayName.slice(0, 2).toUpperCase() : "U"}
                  </AvatarFallback>
                </Avatar>
                <Button
                  type="button"
                  size="icon"
                  variant="secondary"
                  className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Camera className="h-4 w-4" />
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileSelect}
                />
              </div>
              <div className="flex-1">
                <p className="font-medium">{currentUser.displayName || 'Unknown User'}</p>
                <p className="text-sm text-muted-foreground">@{currentUser.username || 'unknown'}</p>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="mt-1 h-7 text-xs"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-3 w-3 mr-1" />
                  Change Photo
                </Button>
              </div>
            </div>

            <ImageCropper
              imageSrc={previewUrl || ""}
              isOpen={isCropperOpen}
              onCropComplete={handleCropComplete}
              onCancel={() => setIsCropperOpen(false)}
            />

          {/* Form Fields */}
          <div className="space-y-3">
            <div>
              <Label htmlFor="displayName">Display Name</Label>
              <Input
                id="displayName"
                value={formData.displayName}
                onChange={(e) => setFormData(prev => ({ ...prev, displayName: e.target.value }))}
                placeholder="Your display name"
              />
            </div>

            <div>
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                value={formData.username}
                onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                placeholder="Your username"
              />
            </div>

            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                placeholder="your.email@example.com"
              />
            </div>

            <div>
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                value={formData.bio}
                onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
                placeholder="Tell us about yourself..."
                rows={3}
              />
            </div>
          </div>

            {/* Action Buttons */}
            <div className="flex gap-2 pt-4">
              <Button onClick={handleSave} className="flex-1" disabled={isUploading}>
                {isUploading ? "Uploading..." : "Save Changes"}
              </Button>
              <Button variant="outline" onClick={() => setIsOpen(false)} disabled={isUploading}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};