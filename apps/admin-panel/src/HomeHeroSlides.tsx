import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Image as ImageIcon, Pencil, Trash2, Upload, X } from "lucide-react";
import { api, assetUrl } from "./api";
import { Async, Head, Status } from "./components";

interface HomeHeroSlide {
  id: string;
  eyebrow: string;
  title: string;
  description: string;
  ctaLabel: string;
  ctaHref: string;
  imageUrl?: string | null;
  imageAlt: string;
  isActive: boolean;
  sortOrder: number;
}

interface SlideForm {
  eyebrow: string;
  title: string;
  description: string;
  ctaLabel: string;
  ctaHref: string;
  imageAlt: string;
  sortOrder: string;
  isActive: boolean;
}

const emptyForm: SlideForm = {
  eyebrow: "Pure · Natural · Made in India",
  title: "",
  description: "",
  ctaLabel: "Shop now",
  ctaHref: "/products",
  imageAlt: "",
  sortOrder: "0",
  isActive: true,
};

export function HomeHeroSlides() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<HomeHeroSlide | null | undefined>();
  const [form, setForm] = useState<SlideForm>(emptyForm);
  const [image, setImage] = useState<File>();
  const [preview, setPreview] = useState<string>();
  const [removeImage, setRemoveImage] = useState(false);
  const [validationError, setValidationError] = useState("");
  const q = useQuery({
    queryKey: ["admin-home-hero-slides"],
    queryFn: () => api.get<HomeHeroSlide[]>("/admin/home-hero-slides"),
  });

  useEffect(() => () => {
    if (preview?.startsWith("blob:")) URL.revokeObjectURL(preview);
  }, [preview]);

  const save = useMutation({
    mutationFn: async () => {
      const input = { ...form, sortOrder: Number(form.sortOrder) };
      const slide = editing
        ? await api.patch<HomeHeroSlide>(`/admin/home-hero-slides/${editing.id}`, input)
        : await api.post<HomeHeroSlide>("/admin/home-hero-slides", input);
      if (image) {
        const body = new FormData();
        body.set("file", image);
        return api.postForm<HomeHeroSlide>(`/admin/home-hero-slides/${slide.id}/image`, body);
      }
      if (editing && removeImage && editing.imageUrl) {
        return api.delete<HomeHeroSlide>(`/admin/home-hero-slides/${editing.id}/image`);
      }
      return slide;
    },
    onSuccess: () => {
      closeEditor();
      void qc.invalidateQueries({ queryKey: ["admin-home-hero-slides"] });
    },
  });

  const toggle = useMutation({
    mutationFn: (slide: HomeHeroSlide) => api.patch<HomeHeroSlide>(`/admin/home-hero-slides/${slide.id}`, { isActive: !slide.isActive }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["admin-home-hero-slides"] }),
  });
  const remove = useMutation({
    mutationFn: (slide: HomeHeroSlide) => api.delete(`/admin/home-hero-slides/${slide.id}`),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["admin-home-hero-slides"] }),
  });

  function closeEditor() {
    setEditing(undefined);
    setForm(emptyForm);
    setImage(undefined);
    setPreview(undefined);
    setRemoveImage(false);
    setValidationError("");
  }
  function openEditor(slide: HomeHeroSlide | null) {
    setEditing(slide);
    setForm(slide ? {
      eyebrow: slide.eyebrow,
      title: slide.title,
      description: slide.description,
      ctaLabel: slide.ctaLabel,
      ctaHref: slide.ctaHref,
      imageAlt: slide.imageAlt,
      sortOrder: String(slide.sortOrder),
      isActive: slide.isActive,
    } : emptyForm);
    setImage(undefined);
    setPreview(assetUrl(slide?.imageUrl));
    setRemoveImage(false);
    setValidationError("");
  }
  function chooseImage(file?: File) {
    setValidationError("");
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setValidationError("Choose a JPG, JPEG, PNG or WEBP image.");
      return;
    }
    if (file.size > 5_242_880) {
      setValidationError("Image must not exceed 5 MB.");
      return;
    }
    setImage(file);
    setRemoveImage(false);
    setPreview(URL.createObjectURL(file));
  }
  function submit() {
    if (!form.title.trim() || !form.description.trim() || !form.imageAlt.trim()) {
      setValidationError("Title, description and image description are required.");
      return;
    }
    if (!/^\/(?!\/)/.test(form.ctaHref)) {
      setValidationError("Button destination must be an internal path such as /products.");
      return;
    }
    if (!editing && !image) {
      setValidationError("Choose a hero image before creating the slide.");
      return;
    }
    save.mutate();
  }

  return <>
    <Head title="Homepage hero" subtitle="Manage the images and content shown in the customer homepage carousel." action={<button className="primary" onClick={() => openEditor(null)}>Add hero slide</button>} />
    <Async query={q} empty={!q.data?.length}>
      <div className="hero-admin-grid">
        {q.data?.map((slide) => <article className="hero-admin-card" key={slide.id}>
          {slide.imageUrl ? <img src={assetUrl(slide.imageUrl)} alt={slide.imageAlt} /> : <div className="hero-admin-placeholder"><ImageIcon /><span>Image required</span></div>}
          <div className="hero-admin-card-body">
            <div className="hero-admin-meta"><Status value={slide.isActive ? "ACTIVE" : "INACTIVE"} /><span>Position {slide.sortOrder}</span></div>
            <small>{slide.eyebrow}</small><h2>{slide.title}</h2><p>{slide.description}</p><span>{slide.ctaLabel} → {slide.ctaHref}</span>
            <div className="form-actions">
              <button className="secondary" onClick={() => openEditor(slide)}><Pencil /> Edit</button>
              <button className="secondary" disabled={toggle.isPending} onClick={() => toggle.mutate(slide)}>{slide.isActive ? "Deactivate" : "Activate"}</button>
              <button className="secondary danger" disabled={remove.isPending} onClick={() => { if (window.confirm(`Delete “${slide.title}”?`)) remove.mutate(slide); }}><Trash2 /> Delete</button>
            </div>
          </div>
        </article>)}
      </div>
      {(toggle.error || remove.error) && <p className="form-error">{toggle.error?.message || remove.error?.message}</p>}
    </Async>
    {editing !== undefined && <div className="drawer-bg" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !save.isPending) closeEditor(); }}>
      <form className="drawer category-editor hero-editor" onSubmit={(event) => { event.preventDefault(); submit(); }}>
        <button className="close" type="button" aria-label="Close" onClick={closeEditor}><X /></button>
        <h2>{editing ? "Edit hero slide" : "Add hero slide"}</h2><p>Use a landscape image. The API optimizes it to WEBP for fast customer loading.</p>
        <label>Eyebrow<input required maxLength={80} value={form.eyebrow} onChange={(event) => setForm({ ...form, eyebrow: event.target.value })} /></label>
        <label>Heading<input required maxLength={140} value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} /></label>
        <label>Description<textarea required maxLength={320} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></label>
        <div className="hero-editor-row">
          <label>Button label<input required maxLength={40} value={form.ctaLabel} onChange={(event) => setForm({ ...form, ctaLabel: event.target.value })} /></label>
          <label>Button destination<input required placeholder="/products" value={form.ctaHref} onChange={(event) => setForm({ ...form, ctaHref: event.target.value })} /></label>
        </div>
        <label>Image description (accessibility)<input required maxLength={180} value={form.imageAlt} onChange={(event) => setForm({ ...form, imageAlt: event.target.value })} /></label>
        <div className="hero-editor-row">
          <label>Position<input min={0} step={1} type="number" value={form.sortOrder} onChange={(event) => setForm({ ...form, sortOrder: event.target.value })} /></label>
          <label className="hero-active-field"><input type="checkbox" checked={form.isActive} onChange={(event) => setForm({ ...form, isActive: event.target.checked })} /> Show on customer homepage</label>
        </div>
        <div className="category-image-field">
          <strong>Hero image</strong>
          {preview && !removeImage ? <img className="hero-admin-preview" src={preview} alt="Hero preview" /> : <div className="hero-admin-preview hero-admin-placeholder"><ImageIcon /><span>No image selected</span></div>}
          <div className="form-actions">
            <label className="secondary file-button"><Upload /> {preview && !removeImage ? "Replace image" : "Choose image"}<input type="file" accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp" onChange={(event) => chooseImage(event.target.files?.[0])} /></label>
            {preview && !removeImage && <button className="secondary danger" type="button" onClick={() => { setImage(undefined); setPreview(undefined); setRemoveImage(true); }}><Trash2 /> Remove</button>}
          </div><small>Recommended 1600 × 900. JPG, JPEG, PNG or WEBP, up to 5 MB.</small>
        </div>
        {(validationError || save.error) && <p className="form-error" role="alert">{validationError || save.error?.message}</p>}
        <footer><button className="secondary" type="button" disabled={save.isPending} onClick={closeEditor}>Cancel</button><button className="primary" disabled={save.isPending}>{save.isPending ? "Optimizing & saving…" : "Save hero slide"}</button></footer>
      </form>
    </div>}
  </>;
}
