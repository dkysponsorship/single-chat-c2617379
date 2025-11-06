import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Plus, Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { createStory } from "@/services/stories";
interface CreateStoryDialogProps {
  userId: string;
  onStoryCreated?: () => void;
}
export const CreateStoryDialog = ({
  userId,
  onStoryCreated
}: CreateStoryDialogProps) => {
  const [open, setOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const {
    toast
  } = useToast();
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please select a file smaller than 10MB",
        variant: "destructive"
      });
      return;
    }

    // Check file type
    if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
      toast({
        title: "Invalid file type",
        description: "Please select an image or video file",
        variant: "destructive"
      });
      return;
    }
    setSelectedFile(file);
    setPreview(URL.createObjectURL(file));
  };
  const handleSubmit = async () => {
    if (!selectedFile) return;
    setIsSubmitting(true);
    const mediaType = selectedFile.type.startsWith('image/') ? 'image' : 'video';
    const story = await createStory(userId, selectedFile, mediaType);
    if (story) {
      toast({
        title: "Story created!"
      });
      setOpen(false);
      setSelectedFile(null);
      setPreview("");
      onStoryCreated?.();
    } else {
      toast({
        title: "Failed to create story",
        variant: "destructive"
      });
    }
    setIsSubmitting(false);
  };
  return <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-2 bg-sky-800 hover:bg-sky-700 text-base">
          <Plus className="w-4 h-4" />
          Story
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Story</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {!preview ? <label className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
              <Upload className="w-12 h-12 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">Click to upload photo or video</p>
              <p className="text-xs text-muted-foreground mt-1">Max 10MB</p>
              <input type="file" accept="image/*,video/*" onChange={handleFileSelect} className="hidden" />
            </label> : <div className="relative aspect-[9/16] max-h-96 bg-black rounded-lg overflow-hidden">
              {selectedFile?.type.startsWith('image/') ? <img src={preview} alt="Preview" className="w-full h-full object-contain" /> : <video src={preview} className="w-full h-full object-contain" controls />}
            </div>}

          <div className="flex gap-2">
            {preview && <Button variant="outline" onClick={() => {
            setSelectedFile(null);
            setPreview("");
          }} className="flex-1">
                Change
              </Button>}
            <Button onClick={handleSubmit} disabled={!selectedFile || isSubmitting} className="flex-1">
              {isSubmitting ? "Posting..." : "Post Story"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>;
};