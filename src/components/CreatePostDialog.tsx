import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PlusCircle, Image as ImageIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { createPost } from "@/services/posts";
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
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
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
        <Button className="gap-2 bg-sky-800 hover:bg-sky-700">
          <PlusCircle className="w-4 h-4" />
          Create Post
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
    </Dialog>;
};