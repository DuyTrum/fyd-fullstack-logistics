import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { productAPI, categoryAPI, formatVND, aiAPI, brandAPI, colorAPI, sizeAPI, getAssetUrl } from "@shared/utils/api.js";
import { useToast } from "@shared/context/ToastContext";
import { useConfirm } from "@shared/context/ConfirmContext";
import { useTranslation } from "react-i18next";
import ImportProducts from "../components/ImportProducts";
import "../styles/dashboard.css";
import "../styles/pages.css";
import "../styles/admin-forms.css";

const PLACEHOLDER_IMG = "https://placehold.co/400x400/f5f5f5/999?text=No+Image";

// SVG Icons
const CloseIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M18 6L6 18M6 6l12 12" />
  </svg>
);

function Modal({ open, title, children, onClose }) {
  if (!open) return null;

  // Use portal to render modal to document.body, bypassing any parent transforms
  return createPortal(
    <div className="modalBackdrop" onMouseDown={onClose}>
      <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="modalHead">
          <div className="modalTitle">{title}</div>
          <button className="iconBtn" type="button" onClick={onClose}>
            <CloseIcon />
          </button>
        </div>
        <div className="modalBody">{children}</div>
      </div>
    </div>,
    document.body
  );
}

function ImageGalleryModal({ open, product, onClose, onSave, loadProducts }) {
  const { t } = useTranslation();
  const [primaryId, setPrimaryId] = useState(null);
  const [hoverId, setHoverId] = useState(null);
  const [saving, setSaving] = useState(false);
  const { showConfirm } = useConfirm();
  const { showToast } = useToast();

  useEffect(() => {
    if (product && product.images && product.images.length > 0) {
      // images[0] = primary, images[1] = hover (theo cách shop hoạt động)
      const sorted = [...product.images].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
      setPrimaryId(sorted[0]?.id || null);
      setHoverId(sorted[1]?.id || null);
    } else {
      setPrimaryId(null);
      setHoverId(null);
    }
  }, [product]);

  if (!open || !product) return null;

  const images = product.images || [];

  const handleSave = async () => {
    if (!primaryId) {
      showToast(t("products.msg_save_error_no_primary"), "error");
      return;
    }
    setSaving(true);
    try {
      await onSave(product.id, primaryId, hoverId);
      onClose();
    } catch (err) {
      showToast(t("products.msg_save_error") + ": " + err.message, "error");
    } finally {
      setSaving(false);
    }
  };

  const primaryImg = images.find(img => img.id === primaryId);
  const hoverImg = images.find(img => img.id === hoverId);

  // Use portal to render modal to document.body, bypassing any parent transforms
  return createPortal(
    <div className="modalBackdrop" onMouseDown={onClose}>
      <div className="modal imageGalleryModal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="modalHead">
          <div className="modalTitle">{t("products.gallery_title", { name: product.name })}</div>
          <button className="iconBtn" type="button" onClick={onClose}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="modalBody">
          {images.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#666' }}>{t("products.gallery_empty")}</p>
          ) : (
            <>
              {/* Preview section */}
              <div style={{ display: 'flex', gap: 24, marginBottom: 24, justifyContent: 'center' }}>
                <div style={{ textAlign: 'center' }}>
                  <p style={{ marginBottom: 8, fontWeight: 500, color: '#333' }}>{t("products.gallery_primary")}</p>
                  <div style={{
                    width: 150, height: 150, border: '2px solid #000', borderRadius: 8,
                    backgroundImage: primaryImg ? `url(${getAssetUrl(primaryImg.imageUrl)})` : 'none',
                    backgroundColor: '#f5f5f5',
                    backgroundSize: 'cover', backgroundPosition: 'center'
                  }} />
                </div>
                <div style={{ textAlign: 'center' }}>
                  <p style={{ marginBottom: 8, fontWeight: 500, color: '#333' }}>{t("products.gallery_hover")}</p>
                  <div style={{
                    width: 150, height: 150, border: '2px dashed #999', borderRadius: 8,
                    backgroundImage: hoverImg ? `url(${getAssetUrl(hoverImg.imageUrl)})` : 'none',
                    backgroundColor: '#f5f5f5',
                    backgroundSize: 'cover', backgroundPosition: 'center'
                  }} />
                </div>
              </div>

              {/* Image selection grid */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
                gap: 12,
                maxHeight: 300,
                overflowY: 'auto',
                padding: 4
              }}>
                {images.map((img) => {
                  const isPrimary = img.id === primaryId;
                  const isHover = img.id === hoverId;
                  return (
                    <div
                      key={img.id}
                      style={{
                        position: 'relative',
                        aspectRatio: '1',
                        borderRadius: 8,
                        overflow: 'hidden',
                        border: isPrimary ? '3px solid #000' : isHover ? '3px solid #666' : '2px solid #ddd',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                    >
                      <img
                        src={getAssetUrl(img.imageUrl)}
                        alt={img.altText || 'Product image'}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                      {/* Badges */}
                      <div style={{ position: 'absolute', top: 4, left: 4, display: 'flex', gap: 4 }}>
                        {isPrimary && (
                          <span style={{
                            background: 'var(--admin-accent)', color: '#0a0a0f', fontSize: 9, padding: '2px 6px',
                            borderRadius: 4, fontWeight: 700
                          }}>{t("products.gallery_badge_primary")}</span>
                        )}
                        {isHover && (
                          <span style={{
                            background: '#666', color: '#fff', fontSize: 9, padding: '2px 6px',
                            borderRadius: 4, fontWeight: 700
                          }}>{t("products.gallery_badge_hover")}</span>
                        )}
                      </div>

                      {/* Delete button */}
                      <button
                        type="button"
                        className="iconBtn"
                        style={{
                          position: 'absolute', top: 4, right: 4,
                          background: 'rgba(255, 0, 0, 0.7)',
                          width: 20, height: 20, padding: 0,
                          borderRadius: 4, border: 'none', color: '#fff'
                        }}
                        onClick={async (e) => {
                          e.stopPropagation();
                          const confirmed = await showConfirm(t("common.confirm_delete_title"), t("products.gallery_delete_confirm"));
                          if (!confirmed) return;
                          try {
                            await productAPI.deleteImage(product.id, img.id);
                            await loadProducts();
                          } catch (err) {
                            showToast(t("products.msg_delete_error") + ": " + err.message, "error");
                          }
                        }}
                      >
                        <CloseIcon />
                      </button>

                      {/* Action buttons */}
                      <div style={{
                        position: 'absolute', bottom: 0, left: 0, right: 0,
                        display: 'flex', background: 'rgba(0,0,0,0.7)'
                      }}>
                        <button
                          type="button"
                          onClick={() => setPrimaryId(img.id)}
                          style={{
                            flex: 1, padding: '6px 4px', border: 'none',
                            background: isPrimary ? '#000' : 'transparent',
                            color: '#fff', fontSize: 11, cursor: 'pointer'
                          }}
                        >
                          {t("products.gallery_btn_primary")}
                        </button>
                        <button
                          type="button"
                          onClick={() => setHoverId(img.id === hoverId ? null : img.id)}
                          style={{
                            flex: 1, padding: '6px 4px', border: 'none',
                            borderLeft: '1px solid rgba(255,255,255,0.2)',
                            background: isHover ? '#666' : 'transparent',
                            color: '#fff', fontSize: 11, cursor: 'pointer'
                          }}
                        >
                          {t("products.gallery_btn_hover")}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
        <div className="modalActions">
          <button className="btnGhost" type="button" onClick={onClose}>{t("common.cancel")}</button>
          <button className="btnPrimary" type="button" onClick={handleSave} disabled={saving || images.length === 0}>
            {saving ? t("products.gallery_saving") : t("products.gallery_save")}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

function StockBadge({ stock }) {
  const { t } = useTranslation();
  if (stock <= 0) return <span className="badgeStock out">{t("products.stock_out")}</span>;
  if (stock <= 6) return <span className="badgeStock low">{t("products.stock_low")}</span>;
  return <span className="badgeStock">{t("products.stock_count", { count: stock })}</span>;
}

export default function Products() {
  const { t } = useTranslation();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [editOpen, setEditOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [galleryProduct, setGalleryProduct] = useState(null);
  const [importOpen, setImportOpen] = useState(false);

  const editing = useMemo(
    () => products.find((p) => p.id === editingId) || null,
    [products, editingId]
  );

  const [form, setForm] = useState({
    sku: "",
    name: "",
    categoryId: "",
    brandId: "",
    basePrice: "",
    salePrice: "",
    costPrice: "",
    description: "",
    shortDescription: "",
    material: "",
    initialStock: "",
    initialSizeId: "",
    initialColorId: "",
    isFeatured: false,
    isNew: false,
    status: "ACTIVE"
  });
  const [brands, setBrands] = useState([]);
  const [colors, setColors] = useState([]);
  const [sizes, setSizes] = useState([]);
  const [aiLoading, setAiLoading] = useState({ description: false, category: false, shortDesc: false });
  const { showToast } = useToast();
  const { showConfirm } = useConfirm();

  // Load products from API
  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const [prodData, catData, brandData, colorData, sizeData] = await Promise.all([
        productAPI.getAll(),
        categoryAPI.getFlat().catch(() => []),
        brandAPI.getAll().catch(() => []),
        colorAPI.getAll().catch(() => []),
        sizeAPI.getAll().catch(() => [])
      ]);
      setProducts(prodData.products || []);
      setCategories(catData || []);
      setBrands(brandData || []);
      setColors(colorData || []);
      setSizes(sizeData || []);
    } catch (err) {
      console.error("Failed to load products:", err);
    } finally {
      setLoading(false);
    }
  };

  const openAdd = () => {
    setEditingId(null);
    setForm({
      sku: "",
      name: "",
      categoryId: "",
      brandId: "",
      basePrice: "",
      salePrice: "",
      costPrice: "",
      description: "",
      shortDescription: "",
      material: "",
      initialStock: "",
      initialSizeId: "",
      initialColorId: "",
      isFeatured: false,
      isNew: false,
      status: "ACTIVE"
    });
    setEditOpen(true);
  };

  const openEdit = (p) => {
    setEditingId(p.id);
    setForm({
      sku: p.sku || "",
      name: p.name || "",
      categoryId: p.categoryId || (p.category?.id ? String(p.category.id) : ""),
      brandId: p.brandId || (p.brand?.id ? String(p.brand.id) : ""),
      basePrice: String(p.basePrice || 0),
      salePrice: p.salePrice ? String(p.salePrice) : "",
      costPrice: p.costPrice ? String(p.costPrice) : "",
      description: p.description || "",
      shortDescription: p.shortDescription || "",
      material: p.material || "",
      initialStock: String(p.totalStock || 0),
      initialSizeId: "",
      initialColorId: "",
      isFeatured: p.isFeatured || false,
      isNew: p.isNew || false,
      status: p.status || "ACTIVE"
    });
    setEditOpen(true);
  };

  const openGallery = (p) => {
    setGalleryProduct(p);
    setGalleryOpen(true);
  };

  const handleSaveImages = async (productId, primaryId, hoverId) => {
    // Gọi API để set primary image
    // Shop sử dụng images[0] = primary, images[1] = hover
    // Nên ta cần set sortOrder cho các ảnh
    await productAPI.setPrimaryImage(productId, primaryId);
    // Reload products để cập nhật UI
    await loadProducts();
  };

  const save = async () => {
    const payload = {
      sku: form.sku.trim(),
      name: form.name.trim(),
      categoryId: form.categoryId ? Number(form.categoryId) : null,
      brandId: form.brandId ? Number(form.brandId) : null,
      basePrice: Number(form.basePrice || 0),
      salePrice: form.salePrice ? Number(form.salePrice) : null,
      costPrice: form.costPrice ? Number(form.costPrice) : null,
      description: form.description.trim(),
      shortDescription: form.shortDescription.trim(),
      material: form.material.trim(),
      isFeatured: form.isFeatured,
      isNew: form.isNew,
      status: form.status,
      initialStock: form.initialStock ? Number(form.initialStock) : 0,
      initialSizeId: form.initialSizeId ? Number(form.initialSizeId) : null,
      initialColorId: form.initialColorId ? Number(form.initialColorId) : null
    };

    if (!payload.sku || !payload.name || !payload.basePrice) {
      showToast(t("products.msg_validate_error"), "error");
      return;
    }

    try {
      if (editingId) {
        await productAPI.update(editingId, payload);
      } else {
        await productAPI.create(payload);
      }
      await loadProducts();
      setEditOpen(false);
      showToast(editingId ? t("products.msg_update_success") : t("products.msg_save_success"));
    } catch (err) {
      showToast(t("common.update_error") + ": " + (err.message || t("products.msg_save_error")), "error");
    }
  };

  // Get unique categories from products
  const uniqueCategories = useMemo(() => {
    const cats = [...new Set(products.map(p => p.category).filter(Boolean))];
    return cats.sort();
  }, [products]);

  // Category counts
  const categoryCounts = useMemo(() => {
    const counts = { all: products.length };
    products.forEach(p => {
      if (p.category) {
        counts[p.category] = (counts[p.category] || 0) + 1;
      }
    });
    return counts;
  }, [products]);

  const filtered = useMemo(() => {
    return products.filter((p) => {
      // Category filter
      if (selectedCategory !== "all" && p.category !== selectedCategory) {
        return false;
      }
      // Search filter
      const text = `${p.sku || ''} ${p.name || ''} ${p.category || ''}`.toLowerCase();
      return !q || text.includes(q.toLowerCase());
    });
  }, [products, q, selectedCategory]);

  const getProductImage = (product) => {
    if (product.images && product.images.length > 0) {
      // Sort by sortOrder and get first image
      const sorted = [...product.images].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
      return getAssetUrl(sorted[0].imageUrl);
    }
    if (product.thumbnail) return getAssetUrl(product.thumbnail);
    return PLACEHOLDER_IMG;
  };

  if (loading) {
    return (
      <div className="card">
        <div className="cardHead">
          <div className="cardTitle">{t("products.title")}</div>
        </div>
        <div style={{ padding: 40, textAlign: 'center', color: '#666' }}>
          {t("common.loading")}
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="cardHead">
        <div>
          <div className="cardTitle">{t("products.title")}</div>
          <div className="cardSub">{t("products.subtitle", { count: products.length })}</div>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "flex-end" }}>
          <input
            className="miniInput"
            placeholder={t("products.search_placeholder")}
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <button className="btnGhost" type="button" onClick={() => setImportOpen(true)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '6px' }}>
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            {t("products.btn_import")}
          </button>
          <button className="btnPrimary" type="button" onClick={openAdd}>{t("products.btn_add")}</button>
        </div>
      </div>

      {/* Category Filter Tabs */}
      <div className="categoryTabs">
        <button
          className={`categoryTab ${selectedCategory === "all" ? "active" : ""}`}
          onClick={() => setSelectedCategory("all")}
          type="button"
        >
          {t("products.tab_all")}<span className="count">{categoryCounts.all || 0}</span>
        </button>
        {uniqueCategories.map(cat => (
          <button
            key={cat}
            className={`categoryTab ${selectedCategory === cat ? "active" : ""}`}
            onClick={() => setSelectedCategory(cat)}
            type="button"
          >
            {cat}<span className="count">{categoryCounts[cat] || 0}</span>
          </button>
        ))}
      </div>

      <div className="gridCards">
        {filtered.map((p) => {
          const imgUrl = getProductImage(p);
          return (
            <div className="pCard" key={p.id}>
              <div
                className="pThumb"
                style={{
                  backgroundImage: `url(${imgUrl})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  cursor: 'pointer'
                }}
                onClick={() => openGallery(p)}
                title={t("products.images")}
              >
                {p.images && p.images.length > 1 && (
                  <span style={{
                    position: 'absolute', bottom: 8, right: 8,
                    background: 'rgba(0,0,0,0.7)', color: '#fff',
                    padding: '2px 8px', borderRadius: 4, fontSize: 12
                  }}>
                    +{p.images.length - 1} {t("products.images")}
                  </span>
                )}
              </div>
              <div className="pTop">
                <div>
                  <div className="pName">{p.name}</div>
                  <div className="pMeta">{p.brand || 'FYD'} • {p.category} • <span className="mono">{p.sku}</span></div>
                </div>
                <StockBadge stock={p.totalStock || 0} />
              </div>

              <div className="pBottom">
                <div className="pPrice">{formatVND(p.salePrice || p.basePrice || 0)}</div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button className="linkBtn" type="button" onClick={() => openEdit(p)}>{t("products.edit")}</button>
                  <button className="linkBtn" type="button" onClick={() => openGallery(p)}>{t("products.images")}</button>
                  <button
                    className="linkBtn"
                    type="button"
                    style={{ color: '#ff6b6b' }}
                    onClick={async () => {
                      const confirmed = await showConfirm(t("common.confirm_delete_title"), t("products.msg_delete_confirm", { name: p.name }));
                      if (!confirmed) return;
                      try {
                        await productAPI.delete(p.id);
                        await loadProducts();
                        showToast(t("products.msg_delete_success"));
                      } catch (err) {
                        showToast(t("products.msg_delete_error") + ": " + err.message, "error");
                      }
                    }}
                  >
                    {t("products.delete")}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <Modal open={editOpen} title={editing ? t("products.modal_edit_title", { sku: editing.sku }) : t("products.modal_add_title")} onClose={() => setEditOpen(false)}>
        <div className="premium-form">
          {/* Basic Info */}
          <div className="form-group">
            <div className="form-group-title">{t("products.section_basic")}</div>
            <div className="form-row">
              <label className="admin-field">
                <span>{t("products.sku")} *</span>
                <input
                  value={form.sku}
                  onChange={(e) => setForm((f) => ({ ...f, sku: e.target.value }))}
                  placeholder="VD: FYD-TS-001"
                />
              </label>
              <label className="admin-field">
                <span>{t("products.product_name")} *</span>
                <input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="VD: Áo thun FYD Premium"
                />
              </label>
            </div>
            <div className="form-row" style={{ marginTop: 16 }}>
              <label className="admin-field">
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>{t("products.category")}</span>
                  <button
                    type="button"
                    style={{ fontSize: 10, background: 'none', border: 'none', color: 'var(--admin-accent)', cursor: 'pointer', padding: 0 }}
                    disabled={!form.name || aiLoading.category}
                    onClick={async () => {
                      setAiLoading(prev => ({ ...prev, category: true }));
                      try {
                        const res = await aiAPI.suggestCategory(form.name);
                        if (res.success && res.category) {
                          const target = categories.find(c => c.name.toLowerCase().includes(res.category.toLowerCase()));
                          if (target) setForm(f => ({ ...f, categoryId: String(target.id) }));
                        }
                      } finally {
                        setAiLoading(prev => ({ ...prev, category: false }));
                      }
                    }}
                  >
                    {aiLoading.category ? "..." : "AI ✨"}
                  </button>
                </div>
                <select
                  value={form.categoryId}
                  onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value }))}
                >
                  <option value="">-- {t("products.category")} --</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </label>
              <label className="admin-field">
                <span>{t("products.brand")}</span>
                <select
                  value={form.brandId}
                  onChange={(e) => setForm((f) => ({ ...f, brandId: e.target.value }))}
                >
                  <option value="">-- {t("products.brand")} --</option>
                  {brands.map(brand => (
                    <option key={brand.id} value={brand.id}>{brand.name}</option>
                  ))}
                </select>
              </label>
              <label className="admin-field">
                <span>{t("products.material")}</span>
                <input
                  value={form.material}
                  onChange={(e) => setForm((f) => ({ ...f, material: e.target.value }))}
                  placeholder="Cotton 100%..."
                />
              </label>
            </div>
          </div>

          {/* Pricing & Stock */}
          <div className="form-group">
            <div className="form-group-title">{t("products.section_pricing")}</div>
            <div className="form-row four-col">
              <label className="admin-field">
                <span>{t("products.base_price")} *</span>
                <input
                  type="number"
                  value={form.basePrice}
                  onChange={(e) => setForm((f) => ({ ...f, basePrice: e.target.value }))}
                />
              </label>
              <label className="admin-field">
                <span>{t("products.sale_price")}</span>
                <input
                  type="number"
                  value={form.salePrice}
                  onChange={(e) => setForm((f) => ({ ...f, salePrice: e.target.value }))}
                />
              </label>
              <label className="admin-field">
                <span>{t("products.cost_price")}</span>
                <input
                  type="number"
                  value={form.costPrice}
                  onChange={(e) => setForm((f) => ({ ...f, costPrice: e.target.value }))}
                />
              </label>
              <label className="admin-field">
                <span>{editing ? t("products.stock_current") : t("products.stock_label")}</span>
                <input
                  type="number"
                  value={form.initialStock}
                  onChange={(e) => setForm((f) => ({ ...f, initialStock: e.target.value }))}
                  disabled={!!editing}
                />
              </label>
            </div>

            {!editing && (
              <div className="form-row" style={{ marginTop: 16 }}>
                <label className="admin-field">
                  <span>{t("products.size")}</span>
                  <select
                    value={form.initialSizeId}
                    onChange={(e) => setForm(f => ({ ...f, initialSizeId: e.target.value }))}
                  >
                    <option value="">-- Size --</option>
                    {sizes.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </label>
                <label className="admin-field">
                  <span>{t("products.color")}</span>
                  <select
                    value={form.initialColorId}
                    onChange={(e) => setForm(f => ({ ...f, initialColorId: e.target.value }))}
                  >
                    <option value="">-- Color --</option>
                    {colors.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </label>
              </div>
            )}
          </div>

          {/* Description */}
          <div className="form-group">
            <div className="form-group-title">
              {t("products.section_description")}
              <button
                type="button"
                className="btnGhost"
                style={{ fontSize: 10, padding: '2px 8px', marginLeft: 8 }}
                disabled={!form.name || aiLoading.description}
                onClick={async () => {
                  setAiLoading(prev => ({ ...prev, description: true }));
                  try {
                    const categoryName = categories.find(c => String(c.id) === form.categoryId)?.name || '';
                    const res = await aiAPI.generateDescription(form.name, categoryName);
                    if (res.success && res.generatedDescription) {
                      setForm(f => ({ ...f, description: res.generatedDescription }));
                    }
                  } finally {
                    setAiLoading(prev => ({ ...prev, description: false }));
                  }
                }}
              >
                {aiLoading.description ? "..." : "AI ✨"}
              </button>
            </div>
            <div className="form-row">
              <label className="admin-field full">
                <span>{t("products.short_desc")}</span>
                <input
                  value={form.shortDescription}
                  onChange={(e) => setForm((f) => ({ ...f, shortDescription: e.target.value }))}
                />
              </label>
            </div>
            <div className="form-row" style={{ marginTop: 16 }}>
              <label className="admin-field full">
                <span>{t("products.full_desc")}</span>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  rows={4}
                />
              </label>
            </div>
          </div>

          {/* Status Toggles */}
          <div className="toggle-group">
            <label className="admin-toggle">
              <input
                type="checkbox"
                hidden
                checked={form.isFeatured}
                onChange={(e) => setForm((f) => ({ ...f, isFeatured: e.target.checked }))}
              />
              <div className="toggle-slider"></div>
              <div className="toggle-label">
                <span className="toggle-title">{t("products.is_featured")}</span>
                <span className="toggle-desc">Hiện trang chủ</span>
              </div>
            </label>

            <label className="admin-toggle">
              <input
                type="checkbox"
                hidden
                checked={form.isNew}
                onChange={(e) => setForm((f) => ({ ...f, isNew: e.target.checked }))}
              />
              <div className="toggle-slider"></div>
              <div className="toggle-label">
                <span className="toggle-title">{t("products.is_new")}</span>
                <span className="toggle-desc">Tag "Mới"</span>
              </div>
            </label>

            <div className="admin-hint-box" style={{ flex: '1 0 100%', marginTop: '16px', padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: 8, border: '1px dashed var(--admin-border)' }}>
              <span style={{ fontSize: '12px', color: 'var(--admin-accent)', fontWeight: 600 }}>💡 Lưu ý:</span>
              <p style={{ fontSize: '11px', color: 'var(--admin-text-muted)', marginTop: '4px' }}>
                Tính năng Flash Sale đã được chuyển sang mục riêng. Để quản lý giá sale và thời gian cho sản phẩm này, vui lòng truy cập <b>Marketing &gt; Flash Sale</b>.
              </p>
            </div>

            <label className="admin-toggle">
              <input
                type="checkbox"
                hidden
                checked={form.status === "ACTIVE"}
                onChange={(e) => setForm((f) => ({ ...f, status: e.target.checked ? "ACTIVE" : "INACTIVE" }))}
              />
              <div className="toggle-slider"></div>
              <div className="toggle-label">
                <span className="toggle-title">{t("common.activated")}</span>
                <span className="toggle-desc">Đang kinh doanh</span>
              </div>
            </label>
          </div>

          {/* Inline Gallery */}
          {editing && (
            <>
              <div className="form-group-title" style={{ marginTop: 24 }}>{t("products.images")}</div>
              <div className="inlineGallery">
                <div className="image-grid">
                  {editing.images && editing.images.length > 0 ? (
                    editing.images.map((img) => (
                      <div key={img.id} className="image-item">
                        <img src={getAssetUrl(img.imageUrl)} alt="product" />
                        <button
                          type="button"
                          className="delete-img-btn"
                          onClick={async () => {
                            const confirmed = await showConfirm(t("common.confirm_delete_title"), t("products.gallery_delete_confirm"));
                            if (!confirmed) return;
                            try {
                              await productAPI.deleteImage(editing.id, img.id);
                              await loadProducts();
                            } catch (err) {
                              showToast(t("products.msg_delete_error") + ": " + err.message, "error");
                            }
                          }}
                        >
                          <CloseIcon />
                        </button>
                      </div>
                    ))
                  ) : (
                    <div className="no-images-text">{t("products.no_images")}</div>
                  )}
                </div>
                <label className="upload-btn">
                  <input
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file || !editing) return;
                      try {
                        await productAPI.uploadImage(editing.id, file);
                        await loadProducts();
                      } catch (err) {
                        showToast(t("products.msg_save_error") + ": " + err.message, "error");
                      }
                      e.target.value = '';
                    }}
                  />
                  {t("products.btn_add_image")}
                </label>
              </div>
              <p style={{ fontSize: 11, color: 'var(--admin-text-muted-2)', marginTop: 8 }}>
                {t("products.manage_gallery_hint")}
              </p>
            </>
          )}

          {!editing && (
            <p style={{ fontSize: 12, color: 'var(--admin-text-muted)', marginTop: 16, padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: 8, border: '1px dashed var(--admin-border)' }}>
              {t("products.add_images_hint")}
            </p>
          )}
        </div>

        <div className="modalActions">
          <button className="btnGhost" type="button" onClick={() => setEditOpen(false)}>{t("common.cancel")}</button>
          <button className="btnPrimary" type="button" onClick={save}>{t("common.save")}</button>
        </div>
      </Modal>

      {/* Image Gallery Modal */}
      <ImageGalleryModal
        open={galleryOpen}
        product={galleryProduct}
        onClose={() => setGalleryOpen(false)}
        onSave={handleSaveImages}
        loadProducts={loadProducts}
      />

      {/* Import Products Modal */}
      <ImportProducts
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onSuccess={() => loadProducts()}
      />
    </div>
  );
}
