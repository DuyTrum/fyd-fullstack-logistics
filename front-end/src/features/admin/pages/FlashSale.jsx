import { useState, useEffect, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import { flashSaleAdminAPI, productAPI, formatVND, getAssetUrl, aiAPI } from "@shared/utils/api.js";
import { useToast } from "@shared/context/ToastContext";
import { useConfirm } from "@shared/context/ConfirmContext";
import { useTranslation } from "react-i18next";
import "../styles/flash-sale-admin.css";
import "../styles/admin-forms.css";

// SVG Icons
const FlashIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
  </svg>
);
const PlusIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);
const TrashIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
  </svg>
);
const EditIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);
const CloseIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M18 6L6 18M6 6l12 12" />
  </svg>
);
const SearchIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
  </svg>
);
const AiIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 2l2.4 7.4H22l-6.2 4.5L18.2 21 12 16.5 5.8 21l2.4-7.1L2 9.4h7.6z" />
  </svg>
);

const PLACEHOLDER_IMG = "https://placehold.co/80x80/1a1a2e/666?text=No+Img";

function Modal({ open, title, children, onClose, maxWidth = 600 }) {
  if (!open) return null;
  return createPortal(
    <div className="modalBackdrop" onMouseDown={onClose}>
      <div className="modal" style={{ maxWidth }} onMouseDown={(e) => e.stopPropagation()}>
        <div className="modalHead">
          <div className="modalTitle">{title}</div>
          <button className="iconBtn" type="button" onClick={onClose}><CloseIcon /></button>
        </div>
        <div className="modalBody">{children}</div>
      </div>
    </div>,
    document.body
  );
}

function StatusBadge({ status }) {
  const map = {
    RUNNING: { label: "ĐANG CHẠY", cls: "fs-badge-running" },
    UPCOMING: { label: "SẮP DIỄN RA", cls: "fs-badge-upcoming" },
    ENDED: { label: "ĐÃ KẾT THÚC", cls: "fs-badge-ended" },
    INACTIVE: { label: "TẮT", cls: "fs-badge-inactive" },
  };
  const info = map[status] || map.INACTIVE;
  return <span className={`fs-status-badge ${info.cls}`}>{info.label}</span>;
}

function CountdownDisplay({ endTime, startTime, status }) {
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    if (!endTime && !startTime) return;
    const target = status === "UPCOMING" ? new Date(startTime) : new Date(endTime);
    const label = status === "UPCOMING" ? "Bắt đầu sau" : "Kết thúc sau";

    const timer = setInterval(() => {
      const now = Date.now();
      const dist = target.getTime() - now;
      if (dist <= 0) {
        setTimeLeft(status === "UPCOMING" ? "Đang bắt đầu..." : "Đã kết thúc");
        clearInterval(timer);
        return;
      }
      const h = Math.floor(dist / 3600000);
      const m = Math.floor((dist % 3600000) / 60000);
      const s = Math.floor((dist % 60000) / 1000);
      setTimeLeft(`${label}: ${h}h ${String(m).padStart(2, "0")}m ${String(s).padStart(2, "0")}s`);
    }, 1000);
    return () => clearInterval(timer);
  }, [endTime, startTime, status]);

  if (!timeLeft) return null;
  return <div className="fs-countdown">{timeLeft}</div>;
}

function parseAiResponse(text) {
  if (!text) return { items: [], summary: "" };

  const items = [];
  const lines = text.split("\n");
  
  let currentItem = null;
  const summaryParts = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    // Check if line matches product title: 📦 **[Name]** (ID: [id])
    const titleMatch = line.match(/(?:📦)?\s*\*\*(.*?)\*\*\s*\(ID:\s*(\d+)\)/i);
    
    if (titleMatch) {
      if (currentItem) {
        items.push(currentItem);
      }
      currentItem = {
        name: titleMatch[1].trim(),
        id: parseInt(titleMatch[2]),
        originalPrice: 0,
        salePrice: 0,
        discount: 0,
        reason: ""
      };
    } else if (currentItem) {
      // Look for original price and sale price
      const priceMatch = line.match(/(?:-\s*)?Giá gốc:\s*([\d.,]+)\s*đ?\s*→\s*Giá Flash Sale đề xuất:\s*([\d.,]+)\s*đ?\s*\(giảm\s*(\d+)\s*%\)/i);
      const altPriceMatch = line.match(/(?:Original|Giá gốc):\s*([\d.,]+)[\s\S]*?(?:Sale|Giá Flash Sale đề xuất):\s*([\d.,]+)[\s\S]*?(\d+)\s*%/i);
      const actualPriceMatch = priceMatch || altPriceMatch;
      
      if (actualPriceMatch) {
        const origStr = actualPriceMatch[1].replace(/[.,]/g, "");
        const saleStr = actualPriceMatch[2].replace(/[.,]/g, "");
        currentItem.originalPrice = parseInt(origStr) || 0;
        currentItem.salePrice = parseInt(saleStr) || 0;
        currentItem.discount = parseInt(actualPriceMatch[3]) || 0;
      } else if (line.match(/(?:-\s*)?Lý do:\s*(.*)/i)) {
        currentItem.reason = line.match(/(?:-\s*)?Lý do:\s*(.*)/i)[1].trim();
      } else if (!line.startsWith("###")) {
        if (currentItem.reason) {
          currentItem.reason += " " + line;
        } else {
          currentItem.reason = line;
        }
      }
    } else {
      if (!line.startsWith("###")) {
        summaryParts.push(line);
      }
    }
  }
  
  if (currentItem) {
    items.push(currentItem);
  }
  
  const cleanSummary = summaryParts
    .filter(line => !line.includes("Giá gốc") && !line.includes("Lý do") && !line.includes("đ →"))
    .join("\n\n");
    
  return { items, summary: cleanSummary };
}

export default function FlashSale() {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const { showConfirm } = useConfirm();

  const [configs, setConfigs] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [itemsLoading, setItemsLoading] = useState(false);

  // Config form
  const [configModalOpen, setConfigModalOpen] = useState(false);
  const [editingConfigId, setEditingConfigId] = useState(null);
  const [configForm, setConfigForm] = useState({
    name: "", startTime: "", endTime: "", isActive: false, discountLabel: "FLASH SALE"
  });

  // Add product modal
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [allProducts, setAllProducts] = useState([]);
  const [productSearch, setProductSearch] = useState("");
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [addSalePrice, setAddSalePrice] = useState("");

  // AI Suggestions
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState(null);
  const [aiError, setAiError] = useState("");
  const [parsedItems, setParsedItems] = useState([]);
  const [checkedIds, setCheckedIds] = useState(new Set());
  const [modalCampaignId, setModalCampaignId] = useState("");
  const [applyLoading, setApplyLoading] = useState(false);
  const [overallSummary, setOverallSummary] = useState("");

  // Load configs
  const loadConfigs = useCallback(async () => {
    try {
      setLoading(true);
      const data = await flashSaleAdminAPI.getConfigs();
      setConfigs(data || []);
      // Auto-select first config
      if (data?.length > 0 && !selectedId) {
        setSelectedId(data[0].id);
      }
    } catch (err) {
      console.error("Failed to load flash sale configs:", err);
      showToast("Lỗi tải cấu hình Flash Sale", "error");
    } finally {
      setLoading(false);
    }
  }, [selectedId, showToast]);

  // Load items for selected config
  const loadItems = useCallback(async (configId) => {
    if (!configId) return;
    try {
      setItemsLoading(true);
      const data = await flashSaleAdminAPI.getItems(configId);
      setItems(data || []);
    } catch (err) {
      console.error("Failed to load items:", err);
    } finally {
      setItemsLoading(false);
    }
  }, []);

  useEffect(() => { loadConfigs(); }, []);
  useEffect(() => { if (selectedId) loadItems(selectedId); }, [selectedId, loadItems]);

  const selectedConfig = useMemo(() => configs.find(c => c.id === selectedId), [configs, selectedId]);

  // Config CRUD
  const openCreateConfig = () => {
    setEditingConfigId(null);
    setConfigForm({ name: "", startTime: "", endTime: "", isActive: false, discountLabel: "FLASH SALE" });
    setConfigModalOpen(true);
  };

  const openEditConfig = (config) => {
    setEditingConfigId(config.id);
    setConfigForm({
      name: config.name || "",
      startTime: config.startTime ? config.startTime.replace(' ', 'T').substring(0, 16) : "",
      endTime: config.endTime ? config.endTime.replace(' ', 'T').substring(0, 16) : "",
      isActive: config.isActive === true,
      discountLabel: config.discountLabel || "FLASH SALE"
    });
    setConfigModalOpen(true);
  };

  const saveConfig = async () => {
    if (!configForm.name.trim() || !configForm.startTime || !configForm.endTime) {
      showToast("Vui lòng điền đầy đủ thông tin", "error");
      return;
    }
    try {
      const payload = {
        name: configForm.name.trim(),
        startTime: configForm.startTime ? configForm.startTime.replace(' ', 'T').substring(0, 16) + ':00' : null,
        endTime: configForm.endTime ? configForm.endTime.replace(' ', 'T').substring(0, 16) + ':00' : null,
        isActive: configForm.isActive,
        discountLabel: configForm.discountLabel.trim() || "FLASH SALE"
      };
      if (editingConfigId) {
        await flashSaleAdminAPI.updateConfig(editingConfigId, payload);
        showToast("Cập nhật Flash Sale thành công");
      } else {
        const created = await flashSaleAdminAPI.createConfig(payload);
        setSelectedId(created.id);
        showToast("Tạo Flash Sale thành công");
      }
      setConfigModalOpen(false);
      await loadConfigs();
    } catch (err) {
      showToast("Lỗi: " + (err.message || "Không thể lưu"), "error");
    }
  };

  const deleteConfig = async (config) => {
    const confirmed = await showConfirm("Xóa Flash Sale", `Bạn có chắc muốn xóa "${config.name}"? Tất cả sản phẩm trong chương trình sẽ bị xóa.`);
    if (!confirmed) return;
    try {
      await flashSaleAdminAPI.deleteConfig(config.id);
      if (selectedId === config.id) setSelectedId(configs.find(c => c.id !== config.id)?.id || null);
      showToast("Đã xóa Flash Sale");
      await loadConfigs();
    } catch (err) {
      showToast("Lỗi xóa: " + err.message, "error");
    }
  };

  const toggleActive = async (config) => {
    try {
      await flashSaleAdminAPI.updateConfig(config.id, { isActive: !config.isActive });
      showToast(config.isActive ? "Đã tắt Flash Sale" : "Đã bật Flash Sale");
      await loadConfigs();
    } catch (err) {
      showToast("Lỗi: " + err.message, "error");
    }
  };

  // Add product
  const openAddProduct = async () => {
    setAddModalOpen(true);
    setSelectedProduct(null);
    setAddSalePrice("");
    setProductSearch("");
    try {
      const data = await productAPI.getAll({ size: 200 });
      setAllProducts(data.products || []);
    } catch (err) {
      console.error("Failed to load products:", err);
    }
  };

  const filteredProducts = useMemo(() => {
    const existingIds = new Set(items.map(i => i.productId));
    return allProducts
      .filter(p => !existingIds.has(p.id))
      .filter(p => {
        if (!productSearch) return true;
        const text = `${p.sku} ${p.name} ${p.category || ""}`.toLowerCase();
        return text.includes(productSearch.toLowerCase());
      });
  }, [allProducts, items, productSearch]);

  const addProduct = async () => {
    if (!selectedProduct || !addSalePrice) {
      showToast("Vui lòng chọn sản phẩm và nhập giá sale", "error");
      return;
    }
    try {
      await flashSaleAdminAPI.addItem({
        configId: selectedId,
        productId: selectedProduct.id,
        salePrice: Number(addSalePrice)
      });
      showToast(`Đã thêm "${selectedProduct.name}" vào Flash Sale`);
      setAddModalOpen(false);
      await loadItems(selectedId);
      await loadConfigs(); // Update item count
    } catch (err) {
      showToast("Lỗi: " + (err.data?.error || err.message), "error");
    }
  };

  const removeItem = async (item) => {
    const confirmed = await showConfirm("Xóa sản phẩm", `Xóa "${item.productName}" khỏi Flash Sale?`);
    if (!confirmed) return;
    try {
      await flashSaleAdminAPI.deleteItem(item.id);
      showToast("Đã xóa sản phẩm khỏi Flash Sale");
      await loadItems(selectedId);
      await loadConfigs();
    } catch (err) {
      showToast("Lỗi: " + err.message, "error");
    }
  };

  // AI Flash Sale Suggestions
  const fetchAiSuggestions = async () => {
    setAiModalOpen(true);
    setAiLoading(true);
    setAiResult(null);
    setAiError("");
    setParsedItems([]);
    setCheckedIds(new Set());
    setOverallSummary("");

    // Ensure all products are loaded so we can map high-res image URLs
    let loadedProducts = allProducts;
    if (allProducts.length === 0) {
      try {
        const data = await productAPI.getAll({ size: 200 });
        loadedProducts = data.products || [];
        setAllProducts(loadedProducts);
      } catch (err) {
        console.error("Failed to load products for AI mapping:", err);
      }
    }

    try {
      const response = await aiAPI.getFlashSaleSuggestions();
      if (response.success) {
        setAiResult(response.reply);
        const { items, summary } = parseAiResponse(response.reply);
        
        // Match original prices from loadedProducts if not parsed correctly
        const updatedItems = items.map(item => {
          const matchedProd = loadedProducts.find(p => p.id === item.id);
          if (matchedProd) {
            const originalPrice = matchedProd.basePrice || item.originalPrice;
            const salePrice = item.salePrice || Math.round(originalPrice * 0.8 / 1000) * 1000;
            const discount = originalPrice > 0 ? Math.round((1 - salePrice / originalPrice) * 100) : 0;
            return {
              ...item,
              originalPrice,
              salePrice,
              discount,
              imageUrl: matchedProd.images?.[0]?.imageUrl || matchedProd.imageUrl
            };
          }
          return item;
        });

        setParsedItems(updatedItems);
        setOverallSummary(summary);
        setCheckedIds(new Set(updatedItems.map(item => item.id)));
        setModalCampaignId(selectedId || (configs.length > 0 ? configs[0].id : ""));
      } else {
        setAiError(response.error || "Không thể lấy gợi ý từ AI");
      }
    } catch (err) {
      setAiError("Lỗi kết nối AI: " + (err.message || "Vui lòng thử lại"));
    } finally {
      setAiLoading(false);
    }
  };

  const handleToggleCheck = (id) => {
    setCheckedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleToggleCheckAll = () => {
    if (checkedIds.size === parsedItems.length) {
      setCheckedIds(new Set());
    } else {
      setCheckedIds(new Set(parsedItems.map(item => item.id)));
    }
  };

  const handlePriceChange = (id, value) => {
    const numeric = Number(value);
    setParsedItems(prev => prev.map(item => {
      if (item.id === id) {
        const salePrice = isNaN(numeric) ? 0 : numeric;
        const discount = item.originalPrice > 0 ? Math.round((1 - salePrice / item.originalPrice) * 100) : 0;
        return { ...item, salePrice, discount };
      }
      return item;
    }));
  };

  const handleApplySuggestions = async () => {
    const targetCampaignId = Number(modalCampaignId);
    if (!targetCampaignId) {
      showToast("Vui lòng chọn hoặc tạo chương trình Flash Sale trước", "error");
      return;
    }

    const itemsToAdd = parsedItems.filter(item => checkedIds.has(item.id));
    if (itemsToAdd.length === 0) {
      showToast("Vui lòng chọn ít nhất một sản phẩm", "error");
      return;
    }

    setApplyLoading(true);
    let successCount = 0;
    let failCount = 0;
    const errorMessages = [];

    for (const item of itemsToAdd) {
      try {
        await flashSaleAdminAPI.addItem({
          configId: targetCampaignId,
          productId: item.id,
          salePrice: Number(item.salePrice)
        });
        successCount++;
      } catch (err) {
        failCount++;
        const errMsg = err.data?.error || err.message || "Lỗi không xác định";
        errorMessages.push(`${item.name}: ${errMsg}`);
      }
    }

    setApplyLoading(false);
    if (successCount > 0) {
      showToast(`Đã thêm thành công ${successCount} sản phẩm vào Flash Sale`);
      setAiModalOpen(false);
      
      // Update selected campaign and reload items
      if (targetCampaignId === selectedId) {
        await loadItems(selectedId);
      } else {
        setSelectedId(targetCampaignId);
      }
      await loadConfigs();
    }

    if (failCount > 0) {
      showToast(`Thất bại ${failCount} sản phẩm. Chi tiết: ${errorMessages.join(", ")}`, "error");
    }
  };

  const formatDate = (str) => {
    if (!str) return "";
    return new Date(str).toLocaleString("vi-VN", {
      day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit"
    });
  };

  if (loading) {
    return (
      <div className="fs-admin-page page-container">
        <div className="loading-state">Đang tải...</div>
      </div>
    );
  }

  return (
    <div className="fs-admin-page page-container">
      {/* Header */}
      <div className="fs-page-header">
        <div className="fs-header-left">
          <div className="fs-header-icon"><FlashIcon /></div>
          <div>
            <h1 className="fs-page-title">Flash Sale Manager</h1>
            <p className="fs-page-subtitle">{configs.length} chương trình • Quản lý Flash Sale tập trung</p>
          </div>
        </div>
        <div className="fs-header-actions">
          <button className="fs-btn-ai" type="button" onClick={fetchAiSuggestions}>
            <AiIcon /> <span>🤖 AI Đề xuất</span>
          </button>
          <button className="fs-btn-create" type="button" onClick={openCreateConfig}>
            <PlusIcon /> <span>Tạo Flash Sale</span>
          </button>
        </div>
      </div>

      {/* Campaign Selection */}
      {configs.length > 0 && (
        <div className="fs-campaigns">
          {configs.map(c => (
            <button
              key={c.id}
              type="button"
              className={`fs-campaign-card ${selectedId === c.id ? "active" : ""}`}
              onClick={() => setSelectedId(c.id)}
            >
              <div className="fs-campaign-top">
                <span className="fs-campaign-name">{c.name}</span>
                <StatusBadge status={c.status} />
              </div>
              <div className="fs-campaign-meta">
                <span>{formatDate(c.startTime)}</span>
                <span className="fs-meta-sep">→</span>
                <span>{formatDate(c.endTime)}</span>
              </div>
              <div className="fs-campaign-stats">
                <span>⚡ {c.itemCount || 0} sản phẩm</span>
              </div>
            </button>
          ))}
        </div>
      )}

      {configs.length === 0 && (
        <div className="fs-empty-state">
          <div className="fs-empty-icon"><FlashIcon /></div>
          <h3>Chưa có Flash Sale nào</h3>
          <p>Tạo chương trình Flash Sale đầu tiên để bắt đầu</p>
          <button className="fs-btn-create" type="button" onClick={openCreateConfig}>
            <PlusIcon /> <span>Tạo Flash Sale</span>
          </button>
        </div>
      )}

      {/* Selected Campaign Details */}
      {selectedConfig && (
        <div className="fs-detail-section">
          {/* Config Actions Bar */}
          <div className="fs-detail-header">
            <div className="fs-detail-title">
              <h2>{selectedConfig.name}</h2>
              <StatusBadge status={selectedConfig.status} />
              {(selectedConfig.status === "RUNNING" || selectedConfig.status === "UPCOMING") && (
                <CountdownDisplay
                  endTime={selectedConfig.endTime}
                  startTime={selectedConfig.startTime}
                  status={selectedConfig.status}
                />
              )}
            </div>
            <div className="fs-detail-actions">
              <button
                type="button"
                className={`fs-toggle-btn ${selectedConfig.isActive ? "active" : ""}`}
                onClick={() => toggleActive(selectedConfig)}
              >
                <div className="fs-toggle-track">
                  <div className="fs-toggle-thumb"></div>
                </div>
                <span>{selectedConfig.isActive ? "Đang bật" : "Đang tắt"}</span>
              </button>
              <button type="button" className="fs-action-btn" onClick={() => openEditConfig(selectedConfig)}>
                <EditIcon /> <span>Sửa</span>
              </button>
              <button type="button" className="fs-action-btn danger" onClick={() => deleteConfig(selectedConfig)}>
                <TrashIcon /> <span>Xóa</span>
              </button>
            </div>
          </div>

          {/* Time Info */}
          <div className="fs-time-bar">
            <div className="fs-time-item">
              <span className="fs-time-label">Bắt đầu</span>
              <span className="fs-time-value">{formatDate(selectedConfig.startTime)}</span>
            </div>
            <div className="fs-time-arrow">→</div>
            <div className="fs-time-item">
              <span className="fs-time-label">Kết thúc</span>
              <span className="fs-time-value">{formatDate(selectedConfig.endTime)}</span>
            </div>
          </div>

          {/* Products Table */}
          <div className="fs-products-section">
            <div className="fs-products-header">
              <h3>Sản phẩm Flash Sale ({items.length})</h3>
              <button type="button" className="fs-btn-add-product" onClick={openAddProduct}>
                <PlusIcon /> Thêm sản phẩm
              </button>
            </div>

            {itemsLoading ? (
              <div className="fs-loading">Đang tải sản phẩm...</div>
            ) : items.length === 0 ? (
              <div className="fs-empty-products">
                <p>Chưa có sản phẩm nào trong chương trình này</p>
                <button type="button" className="fs-btn-add-product" onClick={openAddProduct}>
                  <PlusIcon /> Thêm sản phẩm đầu tiên
                </button>
              </div>
            ) : (
              <div className="fs-products-table">
                <div className="fs-table-header">
                  <div className="fs-col-img"></div>
                  <div className="fs-col-name">Sản phẩm</div>
                  <div className="fs-col-price">Giá gốc</div>
                  <div className="fs-col-price">Giá Flash Sale</div>
                  <div className="fs-col-discount">Giảm</div>
                  <div className="fs-col-action">Thao tác</div>
                </div>
                {items.map(item => (
                  <div key={item.id} className="fs-table-row">
                    <div className="fs-col-img">
                      <img
                        src={item.imageUrl ? getAssetUrl(item.imageUrl) : PLACEHOLDER_IMG}
                        alt={item.productName}
                        className="fs-product-thumb"
                      />
                    </div>
                    <div className="fs-col-name">
                      <span className="fs-product-name">{item.productName}</span>
                      <span className="fs-product-sku">{item.productSku} • {item.category || "N/A"}</span>
                    </div>
                    <div className="fs-col-price">
                      <span className="fs-price-original">{formatVND(item.basePrice)}</span>
                    </div>
                    <div className="fs-col-price">
                      <span className="fs-price-sale">{formatVND(item.salePrice)}</span>
                    </div>
                    <div className="fs-col-discount">
                      <span className="fs-discount-badge">-{item.discountPercent}%</span>
                    </div>
                    <div className="fs-col-action">
                      <button
                        type="button"
                        className="fs-action-btn danger small"
                        onClick={() => removeItem(item)}
                      >
                        <TrashIcon />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Config Modal */}
      <Modal
        open={configModalOpen}
        title={editingConfigId ? "Sửa Flash Sale" : "Tạo Flash Sale mới"}
        onClose={() => setConfigModalOpen(false)}
      >
        <div className="premium-form">
          <div className="form-group">
            <div className="form-group-title">Thông tin chương trình</div>
            <div className="form-row">
              <label className="admin-field">
                <span>Tên chương trình *</span>
                <input
                  value={configForm.name}
                  onChange={(e) => setConfigForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="VD: Flash Sale 9.9"
                />
              </label>
              <label className="admin-field">
                <span>Nhãn hiển thị</span>
                <input
                  value={configForm.discountLabel}
                  onChange={(e) => setConfigForm(f => ({ ...f, discountLabel: e.target.value }))}
                  placeholder="FLASH SALE"
                />
              </label>
            </div>
            <div className="form-row" style={{ marginTop: 16 }}>
              <label className="admin-field">
                <span>Bắt đầu *</span>
                <input
                  type="datetime-local"
                  value={configForm.startTime}
                  onChange={(e) => setConfigForm(f => ({ ...f, startTime: e.target.value }))}
                />
              </label>
              <label className="admin-field">
                <span>Kết thúc *</span>
                <input
                  type="datetime-local"
                  value={configForm.endTime}
                  onChange={(e) => setConfigForm(f => ({ ...f, endTime: e.target.value }))}
                />
              </label>
            </div>
          </div>

          <div className="toggle-group" style={{ gridTemplateColumns: "1fr" }}>
            <label className={`admin-toggle ${configForm.isActive ? "flash-sale-highlight" : ""}`}>
              <input
                type="checkbox"
                hidden
                checked={configForm.isActive}
                onChange={(e) => setConfigForm(f => ({ ...f, isActive: e.target.checked }))}
              />
              <div className="toggle-slider"></div>
              <div className="toggle-label">
                <span className="toggle-title">Kích hoạt chương trình</span>
                <span className="toggle-desc">⚡ Flash Sale sẽ hiển thị trên Shop khi bật</span>
              </div>
            </label>
          </div>
        </div>

        <div className="modalActions">
          <button className="btnGhost" type="button" onClick={() => setConfigModalOpen(false)}>Hủy</button>
          <button className="btnPrimary" type="button" onClick={saveConfig}>
            {editingConfigId ? "Cập nhật" : "Tạo mới"}
          </button>
        </div>
      </Modal>

      {/* Add Product Modal */}
      <Modal
        open={addModalOpen}
        title="Thêm sản phẩm vào Flash Sale"
        onClose={() => setAddModalOpen(false)}
        maxWidth={700}
      >
        <div className="fs-add-modal">
          {/* Search */}
          <div className="fs-search-box">
            <SearchIcon />
            <input
              value={productSearch}
              onChange={(e) => setProductSearch(e.target.value)}
              placeholder="Tìm SKU, tên sản phẩm..."
            />
          </div>

          {/* Product list */}
          <div className="fs-product-list">
            {filteredProducts.slice(0, 20).map(p => {
              const isSelected = selectedProduct?.id === p.id;
              const imgUrl = p.images?.length > 0 ? getAssetUrl(p.images[0].imageUrl) : PLACEHOLDER_IMG;
              return (
                <div
                  key={p.id}
                  className={`fs-product-option ${isSelected ? "selected" : ""}`}
                  onClick={() => { setSelectedProduct(p); setAddSalePrice(""); }}
                >
                  <img src={imgUrl} alt={p.name} className="fs-opt-img" />
                  <div className="fs-opt-info">
                    <span className="fs-opt-name">{p.name}</span>
                    <span className="fs-opt-meta">{p.sku} • {p.category || "N/A"}</span>
                  </div>
                  <span className="fs-opt-price">{formatVND(p.basePrice)}</span>
                </div>
              );
            })}
            {filteredProducts.length === 0 && (
              <div className="fs-no-products">Không tìm thấy sản phẩm phù hợp</div>
            )}
          </div>

          {/* Sale price input */}
          {selectedProduct && (
            <div className="fs-sale-price-section">
              <div className="fs-selected-info">
                <strong>Đã chọn:</strong> {selectedProduct.name}
                <span className="fs-base-price">Giá gốc: {formatVND(selectedProduct.basePrice)}</span>
              </div>
              <div className="form-row" style={{ marginTop: 12 }}>
                <label className="admin-field">
                  <span>Giá Flash Sale (VND) *</span>
                  <input
                    type="number"
                    value={addSalePrice}
                    onChange={(e) => setAddSalePrice(e.target.value)}
                    placeholder={`Phải nhỏ hơn ${selectedProduct.basePrice}`}
                  />
                </label>
                <div className="fs-discount-preview">
                  {addSalePrice && Number(addSalePrice) > 0 && Number(addSalePrice) < selectedProduct.basePrice && (
                    <span className="fs-discount-badge large">
                      -{Math.round((1 - Number(addSalePrice) / selectedProduct.basePrice) * 100)}%
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="modalActions">
          <button className="btnGhost" type="button" onClick={() => setAddModalOpen(false)}>Hủy</button>
          <button
            className="btnPrimary"
            type="button"
            onClick={addProduct}
            disabled={!selectedProduct || !addSalePrice}
          >
            Thêm vào Flash Sale
          </button>
        </div>
      </Modal>

      {/* AI Suggestions Modal */}
      <Modal
        open={aiModalOpen}
        title="🤖 AI Đề xuất sản phẩm Flash Sale"
        onClose={() => setAiModalOpen(false)}
        maxWidth={750}
      >
        <div className="fs-ai-modal">
          {aiLoading && (
            <div className="fs-ai-loading">
              <div className="fs-ai-spinner"></div>
              <p>AI đang phân tích doanh số và tồn kho...</p>
              <small>Quá trình này có thể mất 10-20 giây</small>
            </div>
          )}
          {aiError && (
            <div className="fs-ai-error">
              <p>❌ {aiError}</p>
              <button type="button" className="fs-btn-ai" onClick={fetchAiSuggestions}>
                Thử lại
              </button>
            </div>
          )}
          {aiResult && (
            <div className="fs-ai-result">
              <div className="fs-ai-badge">✨ Phân tích bởi AI</div>
              
              {overallSummary && (
                <div className="fs-ai-content" style={{ marginBottom: 20, maxHeight: 180 }}>
                  {overallSummary}
                </div>
              )}

              {/* Campaign Selector */}
              <div className="fs-ai-campaign-selector">
                <label>
                  <span>Thêm vào chương trình Flash Sale:</span>
                  <select 
                    value={modalCampaignId} 
                    onChange={(e) => setModalCampaignId(e.target.value)}
                  >
                    <option value="" disabled>-- Chọn chương trình --</option>
                    {configs.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.status === 'RUNNING' ? 'Đang chạy' : c.status === 'UPCOMING' ? 'Sắp diễn ra' : 'Đã kết thúc'})
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              {/* Recommendations Checklist */}
              {parsedItems.length > 0 ? (
                <div className="fs-ai-recommendations-list">
                  <div className="fs-ai-list-header">
                    <label className="fs-ai-check-all">
                      <input 
                        type="checkbox" 
                        checked={checkedIds.size === parsedItems.length && parsedItems.length > 0}
                        onChange={handleToggleCheckAll}
                      />
                      <span>Chọn tất cả ({parsedItems.length})</span>
                    </label>
                  </div>
                  
                  <div className="fs-ai-items">
                    {parsedItems.map(item => {
                      const isChecked = checkedIds.has(item.id);
                      const imgUrl = item.imageUrl ? getAssetUrl(item.imageUrl) : PLACEHOLDER_IMG;
                      return (
                        <div key={item.id} className={`fs-ai-item-card ${isChecked ? 'selected' : ''}`}>
                          <div className="fs-ai-item-checkbox">
                            <input 
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => handleToggleCheck(item.id)}
                            />
                          </div>
                          
                          <img src={imgUrl} alt={item.name} className="fs-ai-item-img" />
                          
                          <div className="fs-ai-item-details">
                            <div className="fs-ai-item-name">{item.name} (ID: {item.id})</div>
                            <div className="fs-ai-item-reason">{item.reason}</div>
                            <div className="fs-ai-item-pricing">
                              <div className="fs-ai-price-original">Giá gốc: {formatVND(item.originalPrice)}</div>
                              <div className="fs-ai-price-input-wrapper">
                                <span>Giá Flash Sale đề xuất:</span>
                                <input 
                                  type="number"
                                  value={item.salePrice}
                                  onChange={(e) => handlePriceChange(item.id, e.target.value)}
                                  className="fs-ai-price-input"
                                />
                                {item.discount > 0 && (
                                  <span className="fs-discount-badge">-{item.discount}%</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="fs-no-products">Không thể phân tích danh sách sản phẩm từ phản hồi của AI</div>
              )}

              <div className="fs-ai-modal-footer">
                <button className="btnGhost" type="button" onClick={() => setAiModalOpen(false)}>Hủy</button>
                <button 
                  className="fs-btn-ai-apply" 
                  type="button" 
                  onClick={handleApplySuggestions}
                  disabled={applyLoading || checkedIds.size === 0 || !modalCampaignId}
                >
                  {applyLoading ? "Đang áp dụng..." : `Áp dụng ${checkedIds.size} đề xuất`}
                </button>
              </div>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
