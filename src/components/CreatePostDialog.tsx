import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PlusCircle, Image as ImageIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { createPost } from "@/services/posts";
import { PostImageCropper } from "@/components/PostImageCropper";
interface CreatePostDialogProps {
  userId: string;
  onPostCreated?: () => void;
}
export const CreatePostDialog = ({
  userId,
  onPostCreated
}: CreatePostDialogProps) => {
  const [open, setOpen] = useState(false);
  const [caption, setCaption] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCropper, setShowCropper] = useState(false);
  const [originalImageSrc, setOriginalImageSrc] = useState<string | null>(null);
  const {
    toast
  } = useToast();
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please select an image under 5MB",
          variant: "destructive"
        });
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setOriginalImageSrc(reader.result as string);
        setShowCropper(true);
      };
      reader.readAsDataURL(file);
    }
  };
  const handleCropComplete = (croppedBlob: Blob) => {
    // Convert blob to file
    const croppedFile = new File([croppedBlob], "cropped-image.jpg", {
      type: "image/jpeg"
    });
    setImageFile(croppedFile);

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(croppedBlob);
    setShowCropper(false);
    setOriginalImageSrc(null);
  };
  const handleCropCancel = () => {
    setShowCropper(false);
    setOriginalImageSrc(null);
  };
  const handleSubmit = async () => {
    if (!caption.trim() && !imageFile) {
      toast({
        title: "Post is empty",
        description: "Please add a caption or image",
        variant: "destructive"
      });
      return;
    }
    setIsSubmitting(true);
    const post = await createPost(userId, caption, imageFile || undefined);
    if (post) {
      toast({
        title: "Post created successfully!"
      });
      setOpen(false);
      setCaption("");
      setImageFile(null);
      setImagePreview(null);
      onPostCreated?.();
    } else {
      toast({
        title: "Failed to create post",
        variant: "destructive"
      });
    }
    setIsSubmitting(false);
  };
  return <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2 bg-sky-800 hover:bg-sky-700 opacity-90 shadow-none border-2 rounded-sm px-[9px]">
          <PlusCircle className="w-4 h-4" />
           Post
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create New Post</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="caption">Caption</Label>
            <Textarea id="caption" placeholder="What's on your mind?" value={caption} onChange={e => setCaption(e.target.value)} className="min-h-[100px]" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="image">Image</Label>
            <div className="flex items-center gap-2">
              <Input id="image" type="file" accept="image/*" onChange={handleImageSelect} className="hidden" />
              <Label htmlFor="image" className="flex items-center gap-2 cursor-pointer px-4 py-2 border border-border rounded-md hover:bg-accent">
                <ImageIcon className="w-4 h-4" />
                {imageFile ? imageFile.name : "Choose image"}
              </Label>
            </div>

            {imagePreview && <div className="mt-4 relative w-full aspect-square max-h-64 rounded-lg overflow-hidden bg-muted">
                <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                <Button variant="destructive" size="sm" className="absolute top-2 right-2" onClick={() => {
              setImageFile(null);
              setImagePreview(null);
            }}>
                  Remove
                </Button>
              </div>}
          </div>

          <Button onClick={handleSubmit} disabled={isSubmitting} className="w-full">
            {isSubmitting ? "Creating..." : "Create Post"}
          </Button>
        </div>
      </DialogContent>

      {/* Image Cropper */}
      {originalImageSrc && <PostImageCropper imageSrc={originalImageSrc} onCropComplete={handleCropComplete} onCancel={handleCropCancel} isOpen={showCropper} />}
    </Dialog>;
};