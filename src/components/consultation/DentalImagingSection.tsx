import { useState, useEffect, useRef, useCallback } from 'react';
import type { DragEvent, FormEvent } from 'react';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import type { DentalImage, DentalImageType } from '../../types/domain';
import { DentalImageViewerModal } from './DentalImageViewerModal';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../ui/dialog';
import {
  Upload,
  Eye,
  Trash2,
  Calendar,
  Layers,
  Image as ImageIcon,
  AlertCircle,
  Loader2,
  CheckCircle2,
  Plus
} from 'lucide-react';
import toast from 'react-hot-toast';

interface DentalImagingSectionProps {
  patientId: string;
  currentVisitId?: string;
  activeToothNumber?: number | null;
  initialImages?: DentalImage[];
  onImagesChange?: (images: DentalImage[]) => void;
  onRegisterRollback?: (rollbackFn: () => Promise<void>) => void;
  onRegisterCommit?: (commitFn: () => void) => void;
}

const ALL_FDI_TEETH = [
  // Upper Right (18..11)
  18, 17, 16, 15, 14, 13, 12, 11,
  // Upper Left (21..28)
  21, 22, 23, 24, 25, 26, 27, 28,
  // Lower Right (48..41)
  48, 47, 46, 45, 44, 43, 42, 41,
  // Lower Left (31..38)
  31, 32, 33, 34, 35, 36, 37, 38
];

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

export function DentalImagingSection({
  patientId,
  currentVisitId,
  activeToothNumber,
  initialImages,
  onImagesChange,
  onRegisterRollback,
  onRegisterCommit
}: DentalImagingSectionProps) {
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<DentalImageType>('OPG');
  const [images, setImages] = useState<DentalImage[]>(initialImages || []);
  const [loading, setLoading] = useState(false);

  // Session tracking to ensure uploaded images are rolled back if closed without "Done"
  const sessionUploadedImageIds = useRef<string[]>([]);
  const isConfirmed = useRef<boolean>(false);

  const rollback = useCallback(async () => {
    if (sessionUploadedImageIds.current.length > 0) {
      const idsToDelete = [...sessionUploadedImageIds.current];
      sessionUploadedImageIds.current = [];
      try {
        await Promise.all(
          idsToDelete.map((id) =>
            api.delete(`/api/patients/${patientId}/dental-images/${id}`)
          )
        );
      } catch (err) {
        console.error('Failed to rollback dental images:', err);
      }
      setImages((prev) => {
        const next = prev.filter((img) => !idsToDelete.includes(img.id));
        onImagesChange?.(next);
        return next;
      });
    }
  }, [patientId, onImagesChange]);

  const commit = useCallback(() => {
    isConfirmed.current = true;
    sessionUploadedImageIds.current = [];
  }, []);

  useEffect(() => {
    onRegisterRollback?.(rollback);
  }, [onRegisterRollback, rollback]);

  useEffect(() => {
    onRegisterCommit?.(commit);
  }, [onRegisterCommit, commit]);

  useEffect(() => {
    return () => {
      if (!isConfirmed.current && sessionUploadedImageIds.current.length > 0) {
        rollback();
      }
    };
  }, [rollback]);

  // Upload Form State
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileBase64, setFileBase64] = useState<string | null>(null);
  const [imageTitle, setImageTitle] = useState('');
  const [imageNotes, setImageNotes] = useState('');
  const [selectedTooth, setSelectedTooth] = useState<string>(
    activeToothNumber ? String(activeToothNumber) : 'none'
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Full-size lightbox viewer
  const [viewerImage, setViewerImage] = useState<DentalImage | null>(null);

  // Delete modal state
  const [imageToDelete, setImageToDelete] = useState<DentalImage | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Permissions
  const canUpload =
    currentUser?.role === 'Head Doctor' ||
    currentUser?.role === 'Duty Doctor' ||
    (currentUser?.role as string) === 'Admin';

  const canDelete =
    currentUser?.role === 'Head Doctor' ||
    currentUser?.role === 'Duty Doctor' ||
    (currentUser?.role as string) === 'Admin';

  // Load existing images
  const loadImages = async () => {
    try {
      setLoading(true);
      const res = await api.get<DentalImage[]>(`/api/patients/${patientId}/dental-images`);
      const imgList = Array.isArray(res) ? res : [];
      setImages(imgList);
      onImagesChange?.(imgList);
    } catch (err: any) {
      console.error('Failed to load dental images:', err);
      toast.error('Failed to load dental imaging records');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (patientId) {
      loadImages();
    }
  }, [patientId]);

  // Sync activeToothNumber if doctor selects a tooth in FDI chart
  useEffect(() => {
    if (activeToothNumber && activeTab === 'RVG') {
      setSelectedTooth(String(activeToothNumber));
    }
  }, [activeToothNumber, activeTab]);

  // Handle file selection
  const handleFileChange = (file: File) => {
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      toast.error('Invalid format. Please upload JPEG, PNG, or WEBP images only.');
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      toast.error('File size exceeds the 10 MB maximum limit.');
      return;
    }

    setSelectedFile(file);
    if (!imageTitle) {
      const cleanName = file.name.replace(/\.[^/.]+$/, '');
      setImageTitle(cleanName);
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      setFileBase64(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const resetUploadForm = () => {
    setSelectedFile(null);
    setFileBase64(null);
    setImageTitle('');
    setImageNotes('');
    setSelectedTooth(activeToothNumber ? String(activeToothNumber) : 'none');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Submit Image Upload
  const handleUpload = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedFile || !fileBase64) {
      toast.error('Please select an image file to upload.');
      return;
    }

    let toothNum: number | null = null;
    if (activeTab === 'RVG' && selectedTooth !== 'none') {
      toothNum = parseInt(selectedTooth, 10);
    }

    setIsUploading(true);
    try {
      const payload = {
        type: activeTab,
        fileName: selectedFile.name,
        mimeType: selectedFile.type,
        fileSize: selectedFile.size,
        imageUrl: fileBase64,
        toothNumber: toothNum,
        visitId: currentVisitId || null,
        title: imageTitle.trim() || undefined,
        notes: imageNotes.trim() || undefined
      };

      const created = await api.post<DentalImage>(
        `/api/patients/${patientId}/dental-images`,
        payload
      );
      sessionUploadedImageIds.current.push(created.id);

      toast.success(`${activeTab} image uploaded successfully!`);
      const nextImages = [created, ...images];
      setImages(nextImages);
      onImagesChange?.(nextImages);
      resetUploadForm();
    } catch (err: any) {
      console.error('Upload failed:', err);
      toast.error(err.message || 'Failed to upload image.');
    } finally {
      setIsUploading(false);
    }
  };

  // Delete Image
  const confirmDelete = async () => {
    if (!imageToDelete) return;

    setIsDeleting(true);
    try {
      await api.delete(
        `/api/patients/${patientId}/dental-images/${imageToDelete.id}`
      );
      sessionUploadedImageIds.current = sessionUploadedImageIds.current.filter((id) => id !== imageToDelete.id);
      toast.success('Dental image deleted');
      const nextImages = images.filter((img) => img.id !== imageToDelete.id);
      setImages(nextImages);
      onImagesChange?.(nextImages);
      setImageToDelete(null);
    } catch (err: any) {
      console.error('Failed to delete image:', err);
      toast.error(err.message || 'Failed to delete image');
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredImages = images.filter((img) => img.type === activeTab);
  const opgCount = images.filter((img) => img.type === 'OPG').length;
  const rvgCount = images.filter((img) => img.type === 'RVG').length;

  return (
    <div className="space-y-3 sm:space-y-4 w-full min-w-0 max-w-full overflow-x-hidden">
      {/* Category Tabs Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200 pb-2.5 sm:pb-3 gap-2 w-full min-w-0">
        <div className="grid grid-cols-2 sm:flex sm:items-center gap-1.5 sm:gap-2 w-full sm:w-auto">
          <Button
            type="button"
            variant={activeTab === 'OPG' ? 'default' : 'outline'}
            size="sm"
            onClick={() => {
              setActiveTab('OPG');
              resetUploadForm();
            }}
            className={`h-9 px-2 sm:px-4 font-bold text-xs gap-1.5 sm:gap-2 w-full sm:w-auto justify-center ${
              activeTab === 'OPG'
                ? 'bg-purple-700 hover:bg-purple-800 text-white'
                : 'text-slate-700 bg-white border-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            <span className="hidden sm:inline">OPG (Panoramic X-Rays)</span>
            <span className="sm:hidden">OPG (Panoramic)</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] shrink-0 ${
                activeTab === 'OPG'
                  ? 'bg-purple-900 text-purple-200'
                  : 'bg-slate-100 text-slate-700'
              }`}
            >
              {opgCount}
            </span>
          </Button>

          <Button
            type="button"
            variant={activeTab === 'RVG' ? 'default' : 'outline'}
            size="sm"
            onClick={() => {
              setActiveTab('RVG');
              resetUploadForm();
            }}
            className={`h-9 px-2 sm:px-4 font-bold text-xs gap-1.5 sm:gap-2 w-full sm:w-auto justify-center ${
              activeTab === 'RVG'
                ? 'bg-teal-700 hover:bg-teal-800 text-white'
                : 'text-slate-700 bg-white border-slate-200'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            <span className="hidden sm:inline">RVG (Intraoral Radiographs)</span>
            <span className="sm:hidden">RVG (Intraoral)</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] shrink-0 ${
                activeTab === 'RVG'
                  ? 'bg-teal-900 text-teal-200'
                  : 'bg-slate-100 text-slate-700'
              }`}
            >
              {rvgCount}
            </span>
          </Button>
        </div>

        <div className="text-[11px] sm:text-xs text-slate-500 font-medium shrink-0">
          Supported: <span className="font-semibold text-slate-700">JPEG, PNG, WEBP</span> (Max 10 MB)
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5 items-start w-full min-w-0">
        {/* =================================================================== */}
        {/* LEFT COLUMN: Upload Card (Doctors & Admin)                          */}
        {/* =================================================================== */}
        <div className="lg:col-span-5 w-full min-w-0 bg-white rounded-2xl border border-slate-200/80 p-3.5 sm:p-4 shadow-xs space-y-3 sm:space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Upload className="w-4 h-4 text-sky-600 shrink-0" />
              Upload New {activeTab}
            </h4>
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                activeTab === 'OPG'
                  ? 'bg-purple-100 text-purple-800'
                  : 'bg-teal-100 text-teal-800'
              }`}
            >
              {activeTab === 'OPG' ? 'Full Arch Tomograph' : 'Intraoral Sensor'}
            </span>
          </div>

          {canUpload ? (
            <form onSubmit={handleUpload} className="space-y-3.5">
              {/* Drag & Drop Zone */}
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all ${
                  selectedFile
                    ? 'border-emerald-400 bg-emerald-50/30'
                    : 'border-slate-300 hover:border-sky-400 bg-slate-50/50 hover:bg-sky-50/30'
                }`}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleFileChange(e.target.files[0]);
                    }
                  }}
                  className="hidden"
                />

                {selectedFile ? (
                  <div className="space-y-2">
                    <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
                    <div>
                      <p className="text-xs font-bold text-slate-800 truncate max-w-xs mx-auto">
                        {selectedFile.name}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • Ready to upload
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        resetUploadForm();
                      }}
                      className="text-[11px] text-rose-600 hover:underline font-semibold"
                    >
                      Choose different file
                    </button>
                  </div>
                ) : (
                  <div className="space-y-1.5 py-2">
                    <div className="w-10 h-10 rounded-full bg-sky-100 text-sky-600 flex items-center justify-center mx-auto mb-1">
                      <Plus className="w-5 h-5" />
                    </div>
                    <p className="text-xs font-semibold text-slate-800">
                      Click to browse or drag & drop {activeTab} radiograph
                    </p>
                    <p className="text-[11px] text-slate-400">
                      High-resolution JPEG, PNG, or WEBP up to 10 MB
                    </p>
                  </div>
                )}
              </div>

              {/* RVG Specific: Tooth Association */}
              {activeTab === 'RVG' && (
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-slate-700">
                    FDI Tooth Association (Optional)
                  </Label>
                  <Select
                    value={selectedTooth}
                    onValueChange={(val) => setSelectedTooth(val)}
                  >
                    <SelectTrigger className="h-8 text-xs bg-white border-slate-200">
                      <SelectValue placeholder="Select tooth or general" />
                    </SelectTrigger>
                    <SelectContent className="max-h-56">
                      <SelectItem value="none">
                        No specific tooth (Quadrant / Bite-wing)
                      </SelectItem>
                      <div className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Upper Right (18 - 11)
                      </div>
                      {ALL_FDI_TEETH.slice(0, 8).map((t) => (
                        <SelectItem key={t} value={String(t)}>
                          Tooth {t}
                        </SelectItem>
                      ))}
                      <div className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Upper Left (21 - 28)
                      </div>
                      {ALL_FDI_TEETH.slice(8, 16).map((t) => (
                        <SelectItem key={t} value={String(t)}>
                          Tooth {t}
                        </SelectItem>
                      ))}
                      <div className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Lower Right (48 - 41)
                      </div>
                      {ALL_FDI_TEETH.slice(16, 24).map((t) => (
                        <SelectItem key={t} value={String(t)}>
                          Tooth {t}
                        </SelectItem>
                      ))}
                      <div className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Lower Left (31 - 38)
                      </div>
                      {ALL_FDI_TEETH.slice(24, 32).map((t) => (
                        <SelectItem key={t} value={String(t)}>
                          Tooth {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Title Input */}
              <div className="space-y-1">
                <Label className="text-xs font-bold text-slate-700">Image Title / Label</Label>
                <Input
                  type="text"
                  placeholder={
                    activeTab === 'OPG'
                      ? 'e.g. Initial Panoramic Full Arch Scan'
                      : 'e.g. Pre-op Periapical Tooth 16'
                  }
                  value={imageTitle}
                  onChange={(e) => setImageTitle(e.target.value)}
                  className="h-8 text-xs bg-white border-slate-200"
                />
              </div>

              {/* Clinical Notes Input */}
              <div className="space-y-1">
                <Label className="text-xs font-bold text-slate-700">Diagnostic Clinical Notes</Label>
                <Textarea
                  placeholder="Record radiographic findings, bone loss, radiolucency, periapical lesions..."
                  value={imageNotes}
                  onChange={(e) => setImageNotes(e.target.value)}
                  rows={2}
                  className="text-xs bg-white border-slate-200 resize-none"
                />
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={!selectedFile || isUploading}
                className="w-full h-8 text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />
                    Uploading {activeTab}...
                  </>
                ) : (
                  <>
                    <Upload className="w-3.5 h-3.5 mr-1.5" />
                    Save {activeTab} Image
                  </>
                )}
              </Button>
            </form>
          ) : (
            <div className="py-6 text-center text-xs text-slate-500 bg-slate-50 rounded-xl border border-slate-100">
              <AlertCircle className="w-5 h-5 mx-auto mb-1 text-slate-400" />
              You have read-only access to dental imaging records. Only doctors and administrators may upload new X-rays.
            </div>
          )}
        </div>

        {/* =================================================================== */}
        {/* RIGHT COLUMN: Gallery of Uploaded Images                            */}
        {/* =================================================================== */}
        <div className="lg:col-span-7 w-full min-w-0 space-y-3">
          <div className="flex items-center justify-between pb-1">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <span>{activeTab} Records ({filteredImages.length})</span>
            </h4>
          </div>

          {loading ? (
            <div className="py-12 text-center text-xs text-slate-500 bg-white rounded-2xl border border-slate-200 p-6">
              <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-sky-600" />
              Loading {activeTab} dental radiographs...
            </div>
          ) : filteredImages.length === 0 ? (
            <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-8 text-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
                <ImageIcon className="w-6 h-6" />
              </div>
              <h5 className="text-xs font-bold text-slate-800">
                No {activeTab} images recorded for this patient
              </h5>
              <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                {activeTab === 'OPG'
                  ? 'Upload a panoramic dental tomograph to inspect full-mouth dentition, TMJ, and bone levels.'
                  : 'Upload digital RVG intraoral radiographs to examine periapical structures and root canals.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full min-w-0">
              {filteredImages.map((image) => (
                <div
                  key={image.id}
                  className="bg-white rounded-xl border border-slate-200/90 shadow-xs hover:shadow-md transition-shadow overflow-hidden flex flex-col justify-between group"
                >
                  {/* Thumbnail Container */}
                  <div
                    onClick={() => setViewerImage(image)}
                    className="relative h-40 bg-slate-950 flex items-center justify-center cursor-pointer overflow-hidden group/thumb"
                  >
                    <img
                      src={image.imageUrl}
                      alt={image.title || image.fileName}
                      className="max-h-full max-w-full object-contain group-hover/thumb:scale-105 transition-transform duration-200"
                    />

                    {/* Quick Hover Overlay */}
                    <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover/thumb:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        className="h-8 px-2.5 text-xs font-semibold bg-white/90 text-slate-900 hover:bg-white shadow-md"
                      >
                        <Eye className="w-3.5 h-3.5 mr-1" />
                        Full Size
                      </Button>
                    </div>

                    {/* Category & Tooth Badges */}
                    <div className="absolute top-2 left-2 flex items-center gap-1.5">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-md shadow-xs ${
                          image.type === 'OPG'
                            ? 'bg-purple-900/90 text-purple-200 border border-purple-700/60'
                            : 'bg-teal-900/90 text-teal-200 border border-teal-700/60'
                        }`}
                      >
                        {image.type}
                      </span>

                      {image.toothNumber && (
                        <span className="text-[10px] font-bold bg-sky-950/90 text-sky-300 border border-sky-700/60 px-2 py-0.5 rounded-md shadow-xs">
                          Tooth {image.toothNumber}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Metadata & Actions */}
                  <div className="p-3 space-y-2">
                    <div className="flex items-start justify-between gap-1">
                      <div className="min-w-0">
                        <h5 className="text-xs font-bold text-slate-900 truncate">
                          {image.title || image.fileName}
                        </h5>
                        <p className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                          <Calendar className="w-3 h-3" />
                          {new Date(image.createdAt).toLocaleDateString()}
                        </p>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setViewerImage(image)}
                          className="h-7 w-7 p-0 text-slate-500 hover:text-sky-600 hover:bg-sky-50"
                          title="View Full Size"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </Button>

                        {canDelete && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setImageToDelete(image)}
                            className="h-7 w-7 p-0 text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                            title="Delete Image"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>

                    {image.notes && (
                      <p className="text-[11px] text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-100 line-clamp-2">
                        {image.notes}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Full-Screen Lightbox Viewer */}
      <DentalImageViewerModal
        image={viewerImage}
        isOpen={!!viewerImage}
        onClose={() => setViewerImage(null)}
      />

      {/* Delete Confirmation Modal */}
      <Dialog
        open={!!imageToDelete}
        onOpenChange={(open) => !open && setImageToDelete(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <span className="p-1.5 rounded-full bg-rose-100 text-rose-600">
                <Trash2 className="w-4 h-4" />
              </span>
              Delete Dental Radiograph
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 pt-1">
              Are you sure you want to permanently delete{' '}
              <strong className="text-slate-700">
                {imageToDelete?.title || imageToDelete?.fileName}
              </strong>
              ? This action cannot be undone and will permanently remove this diagnostic record.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isDeleting}
              onClick={() => setImageToDelete(null)}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              disabled={isDeleting}
              onClick={confirmDelete}
              className="text-xs font-bold"
            >
              {isDeleting ? 'Deleting...' : 'Confirm Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
