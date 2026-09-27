import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Button } from '../ui/button';
import type { DentalImage } from '../../types/domain';
import {
  ZoomIn,
  ZoomOut,
  RotateCw,
  Maximize2,
  Calendar,
  HardDrive,
  FileText,
  X,
  Contrast
} from 'lucide-react';

interface DentalImageViewerModalProps {
  image: DentalImage | null;
  isOpen: boolean;
  onClose: () => void;
}

export function DentalImageViewerModal({
  image,
  isOpen,
  onClose
}: DentalImageViewerModalProps) {
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [isInverted, setIsInverted] = useState(false);

  if (!image) return null;

  const handleZoomIn = () => setScale((prev) => Math.min(prev + 0.25, 4));
  const handleZoomOut = () => setScale((prev) => Math.max(prev - 0.25, 0.5));
  const handleResetZoom = () => {
    setScale(1);
    setRotation(0);
    setIsInverted(false);
  };
  const handleRotate = () => setRotation((prev) => (prev + 90) % 360);
  const handleToggleInvert = () => setIsInverted((prev) => !prev);

  const formatFileSize = (bytes: number) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const formattedDate = image.createdAt
    ? new Date(image.createdAt).toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short'
    })
    : '';

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-6xl w-[95vw] h-[92vh] flex flex-col p-0 gap-0 bg-slate-950 text-white border-slate-800 overflow-hidden shadow-2xl rounded-2xl">
        {/* Header Bar */}
        <DialogHeader className="px-5 py-3 bg-slate-900 border-b border-slate-800 flex flex-row items-center justify-between shrink-0 space-y-0">
          <div className="flex items-center gap-3">
            <span
              className={`text-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                image.type === 'OPG'
                  ? 'bg-purple-900/80 text-purple-200 border border-purple-700'
                  : 'bg-emerald-900/80 text-emerald-200 border border-emerald-700'
              }`}
            >
              {image.type}
            </span>

            {image.toothNumber && (
              <span className="text-xs bg-sky-950 text-sky-300 border border-sky-700 px-2 py-0.5 rounded-md font-bold">
                Tooth {image.toothNumber}
              </span>
            )}

            <DialogTitle className="text-sm font-semibold text-slate-200 truncate max-w-xs sm:max-w-md">
              {image.title || image.fileName}
            </DialogTitle>
          </div>

          {/* Quick Toolbar */}
          <div className="flex items-center gap-1.5 mr-6">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleZoomIn}
              className="h-8 w-8 p-0 text-slate-300 hover:text-white hover:bg-slate-800"
              title="Zoom In"
            >
              <ZoomIn className="w-4 h-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleZoomOut}
              className="h-8 w-8 p-0 text-slate-300 hover:text-white hover:bg-slate-800"
              title="Zoom Out"
            >
              <ZoomOut className="w-4 h-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleRotate}
              className="h-8 w-8 p-0 text-slate-300 hover:text-white hover:bg-slate-800"
              title="Rotate 90°"
            >
              <RotateCw className="w-4 h-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleToggleInvert}
              className={`h-8 w-8 p-0 ${
                isInverted
                  ? 'text-amber-400 bg-slate-800'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
              title="Invert Colors (Diagnostic)"
            >
              <Contrast className="w-4 h-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleResetZoom}
              className="h-8 w-8 p-0 text-slate-300 hover:text-white hover:bg-slate-800"
              title="Reset View"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0 text-slate-400 hover:text-rose-400 hover:bg-rose-950/30"
              title="Close (Esc)"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </DialogHeader>

        {/* Viewport Canvas */}
        <div className="flex-1 bg-black overflow-auto flex items-center justify-center p-4 relative select-none">
          <div
            className="transition-transform duration-150 ease-out origin-center flex items-center justify-center"
            style={{
              transform: `scale(${scale}) rotate(${rotation}deg)`
            }}
          >
            <img
              src={image.imageUrl}
              alt={image.title || image.fileName}
              className={`max-w-full max-h-[72vh] object-contain shadow-2xl rounded-sm ${
                isInverted ? 'filter invert' : ''
              }`}
              draggable={false}
            />
          </div>

          {/* Floating Scale Indicator */}
          <div className="absolute bottom-4 left-4 bg-slate-900/80 backdrop-blur-sm px-2.5 py-1 rounded-md text-[11px] font-mono text-slate-300 border border-slate-800 pointer-events-none">
            {Math.round(scale * 100)}% {rotation !== 0 && `• ${rotation}°`} {isInverted && '• Inverted'}
          </div>
        </div>

        {/* Footer Metadata Drawer */}
        <div className="px-5 py-2.5 bg-slate-900 border-t border-slate-800 text-xs text-slate-400 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex flex-wrap items-center gap-4">
            <span className="flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-slate-500" />
              <strong className="text-slate-300">{image.fileName}</strong>
            </span>
            <span className="flex items-center gap-1.5">
              <HardDrive className="w-3.5 h-3.5 text-slate-500" />
              {formatFileSize(image.fileSize)} • {image.mimeType}
            </span>
            <span className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              {formattedDate}
            </span>
          </div>

          {image.notes && (
            <div className="text-slate-300 bg-slate-800/80 px-2.5 py-1 rounded border border-slate-700/60 max-w-md truncate">
              <span className="text-slate-400 font-semibold mr-1.5">Notes:</span>
              {image.notes}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
