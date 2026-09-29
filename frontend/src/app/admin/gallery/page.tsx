'use client';

import React, { useState, useEffect, useRef } from 'react';
import { AdminLayout } from '../../../components/admin/AdminLayout';
import {
  fetchGalleryImages,
  uploadGalleryImage,
  deleteGalleryImage,
  GalleryImage
} from '../../../lib/api';
import {
  Camera,
  UploadCloud,
  Trash2,
  ExternalLink,
  Plus,
  CheckCircle2,
  AlertCircle,
  Image as ImageIcon,
  Sparkles,
  Maximize2,
  X,
  Layers,
  FolderOpen
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

const CATEGORIES = [
  'Scooter Angles',
  'Battery Swap Hubs',
  'Hill Climbs & Roads',
  'Delivery Partners',
  'Fleet Showcase'
];

export default function AdminGalleryPage() {
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState('All');

  // Form state
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [description, setDescription] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Preview Modal
  const [previewModalImage, setPreviewModalImage] = useState<GalleryImage | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadImages();
  }, []);

  const loadImages = async () => {
    setLoading(true);
    try {
      const data = await fetchGalleryImages('All');
      setImages(data);
    } catch (err) {
      console.error('Failed to load gallery images', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setNotification({ type: 'error', message: 'Please select an image file to upload.' });
      return;
    }
    if (!title.trim()) {
      setNotification({ type: 'error', message: 'Please enter a title for this image.' });
      return;
    }

    setUploading(true);
    setNotification(null);

    try {
      const formData = new FormData();
      formData.append('image', selectedFile);
      formData.append('title', title.trim());
      formData.append('category', category);
      formData.append('description', description.trim());

      const res = await uploadGalleryImage(formData);

      if (res.success && res.data) {
        setNotification({ type: 'success', message: 'Image successfully uploaded to fleet gallery!' });
        setTitle('');
        setDescription('');
        setSelectedFile(null);
        setPreviewUrl(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
        setImages(prev => [res.data!, ...prev]);
      } else {
        setNotification({ type: 'error', message: res.message || 'Upload failed. Please check backend server.' });
      }
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || 'Error uploading file' });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: number, imgTitle: string) => {
    if (!confirm(`Are you sure you want to delete "${imgTitle}" from the gallery?`)) return;

    try {
      const res = await deleteGalleryImage(id);
      if (res.success) {
        setNotification({ type: 'success', message: `Image "${imgTitle}" deleted.` });
        setImages(prev => prev.filter(img => img.id !== id));
      } else {
        setNotification({ type: 'error', message: res.message || 'Failed to delete' });
      }
    } catch (err: any) {
      setNotification({ type: 'error', message: 'Error deleting image' });
    }
  };

  const filteredImages = selectedFilter === 'All'
    ? images
    : images.filter(img => img.category === selectedFilter);

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Header Bar */}
        <div className="bg-white rounded-2xl border border-[#E5E7EB] p-6 shadow-[0_2px_12px_rgba(16,24,40,0.03)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 bg-[#EAFBF2] border border-[#00D96B]/30 px-3 py-0.5 rounded-full">
              <Camera className="w-3.5 h-3.5 text-[#00A854]" />
              <span className="text-[10px] font-bold text-[#00A854] tracking-widest uppercase">
                MEDIA &amp; FLEET ASSETS
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-[#111827] tracking-tight">
              Vehicle &amp; Fleet Gallery Manager
            </h2>
            <p className="text-xs sm:text-sm text-[#667085]">
              Upload, tag, and manage high-resolution photography for public website vehicle showcase.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/vehicles#gallery"
              target="_blank"
              className="inline-flex items-center gap-2 bg-white hover:bg-[#F7F9FA] text-[#111827] border border-[#E5E7EB] px-4 py-2.5 rounded-xl text-xs font-bold transition shadow-sm"
            >
              <ExternalLink className="w-4 h-4 text-[#00A854]" />
              <span>View Live Website Gallery</span>
            </Link>
          </div>
        </div>

        {/* Notifications Toast */}
        {notification && (
          <div className={`p-4 rounded-2xl border flex items-center justify-between gap-3 ${
            notification.type === 'success'
              ? 'bg-[#EAFBF2] border-[#00D96B]/40 text-[#00A854]'
              : 'bg-red-50 border-red-200 text-red-700'
          }`}>
            <div className="flex items-center gap-2 text-xs font-bold">
              {notification.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
              <span>{notification.message}</span>
            </div>
            <button
              onClick={() => setNotification(null)}
              className="text-xs underline hover:no-underline font-semibold cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Top Section: Upload New Image Card */}
        <div className="bg-white rounded-2xl border border-[#E5E7EB] p-6 shadow-[0_2px_12px_rgba(16,24,40,0.03)] space-y-5">
          <div className="flex items-center gap-2 pb-3 border-b border-[#E5E7EB]">
            <div className="w-8 h-8 rounded-lg bg-[#EAFBF2] flex items-center justify-center text-[#00A854]">
              <UploadCloud className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#111827]">Upload New Vehicle / Fleet Photo</h3>
              <p className="text-[11px] text-[#667085]">Supports WebP, JPEG, JPG, and PNG images up to 15MB</p>
            </div>
          </div>

          <form onSubmit={handleUploadSubmit} className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left: Drag & Drop Zone */}
              <div className="lg:col-span-5">
                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center min-h-[220px] ${
                    previewUrl
                      ? 'border-[#00D96B] bg-[#EAFBF2]/20'
                      : 'border-[#E5E7EB] hover:border-[#00D96B] bg-[#F7F9FA]'
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />

                  {previewUrl ? (
                    <div className="space-y-3 w-full">
                      <div className="relative w-full h-36 rounded-xl overflow-hidden shadow-sm">
                        <img
                          src={previewUrl}
                          alt="Preview"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <p className="text-[11px] font-bold text-[#00A854]">
                        Click to change selected image ({selectedFile?.name})
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="w-12 h-12 rounded-full bg-[#EAFBF2] text-[#00A854] flex items-center justify-center mx-auto shadow-sm">
                        <UploadCloud className="w-6 h-6" />
                      </div>
                      <h4 className="text-xs font-bold text-[#111827]">Click or drag &amp; drop photo here</h4>
                      <p className="text-[10px] text-[#98A2B3]">PNG, JPG, WEBP up to 15MB</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Right: Metadata Inputs */}
              <div className="lg:col-span-7 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-[#344054] mb-1">
                    Photo Title *
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. DOON Electro Pro - 360 Studio Showcase"
                    required
                    className="w-full bg-[#F7F9FA] border border-[#E5E7EB] focus:border-[#00D96B] rounded-xl px-3.5 py-2.5 text-xs text-[#111827] focus:outline-none transition"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-[#344054] mb-1">
                      Category *
                    </label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full bg-[#F7F9FA] border border-[#E5E7EB] focus:border-[#00D96B] rounded-xl px-3.5 py-2.5 text-xs text-[#111827] focus:outline-none transition"
                    >
                      {CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#344054] mb-1">
                      Status
                    </label>
                    <div className="flex items-center gap-2 bg-[#EAFBF2] border border-[#00D96B]/30 rounded-xl px-3.5 py-2.5">
                      <span className="w-2 h-2 rounded-full bg-[#00D96B] animate-pulse"></span>
                      <span className="text-xs font-bold text-[#00A854]">Publish Instantly</span>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#344054] mb-1">
                    Description / Caption (Optional)
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={2}
                    placeholder="Brief highlight about the angle, features, or location..."
                    className="w-full bg-[#F7F9FA] border border-[#E5E7EB] focus:border-[#00D96B] rounded-xl px-3.5 py-2 text-xs text-[#111827] focus:outline-none transition resize-none"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={uploading}
                className="bg-[#00D96B] hover:bg-[#00A854] text-[#071B12] hover:text-white font-bold px-6 py-3 rounded-xl text-xs uppercase tracking-wider shadow-[0_4px_14px_rgba(0,217,107,0.35)] transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {uploading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></span>
                    <span>UPLOADING TO SERVER...</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 stroke-[2.5]" />
                    <span>UPLOAD PHOTO TO GALLERY</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Bottom Section: Media Library */}
        <div className="bg-white rounded-2xl border border-[#E5E7EB] p-6 shadow-[0_2px_12px_rgba(16,24,40,0.03)] space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-[#E5E7EB]">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#EAFBF2] flex items-center justify-center text-[#00A854]">
                <FolderOpen className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#111827]">
                  Gallery Media Library ({filteredImages.length} items)
                </h3>
                <p className="text-[11px] text-[#667085]">
                  Click on any thumbnail to preview or delete unwanted assets.
                </p>
              </div>
            </div>

            {/* Filter Pills */}
            <div className="flex flex-wrap items-center gap-1.5">
              {['All', ...CATEGORIES].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedFilter(cat)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    selectedFilter === cat
                      ? 'bg-[#00D96B] text-[#101828] shadow-sm'
                      : 'bg-[#F7F9FA] text-[#667085] hover:text-[#111827] border border-[#E5E7EB]'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="py-12 text-center text-xs text-[#667085] animate-pulse">
              Loading media library...
            </div>
          ) : filteredImages.length === 0 ? (
            <div className="py-16 text-center space-y-3">
              <ImageIcon className="w-12 h-12 text-[#98A2B3] mx-auto stroke-1" />
              <h4 className="text-sm font-bold text-[#111827]">No media found</h4>
              <p className="text-xs text-[#667085]">Upload your first photo using the form above.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredImages.map((img) => (
                <div
                  key={img.id}
                  className="group bg-[#F7F9FA] rounded-2xl border border-[#E5E7EB] hover:border-[#00D96B]/60 p-3 flex flex-col justify-between space-y-3 transition-all shadow-sm"
                >
                  {/* Thumbnail */}
                  <div
                    onClick={() => setPreviewModalImage(img)}
                    className="relative w-full h-44 rounded-xl overflow-hidden bg-black/5 cursor-pointer"
                  >
                    <Image
                      src={img.image_url}
                      alt={img.title}
                      fill
                      sizes="250px"
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                      unoptimized={img.image_url.startsWith('/uploads') || img.image_url.startsWith('http')}
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                      <Maximize2 className="w-5 h-5 drop-shadow" />
                    </div>
                  </div>

                  {/* Info */}
                  <div className="space-y-1">
                    <span className="inline-block text-[9px] font-extrabold uppercase bg-[#EAFBF2] text-[#00A854] px-2 py-0.5 rounded-md">
                      {img.category}
                    </span>
                    <h4 className="text-xs font-bold text-[#111827] line-clamp-1">
                      {img.title}
                    </h4>
                    {img.description && (
                      <p className="text-[10px] text-[#667085] line-clamp-2">
                        {img.description}
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-2 border-t border-[#E5E7EB]">
                    <button
                      onClick={() => setPreviewModalImage(img)}
                      className="text-[11px] font-bold text-[#00A854] hover:text-[#00D96B] flex items-center gap-1 cursor-pointer"
                    >
                      <Maximize2 className="w-3 h-3" />
                      <span>Preview</span>
                    </button>

                    <button
                      onClick={() => handleDelete(img.id, img.title)}
                      className="text-[11px] font-bold text-red-500 hover:text-red-700 hover:bg-red-50 p-1.5 rounded-lg transition cursor-pointer flex items-center gap-1"
                      title="Delete Photo"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Fullscreen Lightbox Modal */}
      {previewModalImage && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setPreviewModalImage(null)}
        >
          <div
            className="relative max-w-4xl w-full bg-white rounded-3xl overflow-hidden p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-[#00A854] bg-[#EAFBF2] px-2.5 py-0.5 rounded-md uppercase">
                  {previewModalImage.category}
                </span>
                <h3 className="text-lg font-bold text-[#111827] mt-1">
                  {previewModalImage.title}
                </h3>
              </div>
              <button
                onClick={() => setPreviewModalImage(null)}
                className="w-8 h-8 rounded-full bg-[#F7F9FA] hover:bg-[#E5E7EB] text-[#111827] flex items-center justify-center transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="relative w-full h-[55vh] rounded-2xl overflow-hidden bg-black/5">
              <Image
                src={previewModalImage.image_url}
                alt={previewModalImage.title}
                fill
                className="object-contain"
                unoptimized={previewModalImage.image_url.startsWith('/uploads') || previewModalImage.image_url.startsWith('http')}
              />
            </div>

            {previewModalImage.description && (
              <p className="text-xs text-[#475467]">
                {previewModalImage.description}
              </p>
            )}
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
