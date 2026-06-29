import { useState } from 'react';
import Cropper, { type Area } from 'react-easy-crop';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Slider } from '@/components/ui/slider';

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => res(img);
    img.onerror = rej;
    img.src = src;
  });
}

// Crop the selected area and downscale (longest edge ≤ maxW) → webp blob.
async function cropToWebp(src: string, area: Area, maxW = 1600): Promise<Blob> {
  const img = await loadImage(src);
  const scale = Math.min(1, maxW / area.width);
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(area.width * scale);
  canvas.height = Math.round(area.height * scale);
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, area.x, area.y, area.width, area.height, 0, 0, canvas.width, canvas.height);
  return new Promise((res) => canvas.toBlob((b) => res(b!), 'image/webp', 0.9));
}

export function CropDialog({ src, aspect = 16 / 9, onCancel, onConfirm }: {
  src: string;
  aspect?: number;
  onCancel: () => void;
  onConfirm: (blob: Blob) => void;
}) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [area, setArea] = useState<Area | null>(null);

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onCancel(); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader><DialogTitle>썸네일 자르기</DialogTitle></DialogHeader>
        <div className="relative h-72 w-full overflow-hidden rounded-md bg-black">
          <Cropper
            image={src}
            crop={crop}
            zoom={zoom}
            aspect={aspect}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={(_, px) => setArea(px)}
          />
        </div>
        <div className="flex items-center gap-3">
          <span className="text-muted-foreground text-xs">확대</span>
          <Slider min={1} max={3} step={0.01} value={[zoom]} onValueChange={(v) => setZoom(Array.isArray(v) ? v[0] : v)} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>취소</Button>
          <Button onClick={async () => { if (area) onConfirm(await cropToWebp(src, area)); }}>적용</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
