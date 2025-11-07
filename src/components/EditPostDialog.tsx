import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { updatePost } from "@/services/posts";

interface EditPostDialogProps {
  postId: string;
  currentCaption: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPostUpdated?: () => void;
}

export const EditPostDialog = ({
  postId,
  currentCaption,
  open,
  onOpenChange,
  onPostUpdated
}: EditPostDialogProps) => {
  const [caption, setCaption] = useState(currentCaption);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (!caption.trim()) {
      toast({
        title: "Caption cannot be empty",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);
    const success = await updatePost(postId, caption);
    
    if (success) {
      toast({
        title: "Post updated successfully!"
      });
      onOpenChange(false);
      onPostUpdated?.();
    } else {
      toast({
        title: "Failed to update post",
        variant: "destructive"
      });
    }
    setIsSubmitting(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Post</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="caption">Caption</Label>
            <Textarea
              id="caption"
              placeholder="Update your caption..."
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              className="min-h-[100px]"
            />
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex-1"
            >
              {isSubmitting ? "Saving..." : "Save Changes"}
            </Button>
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
