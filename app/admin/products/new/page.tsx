'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { FiCamera, FiCheck, FiChevronDown, FiTrash2 } from 'react-icons/fi';

type ProductForm = {
  name: string;
  description: string;
  category: string;
};

type PendingImage = {
  id: string;
  file: File;
  previewUrl: string;
};

type Toast = {
  type: 'success' | 'error';
  message: string;
};

type Category = {
  id: number;
  name: string;
  slug: string;
};

const INITIAL_FORM: ProductForm = {
  name: '',
  description: '',
  category: '',
};

const inputCls =
  'mt-1.5 w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition placeholder:text-gray-400';

const textareaCls =
  'mt-1.5 w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition placeholder:text-gray-400 min-h-[120px] resize-y';

const selectCls =
  'mt-1.5 w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition appearance-none cursor-pointer';

export default function AddProductPage() {
  const router = useRouter();
  const [form, setForm] = useState<ProductForm>(INITIAL_FORM);
  const [pendingImages, setPendingImages] = useState<PendingImage[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [customCategory, setCustomCategory] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number; fileName: string } | null>(null);
  const pendingImagesRef = useRef<PendingImage[]>([]);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);
  const maxImagesAllowed = 3;

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(null), 3000);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  useEffect(() => {
    pendingImagesRef.current = pendingImages;
  }, [pendingImages]);

  useEffect(() => {
    return () => {
      pendingImagesRef.current.forEach(image => URL.revokeObjectURL(image.previewUrl));
    };
  }, []);

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const response = await fetch('/api/admin/categories', { cache: 'no-store' });
        if (!response.ok) throw new Error('Failed to load categories');
        const payload = (await response.json()) as Category[];
        setCategories(payload);
      } catch {
        // Keep form usable even if categories endpoint fails.
      }
    };

    void loadCategories();
  }, []);

  const canSubmit = useMemo(() => {
    const finalCategory = selectedCategory === '__custom__' ? customCategory : form.category;
    return (
      form.name.trim().length > 0 &&
      finalCategory.trim().length > 0 &&
      pendingImages.length > 0 &&
      !uploading
    );
  }, [form.name, form.category, selectedCategory, customCategory, pendingImages.length, uploading]);

  const uploadImage = (file: File) => {
    setPendingImages(prev => {
      if (prev.length >= maxImagesAllowed) {
        setToast({ type: 'error', message: `Maximum of ${maxImagesAllowed} images allowed.` });
        return prev;
      }

      const duplicate = prev.some(
        image =>
          image.file.name === file.name &&
          image.file.size === file.size &&
          image.file.lastModified === file.lastModified
      );

      if (duplicate) {
        setToast({ type: 'error', message: 'This image is already selected.' });
        return prev;
      }

      const previewUrl = URL.createObjectURL(file);
      const next = [...prev, { id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, file, previewUrl }].slice(0, maxImagesAllowed);
      setToast({ type: 'success', message: 'Image selected.' });
      return next;
    });
  };

  const createProduct = async () => {
    try {
      setSaving(true);
      setUploading(true);

      if (pendingImages.length === 0) {
        throw new Error('Please select at least one image.');
      }

      const uploadedImageUrls: string[] = [];
      for (let i = 0; i < pendingImages.length; i += 1) {
        const image = pendingImages[i];
        setUploadProgress({ current: i + 1, total: pendingImages.length, fileName: image.file.name });
        const data = new FormData();
        data.append('file', image.file);

        const uploadResponse = await fetch('/api/uploads/product-image', {
          method: 'POST',
          body: data,
        });

        const uploadPayload = (await uploadResponse.json()) as { url?: string; error?: string; details?: string };
        if (!uploadResponse.ok || !uploadPayload.url) {
          throw new Error(uploadPayload.error || uploadPayload.details || 'Image upload failed');
        }

        uploadedImageUrls.push(uploadPayload.url);
      }

      const finalCategoryName = selectedCategory === '__custom__' ? customCategory : form.category;

      const response = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          description: form.description.trim(),
          image: uploadedImageUrls[0],
          imageUrls: uploadedImageUrls,
          category: finalCategoryName.trim(),
        }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { error?: string; details?: string };
        throw new Error(payload.error || payload.details || 'Failed to create product');
      }

      pendingImages.forEach(image => URL.revokeObjectURL(image.previewUrl));
      setPendingImages([]);
      setToast({ type: 'success', message: 'Product created successfully.' });
      window.setTimeout(() => {
        router.push('/admin/products');
        router.refresh();
      }, 600);
    } catch (err) {
      setToast({ type: 'error', message: err instanceof Error ? err.message : 'Failed to create product' });
    } finally {
      setUploadProgress(null);
      setUploading(false);
      setSaving(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 pb-12">
      {toast && (
        <div className="fixed right-4 top-4 z-50">
          <div
            className={`flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold shadow-lg ${
              toast.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
            }`}
          >
            {toast.type === 'success' ? <FiCheck className="h-4 w-4" /> : null}
            {toast.message}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">Add Product</h1>
          <p className="mt-0.5 text-sm text-gray-500 sm:text-base">Add a new product with name, category, description, and image.</p>
        </div>
        <Link
          href="/admin/products"
          className="inline-flex items-center justify-center rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50"
        >
          ← Back
        </Link>
      </div>

      {/* Product Details Form */}
      <div className="rounded-[2rem] border-0 bg-white p-6 shadow-sm ring-1 ring-gray-200/50 sm:p-8 space-y-5">
        <label className="block text-sm font-semibold text-gray-700 sm:text-base">
          Product Name <span className="text-red-500">*</span>
          <input
            value={form.name}
            onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
            placeholder="Enter product name"
            className={inputCls}
          />
        </label>

        <label className="block text-sm font-semibold text-gray-700 sm:text-base">
          Category <span className="text-red-500">*</span>
          <div className="relative">
            <select
              value={selectedCategory}
              onChange={e => {
                const value = e.target.value;
                setSelectedCategory(value);
                if (value === '__custom__') {
                  setForm(prev => ({ ...prev, category: customCategory }));
                } else {
                  const chosen = categories.find(c => String(c.id) === value);
                  setForm(prev => ({ ...prev, category: chosen?.name || '' }));
                }
              }}
              className={selectCls}
            >
              <option value="">Select a category</option>
              {categories.map(c => (
                <option key={c.id} value={String(c.id)}>
                  {c.name}
                </option>
              ))}
              <option value="__custom__">+ Custom category</option>
            </select>
            <FiChevronDown className="pointer-events-none absolute right-3 top-1/2 mt-1 h-4 w-4 -translate-y-1/2 text-gray-400" />
          </div>
        </label>

        {selectedCategory === '__custom__' && (
          <label className="block text-sm font-semibold text-gray-700 sm:text-base">
            Custom Category Name <span className="text-red-500">*</span>
            <input
              value={customCategory}
              onChange={e => {
                setCustomCategory(e.target.value);
                setForm(prev => ({ ...prev, category: e.target.value }));
              }}
              placeholder="Enter category name"
              className={inputCls}
            />
          </label>
        )}

        <label className="block text-sm font-semibold text-gray-700 sm:text-base">
          Description
          <textarea
            value={form.description}
            onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
            placeholder="Write a brief description of the product..."
            className={textareaCls}
          />
        </label>
      </div>

      {/* Product Image */}
      <div className="rounded-[2rem] border-0 bg-white p-6 shadow-sm ring-1 ring-gray-200/50 sm:p-8">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm font-bold text-gray-800 sm:text-base">
              Product Image <span className="text-red-500">*</span>
            </h2>
            <p className="mt-0.5 text-xs text-gray-400 sm:text-sm">Upload product image (up to {maxImagesAllowed}).</p>
          </div>
          <input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            onChange={e => {
              const file = e.target.files?.[0];
              if (file) void uploadImage(file);
              e.target.value = '';
            }}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => imageInputRef.current?.click()}
            disabled={saving || pendingImages.length >= maxImagesAllowed}
            className="inline-flex items-center gap-2 rounded-xl bg-black px-4 py-2 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:opacity-50 cursor-pointer"
          >
            <FiCamera className="h-4 w-4" />
            {pendingImages.length >= maxImagesAllowed ? 'Max reached' : 'Select Image'}
          </button>
        </div>

        {pendingImages.length > 0 ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {pendingImages.map((image, i) => (
              <div key={image.id} className="group relative aspect-square overflow-hidden rounded-xl border border-gray-100">
                <Image src={image.previewUrl} alt={`Selected product image ${i + 1}`} fill className="object-cover" />
                <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition group-hover:bg-black/30">
                  <button
                    type="button"
                    onClick={() => {
                      URL.revokeObjectURL(image.previewUrl);
                      setPendingImages(prev => prev.filter((_, idx) => idx !== i));
                    }}
                    className="rounded-lg bg-white px-3 py-1.5 text-[11px] font-semibold text-rose-600 opacity-100 shadow transition sm:scale-75 sm:opacity-0 sm:group-hover:scale-100 sm:group-hover:opacity-100 cursor-pointer"
                  >
                    <FiTrash2 className="mr-0.5 inline h-3 w-3" />
                    Remove
                  </button>
                </div>
                {i === 0 && (
                  <span className="absolute bottom-1.5 left-1.5 rounded bg-black px-1.5 py-0.5 text-[10px] font-bold text-white">
                    Main
                  </span>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div
            onClick={() => imageInputRef.current?.click()}
            className="flex min-h-32 cursor-pointer items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 px-4 text-center text-gray-400 transition hover:border-black hover:text-black"
          >
            <div className="text-center">
              <FiCamera className="mx-auto h-8 w-8" />
              <p className="mt-2 text-sm font-medium">Click to select product image</p>
            </div>
          </div>
        )}
      </div>

      {/* Save Button */}
      <div className="flex flex-col gap-3 rounded-[2rem] border-0 ring-1 ring-gray-200/50 bg-white p-6 shadow-sm sm:flex-row sm:items-center sm:justify-end">
        <p className="text-sm text-gray-400 sm:mr-auto">
          {saving ? 'Uploading image and saving product...' : canSubmit ? 'Ready to save product.' : 'Please enter Name, Category, and Image.'}
        </p>
        {saving && uploadProgress ? (
          <p className="text-xs font-semibold text-gray-500 sm:mr-2">
            Uploading image {uploadProgress.current}/{uploadProgress.total}: {uploadProgress.fileName}
          </p>
        ) : null}
        <button
          type="button"
          onClick={() => void createProduct()}
          disabled={saving || !canSubmit}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-black px-6 py-3 text-base font-semibold text-white shadow-sm transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto cursor-pointer"
        >
          {saving ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              Adding Product...
            </>
          ) : (
            <>
              <FiCheck className="h-4 w-4" />
              Add Product
            </>
          )}
        </button>
      </div>
    </div>
  );
}
