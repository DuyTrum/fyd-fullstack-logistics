import { useState, useEffect, useRef } from "react";
import { useToast } from "@shared/context/ToastContext";
import { useTranslation } from "react-i18next";
import api, { formatVND, formatDate } from "@shared/utils/api.js";
import "../styles/ai-management.css";

// Lucide icon imports
import {
  LayoutDashboard,
  Bot,
  Sparkles,
  TrendingUp,
  BarChart3,
  FileText,
  DollarSign,
  Settings,
  Send,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Plus,
  Trash2,
  ArrowRight,
  Clock,
  Cpu,
  ShieldCheck,
  User,
  Sliders,
  DollarSign as PriceIcon
} from "lucide-react";


export default function AI() {
  const { showToast } = useToast();
  const { t } = useTranslation();

  // Tab State
  const [activeTab, setActiveTab] = useState("dashboard");

  // Global AI Data
  const [metrics, setMetrics] = useState(null);
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load configuration and dashboard metrics
  useEffect(() => {
    loadGlobalData();
  }, []);

  const loadGlobalData = async () => {
    setLoading(true);
    try {
      const [metricsRes, configRes] = await Promise.all([
        api.aiMgmt.getMetrics(),
        api.aiMgmt.getConfig(),
      ]);
      setMetrics(metricsRes);
      setConfig(configRes);
    } catch (err) {
      console.error("Error loading AI Data:", err);
      showToast("Lỗi khi kết nối trung tâm dữ liệu AI", "error");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-spinner-wrapper">
        <div className="spinner-glow"></div>
        <h3 className="admin-title">Đang đồng bộ trung tâm điều khiển AI...</h3>
        <p className="text-muted">Vui lòng đợi trong giây lát</p>
      </div>
    );
  }

  return (
    <div className="ai-mgmt-container animate-fade-in">
      {/* Grid Sub Nav & Content */}
      <div className="ai-mgmt-grid">
        {/* Sub Nav */}
        <aside className="ai-mgmt-sidebar glass-panel">
          <div className="ai-status-badge" style={{ marginBottom: "16px", justifyContent: "center" }}>
            <span className="pulse-dot pulsing"></span>
            <span>Hệ thống AI Hoạt động</span>
          </div>
          <nav className="ai-sub-nav">
            <button
              onClick={() => setActiveTab("dashboard")}
              className={`ai-nav-item ${activeTab === "dashboard" ? "active" : ""}`}
            >
              <LayoutDashboard size={16} />
              <span>Tổng quan</span>
            </button>
            <button
              onClick={() => setActiveTab("assistant")}
              className={`ai-nav-item ${activeTab === "assistant" ? "active" : ""}`}
            >
              <Bot size={16} />
              <span>Trợ lý AI</span>
            </button>
            <button
              onClick={() => setActiveTab("generator")}
              className={`ai-nav-item ${activeTab === "generator" ? "active" : ""}`}
            >
              <Sparkles size={16} />
              <span>Tạo sản phẩm</span>
            </button>
            <button
              onClick={() => setActiveTab("recommendations")}
              className={`ai-nav-item ${activeTab === "recommendations" ? "active" : ""}`}
            >
              <TrendingUp size={16} />
              <span>Đề xuất bán hàng</span>
            </button>
            <button
              onClick={() => setActiveTab("logs")}
              className={`ai-nav-item ${activeTab === "logs" ? "active" : ""}`}
            >
              <FileText size={16} />
              <span>Nhật ký yêu cầu</span>
            </button>
            <button
              onClick={() => setActiveTab("settings")}
              className={`ai-nav-item ${activeTab === "settings" ? "active" : ""}`}
            >
              <Settings size={16} />
              <span>Cấu hình & Key</span>
            </button>
          </nav>
        </aside>

        {/* Content Pane */}
        <main className="ai-mgmt-content glass-panel">
          {activeTab === "dashboard" && (
            <DashboardView metrics={metrics} config={config} refreshData={loadGlobalData} />
          )}
          {activeTab === "assistant" && <AssistantView />}
          {activeTab === "generator" && <GeneratorView />}
          {activeTab === "recommendations" && <RecommendationsView />}
          {activeTab === "logs" && <LogsView />}
          {activeTab === "settings" && (
            <SettingsView config={config} refreshConfig={loadGlobalData} />
          )}
        </main>
      </div>
    </div>
  );
}

/* ============================================================================
   1. DASHBOARD VIEW
   ============================================================================ */
function DashboardView({ metrics, config, refreshData }) {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <h2 className="admin-title" style={{ fontSize: "18px", margin: 0 }}>Chỉ số vận hành hệ thống</h2>
        <button className="admin-btn admin-btn-outline" onClick={refreshData}>
          <RefreshCw size={14} />
          <span>Làm mới</span>
        </button>
      </div>

      {/* Widgets Grid */}
      <div className="widgets-grid">
        <div className="widget-card">
          <div className="widget-header">
            <span className="widget-title">Tổng yêu cầu</span>
            <Cpu className="widget-icon" size={16} />
          </div>
          <div className="widget-value">{metrics?.totalRequests?.toLocaleString() || 0}</div>
          <div className="widget-footer">Lũy kế toàn bộ thời gian</div>
        </div>

        <div className="widget-card">
          <div className="widget-header">
            <span className="widget-title">Số tính năng AI</span>
            <span className="badge positive">4 / 6 active</span>
          </div>
          <div className="widget-value">{metrics?.activeFeaturesCount || 4} Hoạt động</div>
          <div className="widget-footer">Mô hình: {config?.modelName || "llama-3.3"}</div>
        </div>

        <div className="widget-card">
          <div className="widget-header">
            <span className="widget-title">Độ trễ phản hồi</span>
            <Clock className="widget-icon" size={16} />
          </div>
          <div className="widget-value">{metrics?.averageLatency || 0} ms</div>
          <div className="widget-footer">Phản hồi trung bình thành công</div>
        </div>

        <div className="widget-card">
          <div className="widget-header">
            <span className="widget-title">Token đã dùng</span>
            <span className="badge neutral">Prompt + Comp</span>
          </div>
          <div className="widget-value">{(metrics?.totalTokens / 1_000_000).toFixed(2)}M</div>
          <div className="widget-footer">Tích lũy: {metrics?.totalTokens?.toLocaleString()} tokens</div>
        </div>

        <div className="widget-card">
          <div className="widget-header">
            <span className="widget-title">Chi phí tạm tính</span>
            <span className="badge warning">{(config?.currentMonthlySpendUsd / config?.monthlyBudgetUsd * 100).toFixed(0)}% Budget</span>
          </div>
          <div className="widget-value">${(config?.currentMonthlySpendUsd || 0).toFixed(4)}</div>
          <div className="widget-footer">Hạn mức: ${config?.monthlyBudgetUsd?.toFixed(2)}</div>
        </div>

        <div className="widget-card">
          <div className="widget-header">
            <span className="widget-title">Tỷ lệ thành công</span>
            <ShieldCheck className="widget-icon" size={16} />
          </div>
          <div className="widget-value">{metrics?.successRate || 100}%</div>
          <div className="widget-footer">Tỷ lệ lỗi hiện tại cực thấp</div>
        </div>
      </div>

      {/* Feature Health & Quick Actions */}
      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "20px", marginTop: "24px" }}>
        <div className="admin-card">
          <h3 className="admin-title" style={{ fontSize: "16px" }}>Phân bổ yêu cầu theo tính năng</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "16px" }}>
            {metrics?.usageByFeature && Object.keys(metrics.usageByFeature).length > 0 ? (
              Object.entries(metrics.usageByFeature).map(([feature, count]) => (
                <div key={feature} style={{ display: "flex", justifyContent: "space-between", paddingBottom: "10px", borderBottom: "1px solid var(--admin-border)" }}>
                  <span className="mono" style={{ textTransform: "uppercase", fontSize: "13px" }}>{feature}</span>
                  <span style={{ fontWeight: 600 }}>{count.toLocaleString()} lượt</span>
                </div>
              ))
            ) : (
              <p className="text-muted">Chưa có thông tin phân bổ tính năng</p>
            )}
          </div>
        </div>

        <div className="admin-card">
          <h3 className="admin-title" style={{ fontSize: "16px" }}>Trạng thái kết nối nhà cung cấp</h3>
          <div style={{ marginTop: "16px", display: "flex", flexDirection: "column", gap: "12px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span>AI Provider</span>
              <span className="mono" style={{ textTransform: "uppercase", fontWeight: "bold" }}>{config?.provider}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span>Endpoint Status</span>
              <span className="status-pill success">Bình thường</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span>Giới hạn Budget</span>
              <span style={{ color: "var(--admin-warning)" }}>Sắp chạm ngưỡng 42%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================================================================
   2. AI ASSISTANT VIEW
   ============================================================================ */
function AssistantView() {
  const [messages, setMessages] = useState([
    { role: "assistant", content: "Xin chào Admin! Tôi là trợ lý quản trị AI của FYD Store. Bạn muốn tôi giúp gì hôm nay? Ví dụ: phân tích doanh thu hoặc kiểm tra sản phẩm sắp hết hàng." }
  ]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const historyEndRef = useRef(null);

  useEffect(() => {
    historyEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || sending) return;

    const userMsg = input.trim();
    setMessages(prev => [...prev, { role: "user", content: userMsg }]);
    setInput("");
    setSending(true);

    try {
      const res = await api.aiMgmt.assistant(userMsg);
      setMessages(prev => [...prev, { role: "assistant", content: res.reply }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: "assistant", content: "Lỗi kết nối AI: Không thể nhận phản hồi." }]);
    } finally {
      setSending(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <h2 className="admin-title" style={{ fontSize: "18px", margin: 0 }}>Trợ lý phân tích quản trị (AI Playground)</h2>
      
      <div className="chat-container">
        <div className="chat-history">
          {messages.map((m, idx) => (
            <div key={idx} className={`chat-bubble ${m.role === 'user' ? 'user' : ''}`}>
              <div className="chat-avatar">
                {m.role === 'user' ? <User size={16} /> : <Bot size={16} />}
              </div>
              <div className="chat-text">
                {m.content}
              </div>
            </div>
          ))}
          {sending && (
            <div className="chat-bubble">
              <div className="chat-avatar">
                <Bot size={16} />
              </div>
              <div className="chat-text text-muted">Trợ lý đang suy nghĩ...</div>
            </div>
          )}
          <div ref={historyEndRef} />
        </div>

        <form onSubmit={handleSend} className="chat-input-pane">
          <input
            type="text"
            className="admin-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Hỏi trợ lý: 'Thống kê tồn kho' hoặc 'Sản phẩm nào bán tốt nhất?'..."
            disabled={sending}
          />
          <button type="submit" className="admin-btn admin-btn-primary" disabled={sending}>
            <Send size={16} />
          </button>
        </form>
      </div>
    </div>
  );
}

/* ============================================================================
   3. PRODUCT GENERATOR VIEW
   ============================================================================ */
function GeneratorView() {
  const { showToast } = useToast();
  const [productName, setProductName] = useState("");
  const [category, setCategory] = useState("Áo Thun");
  const [attributes, setAttributes] = useState("");
  const [options, setOptions] = useState({ description: true, seo: true, tags: true, specs: true });
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState(null);

  const handleGenerate = async () => {
    if (!productName.trim()) {
      showToast("Vui lòng điền tên sản phẩm", "warning");
      return;
    }

    const selectedOptions = Object.entries(options)
      .filter(([_, enabled]) => enabled)
      .map(([key]) => key);

    if (selectedOptions.length === 0) {
      showToast("Vui lòng chọn ít nhất 1 loại tài nguyên cần tạo", "warning");
      return;
    }

    setGenerating(true);
    try {
      const res = await api.aiMgmt.generate({
        productName,
        category,
        attributes,
        options: selectedOptions
      });

      if (res.success) {
        setResult(res);
        showToast("Tạo nội dung sản phẩm thành công!", "success");
      } else {
        showToast(res.error || "Tạo nội dung thất bại", "error");
      }
    } catch (err) {
      showToast("Lỗi khi kết nối dịch vụ AI", "error");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <h2 className="admin-title" style={{ fontSize: "18px", margin: 0 }}>Tạo thông tin & SEO sản phẩm bằng AI</h2>

      <div className="product-gen-grid">
        {/* Inputs */}
        <div className="gen-input-pane">
          <h3>Thông số đầu vào</h3>
          
          <div className="ai-form-group">
            <label>Tên sản phẩm</label>
            <input
              type="text"
              className="admin-input"
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              placeholder="Ví dụ: Áo Hoodie Streetwear Basic V2"
            />
          </div>

          <div className="ai-form-group">
            <label>Danh mục</label>
            <select
              className="admin-input"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="Áo Thun">Áo Thun</option>
              <option value="Áo Hoodie">Áo Hoodie</option>
              <option value="Quần Jean">Quần Jean</option>
              <option value="Giày Sneaker">Giày Sneaker</option>
              <option value="Phụ Kiện">Phụ Kiện</option>
            </select>
          </div>

          <div className="ai-form-group">
            <label>Mô tả chi tiết / Chất liệu nổi bật (Tùy chọn)</label>
            <textarea
              value={attributes}
              onChange={(e) => setAttributes(e.target.value)}
              placeholder="Ví dụ: Nỉ chân cua 380GSM, màu đen washed distressed, hình in lụa nổi mặt sau..."
            />
          </div>

          <div className="ai-form-group">
            <label>Tài nguyên muốn sinh</label>
            <div className="gen-options">
              <label>
                <input
                  type="checkbox"
                  checked={options.description}
                  onChange={(e) => setOptions({ ...options, description: e.target.checked })}
                />
                Mô tả chi tiết
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={options.seo}
                  onChange={(e) => setOptions({ ...options, seo: e.target.checked })}
                />
                Metadata SEO
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={options.tags}
                  onChange={(e) => setOptions({ ...options, tags: e.target.checked })}
                />
                Tags gợi ý
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={options.specs}
                  onChange={(e) => setOptions({ ...options, specs: e.target.checked })}
                />
                Thông số kỹ thuật
              </label>
            </div>
          </div>

          <button
            className="admin-btn admin-btn-primary"
            onClick={handleGenerate}
            disabled={generating}
            style={{ width: "100%", marginTop: "8px" }}
          >
            {generating ? (
              <>
                <RefreshCw size={14} className="spinner-glow" style={{ borderTopColor: '#fff', width: '14px', height: '14px' }} />
                <span>Đang xử lý...</span>
              </>
            ) : (
              <>
                <Sparkles size={14} />
                <span>Sinh nội dung</span>
              </>
            )}
          </button>
        </div>

        {/* Outputs */}
        <div className="gen-output-pane">
          <h3>Bản xem trước nội dung AI</h3>
          {result ? (
            <div className="preview-results">
              {result.description && (
                <div className="preview-section">
                  <h4>Mô tả sản phẩm</h4>
                  <p className="text-text" style={{ fontSize: "14px", lineHeight: "1.6" }}>{result.description}</p>
                </div>
              )}

              {result.seoTitle && (
                <div className="preview-section">
                  <h4>Xem trước Snippet Tìm kiếm (SEO)</h4>
                  <div className="seo-snippet">
                    <span className="seo-title">{result.seoTitle}</span>
                    <span className="seo-url">https://fydstore.vn/shop/product/...</span>
                    <span className="seo-desc">{result.seoDescription}</span>
                  </div>
                </div>
              )}

              {result.tags && result.tags.length > 0 && (
                <div className="preview-section">
                  <h4>Thẻ tag gợi ý</h4>
                  <div className="tag-group">
                    {result.tags.map((tag, idx) => (
                      <span key={idx} className="tag">#{tag}</span>
                    ))}
                  </div>
                </div>
              )}

              {result.specifications && Object.keys(result.specifications).length > 0 && (
                <div className="preview-section">
                  <h4>Bảng thông số kỹ thuật</h4>
                  <table className="admin-table" style={{ width: "100%" }}>
                    <tbody>
                      {Object.entries(result.specifications).map(([k, v]) => (
                        <tr key={k}>
                          <td style={{ fontWeight: 600, padding: "8px 12px", width: "140px", fontSize: "13px" }}>{k}</td>
                          <td style={{ padding: "8px 12px", fontSize: "13px" }}>{v}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : (
            <div className="empty-state">
              <Sparkles size={32} style={{ marginBottom: "12px", opacity: 0.5 }} />
              <p>Điền thông số sản phẩm bên trái và click để tạo dữ liệu tự động bằng AI.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ============================================================================
   4. RECOMMENDATIONS VIEW
   ============================================================================ */
function RecommendationsView() {
  const { showToast } = useToast();
  const [recoType, setRecoType] = useState("BEST_SELLING");
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadRecommendations();
  }, [recoType]);

  const loadRecommendations = async () => {
    setLoading(true);
    try {
      const res = await api.aiMgmt.getRecommendations(recoType);
      setData(res || []);
    } catch (err) {
      showToast("Lỗi khi tải gợi ý đề xuất", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <h2 className="admin-title" style={{ fontSize: "18px", margin: 0 }}>Đề xuất kinh doanh & Tối ưu hóa</h2>

      {/* Reco Sub Tabs */}
      <div className="recommendations-header">
        <button
          className={`reco-sub-tab ${recoType === "BEST_SELLING" ? "active" : ""}`}
          onClick={() => setRecoType("BEST_SELLING")}
        >
          Sản phẩm bán chạy nhất
        </button>
        <button
          className={`reco-sub-tab ${recoType === "LOW_INVENTORY" ? "active" : ""}`}
          onClick={() => setRecoType("LOW_INVENTORY")}
        >
          Cảnh báo tồn kho
        </button>
        <button
          className={`reco-sub-tab ${recoType === "CROSS_SELLING" ? "active" : ""}`}
          onClick={() => setRecoType("CROSS_SELLING")}
        >
          Gợi ý bán chéo (Combo)
        </button>
        <button
          className={`reco-sub-tab ${recoType === "CUSTOMER_BEHAVIOR" ? "active" : ""}`}
          onClick={() => setRecoType("CUSTOMER_BEHAVIOR")}
        >
          Hành vi khách hàng
        </button>
      </div>

      {/* Grid Content */}
      {loading ? (
        <div className="loading-spinner-wrapper">
          <div className="spinner-glow"></div>
        </div>
      ) : data.length > 0 ? (
        <div className="admin-table-container">
          <table className="admin-table">
            <thead>
              {recoType === "BEST_SELLING" && (
                <tr>
                  <th>Mã SP</th>
                  <th>Tên sản phẩm</th>
                  <th>Giá gốc</th>
                  <th>Lượt bán (Tuần)</th>
                  <th>Tăng trưởng</th>
                </tr>
              )}
              {recoType === "LOW_INVENTORY" && (
                <tr>
                  <th>SKU Variant</th>
                  <th>Tên sản phẩm</th>
                  <th>Số lượng tồn</th>
                  <th>Tốc độ bán/ngày</th>
                  <th>Khuyến nghị bổ sung</th>
                </tr>
              )}
              {recoType === "CROSS_SELLING" && (
                <tr>
                  <th>Sản phẩm A</th>
                  <th>Sản phẩm B</th>
                  <th>Độ thường xuyên mua kèm</th>
                  <th>Độ tin cậy mua chung</th>
                  <th>Hành động gợi ý</th>
                </tr>
              )}
              {recoType === "CUSTOMER_BEHAVIOR" && (
                <tr>
                  <th>Phát hiện chi tiết</th>
                  <th>Ảnh hưởng</th>
                  <th>Khuyến nghị đề xuất</th>
                </tr>
              )}
            </thead>
            <tbody>
              {recoType === "BEST_SELLING" &&
                data.map((item, idx) => (
                  <tr key={idx}>
                    <td className="mono">{item.sku}</td>
                    <td style={{ fontWeight: 600 }}>{item.name}</td>
                    <td>{formatVND(item.basePrice)}</td>
                    <td>{item.salesCount} chiếc</td>
                    <td style={{ color: "var(--admin-success)", fontWeight: 600 }}>{item.growthRate}</td>
                  </tr>
                ))}

              {recoType === "LOW_INVENTORY" &&
                data.map((item, idx) => (
                  <tr key={idx}>
                    <td className="mono">{item.sku}</td>
                    <td style={{ fontWeight: 600 }}>{item.name}</td>
                    <td style={{ color: "var(--admin-error)", fontWeight: 600 }}>{item.stockQuantity} chiếc</td>
                    <td>{item.dailyVelocity} chiếc/ngày</td>
                    <td>{item.recommendation}</td>
                  </tr>
                ))}

              {recoType === "CROSS_SELLING" &&
                data.map((item, idx) => (
                  <tr key={idx}>
                    <td style={{ fontWeight: 600 }}>{item.itemA}</td>
                    <td style={{ fontWeight: 600 }}>{item.itemB}</td>
                    <td>{item.coOccurrence} đơn hàng</td>
                    <td style={{ color: "var(--admin-accent)", fontWeight: 600 }}>{item.confidence}</td>
                    <td>{item.suggestedCampaign}</td>
                  </tr>
                ))}

              {recoType === "CUSTOMER_BEHAVIOR" &&
                data.map((item, idx) => (
                  <tr key={idx}>
                    <td style={{ fontWeight: 600 }}>{item.insight}</td>
                    <td style={{ color: "var(--admin-success)", fontWeight: 600 }}>{item.impact}</td>
                    <td>{item.recommendation}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="empty-state">Không có dữ liệu đề xuất</div>
      )}
    </div>
  );
}

/* ============================================================================
   6. USAGE LOGS VIEW
   ============================================================================ */
function LogsView() {
  const { showToast } = useToast();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [feature, setFeature] = useState("ALL");
  const [status, setStatus] = useState("ALL");
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    loadLogs();
  }, [feature, status, page]);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const res = await api.aiMgmt.getLogs({
        feature: feature === "ALL" ? "" : feature,
        status: status === "ALL" ? "" : status,
        page,
        size: 10
      });
      setLogs(res.content || []);
      setTotalPages(res.totalPages || 1);
    } catch (err) {
      showToast("Lỗi khi tải nhật ký yêu cầu", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <h2 className="admin-title" style={{ fontSize: "18px", margin: 0 }}>Nhật ký gọi yêu cầu AI chi tiết</h2>

      {/* Filters */}
      <div style={{ display: "flex", gap: "12px", marginBottom: "8px" }}>
        <div className="ai-form-group" style={{ width: "200px" }}>
          <select className="admin-input" value={feature} onChange={(e) => { setFeature(e.target.value); setPage(0); }}>
            <option value="ALL">Tất cả tính năng</option>
            <option value="PRODUCT_GEN">PRODUCT_GEN</option>
            <option value="ASSISTANT">ASSISTANT</option>
            <option value="RECOMMENDATIONS">RECOMMENDATIONS</option>
          </select>
        </div>

        <div className="ai-form-group" style={{ width: "200px" }}>
          <select className="admin-input" value={status} onChange={(e) => { setStatus(e.target.value); setPage(0); }}>
            <option value="ALL">Tất cả trạng thái</option>
            <option value="SUCCESS">SUCCESS</option>
            <option value="FAILED">FAILED</option>
            <option value="LIMIT_EXCEEDED">LIMIT_EXCEEDED</option>
          </select>
        </div>
      </div>

      {/* Logs Table */}
      {loading ? (
        <div className="loading-spinner-wrapper">
          <div className="spinner-glow"></div>
        </div>
      ) : logs.length > 0 ? (
        <div>
          <div className="admin-table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Thời gian</th>
                  <th>Người dùng</th>
                  <th>Tính năng</th>
                  <th>Model</th>
                  <th>Tổng Tokens</th>
                  <th>Chi phí</th>
                  <th>Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id}>
                    <td>{formatDate(log.timestamp)}</td>
                    <td>{log.userName}</td>
                    <td className="mono" style={{ textTransform: "uppercase", fontSize: "12px" }}>{log.feature}</td>
                    <td className="mono" style={{ fontSize: "12px" }}>{log.modelUsed}</td>
                    <td>{log.totalTokens?.toLocaleString()}</td>
                    <td>${log.estimatedCostUsd?.toFixed(6)}</td>
                    <td>
                      <span className={`status-pill ${log.status === "SUCCESS" ? "success" : log.status === "FAILED" ? "error" : "warning"}`}>
                        {log.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "16px" }}>
            <button
              className="admin-btn admin-btn-outline"
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
            >
              Trang trước
            </button>
            <span style={{ alignSelf: "center", fontSize: "13px", padding: "0 10px" }}>
              Trang {page + 1} / {totalPages}
            </span>
            <button
              className="admin-btn admin-btn-outline"
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={page === totalPages - 1}
            >
              Trang sau
            </button>
          </div>
        </div>
      ) : (
        <div className="empty-state">Không tìm thấy bản ghi nhật ký phù hợp.</div>
      )}
    </div>
  );
}



/* ============================================================================
   8. SETTINGS VIEW
   ============================================================================ */
function SettingsView({ config, refreshConfig }) {
  const { showToast } = useToast();
  const [provider, setProvider] = useState(config?.provider || "groq");
  const [apiKey, setApiKey] = useState(config?.apiKey || "");
  const [modelName, setModelName] = useState(config?.modelName || "llama-3.3-70b-versatile");
  const [temperature, setTemperature] = useState(config?.temperature || 0.7);
  const [maxTokens, setMaxTokens] = useState(config?.maxTokens || 2048);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (config) {
      setProvider(config.provider || "groq");
      setApiKey(config.apiKey || "");
      setModelName(config.modelName || "llama-3.3-70b-versatile");
      setTemperature(config.temperature || 0.7);
      setMaxTokens(config.maxTokens || 2048);
    }
  }, [config]);

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const updatedConfig = {
        ...config,
        provider,
        apiKey,
        modelName,
        temperature: parseFloat(temperature),
        maxTokens: parseInt(maxTokens)
      };
      await api.aiMgmt.updateConfig(updatedConfig);
      await refreshConfig();
      showToast("Lưu cấu hình AI thành công!", "success");
    } catch (err) {
      showToast("Lỗi khi lưu cấu hình AI", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <h2 className="admin-title" style={{ fontSize: "18px", margin: 0 }}>Cấu hình Nhà cung cấp AI & Models</h2>

      <form onSubmit={handleSaveSettings} className="settings-form">
        <div className="ai-form-group">
          <label>Nhà cung cấp AI (Provider)</label>
          <select className="admin-input" value={provider} onChange={(e) => setProvider(e.target.value)}>
            <option value="groq">Groq Cloud (Llama models)</option>
            <option value="openai">OpenAI Platform</option>
            <option value="gemini">Google Gemini API</option>
          </select>
        </div>

        <div className="ai-form-group">
          <label>API Key</label>
          <input
            type="password"
            className="admin-input"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="Nhập khóa API bí mật của bạn..."
          />
        </div>

        <div className="ai-form-group">
          <label>Tên Model sử dụng</label>
          <input
            type="text"
            className="admin-input"
            value={modelName}
            onChange={(e) => setModelName(e.target.value)}
            placeholder="e.g. llama-3.3-70b-versatile, gpt-4o, gemini-1.5-flash"
          />
        </div>

        <div className="ai-form-group">
          <label>Nhiệt độ sáng tạo (Temperature)</label>
          <div className="range-slider-group">
            <input
              type="range"
              min="0.0"
              max="1.2"
              step="0.1"
              value={temperature}
              onChange={(e) => setTemperature(e.target.value)}
            />
            <span className="range-val">{temperature}</span>
          </div>
        </div>

        <div className="ai-form-group">
          <label>Độ dài phản hồi tối đa (Max Tokens)</label>
          <div className="range-slider-group">
            <input
              type="range"
              min="256"
              max="4096"
              step="128"
              value={maxTokens}
              onChange={(e) => setMaxTokens(e.target.value)}
            />
            <span className="range-val" style={{ minWidth: "40px" }}>{maxTokens}</span>
          </div>
        </div>

        <button type="submit" className="admin-btn admin-btn-primary" disabled={saving} style={{ width: "fit-content" }}>
          Lưu cấu hình
        </button>
      </form>
    </div>
  );
}
