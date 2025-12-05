import { Dialog, DialogContent } from "@/components/ui/dialog";
import { X, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface ImageViewerProps {
  imageUrl: string | null;
  onClose: () => void;
}

export const ImageViewer = ({ imageUrl, onClose }: ImageViewerProps) => {
  const { toast } = useToast();

  const handleDownload = async () => {
    if (!imageUrl) return;

    try {
      // Fetch the image as a blob
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      
      // Create a download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      // Extract filename from URL or generate one
      const urlParts = imageUrl.split('/');
      const filename = urlParts[urlParts.length - 1] || `image_${Date.now()}.jpg`;
      link.download = filename;
      
      // Trigger download
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up the blob URL
      window.URL.revokeObjectURL(url);

      toast({
        title: "Download Started",
        description: "Image is being saved to your device.",
      });
    } catch (error) {
      console.error('Download error:', error);
      toast({
        title: "Download Failed",
        description: "Could not download the image. Try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={!!imageUrl} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 bg-black/95 border-none">
        <div className="absolute top-4 right-4 z-50 flex gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/20"
            onClick={handleDownload}
          >
            <Download className="w-6 h-6" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/20"
            onClick={onClose}
          >
            <X className="w-6 h-6" />
          </Button>
        </div>
        {imageUrl && (
          <img
            src={imageUrl}
            alt="Full size"
            className="w-full h-full object-contain"
            onClick={onClose}
          />
        )}
      </DialogContent>
    </Dialog>
  );
};
