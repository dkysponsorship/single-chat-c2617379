import { MapPin } from "lucide-react";

interface LocationMessageProps {
  lat: number;
  lng: number;
  address?: string;
  isOwn: boolean;
}

export const LocationMessage = ({ lat, lng, address, isOwn }: LocationMessageProps) => {
  const googleMapsUrl = `https://www.google.com/maps?q=${lat},${lng}`;
  const staticMapUrl = `https://tile.openstreetmap.org/${Math.min(15, Math.max(0, 15))}/${Math.floor(((lng + 180) / 360) * Math.pow(2, 15))}/${Math.floor(
    ((1 - Math.log(Math.tan((lat * Math.PI) / 180) + 1 / Math.cos((lat * Math.PI) / 180)) / Math.PI) / 2) * Math.pow(2, 15)
  )}.png`;

  return (
    <a
      href={googleMapsUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="block rounded-lg overflow-hidden max-w-[250px] hover:opacity-90 transition-opacity"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Map Preview */}
      <div className="relative w-full h-[120px] bg-muted">
        <img
          src={staticMapUrl}
          alt="Location"
          className="w-full h-full object-cover"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = "none";
          }}
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="bg-destructive rounded-full p-2 shadow-lg">
            <MapPin className="w-5 h-5 text-white" />
          </div>
        </div>
      </div>
      
      {/* Address */}
      <div className={`px-2 py-1.5 text-xs ${isOwn ? "text-white/80" : "text-muted-foreground"}`}>
        <div className="flex items-center gap-1">
          <MapPin className="w-3 h-3 flex-shrink-0" />
          <span className="truncate">{address || `${lat.toFixed(4)}, ${lng.toFixed(4)}`}</span>
        </div>
        <p className={`text-[10px] mt-0.5 ${isOwn ? "text-white/50" : "text-muted-foreground/60"}`}>
          Tap to open in Maps
        </p>
      </div>
    </a>
  );
};
