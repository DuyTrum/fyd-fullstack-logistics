import React, { useState } from "react";
import { useToast } from "@shared/context/ToastContext";
import "../styles/pages.css";
import "./DevPortal.css";

// SVG Icons for DevPortal
const FigmaIcon = () => (
  <svg width="18" height="18" viewBox="0 0 38 57" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M19 0C8.5 0 0 8.5 0 19C0 24.2 2.1 28.9 5.6 32.4C2.1 35.9 0 40.6 0 45.8C0 56.3 8.5 64.8 19 64.8C24.2 64.8 28.9 62.7 32.4 59.2C35.9 62.7 40.6 64.8 45.8 64.8C56.3 64.8 64.8 56.3 64.8 45.8C64.8 40.6 62.7 35.9 59.2 32.4C62.7 28.9 64.8 24.2 64.8 19C64.8 8.5 56.3 0 45.8 0L19 0Z" fill="none"/>
    <path d="M9.5 47.5C9.5 42.25 13.75 38 19 38C24.25 38 28.5 42.25 28.5 47.5C28.5 52.75 24.25 57 19 57C13.75 57 9.5 52.75 9.5 52.75Z" fill="#0ACF83"/>
    <path d="M9.5 19C9.5 13.75 13.75 9.5 19 9.5L28.5 9.5L28.5 28.5L19 28.5C13.75 28.5 9.5 24.25 9.5 19Z" fill="#A259FF"/>
    <path d="M9.5 28.5C9.5 28.5 9.5 28.5 9.5 28.5C9.5 33.75 13.75 38 19 38L28.5 38L28.5 19L19 19C13.75 19 9.5 23.25 9.5 28.5Z" fill="#F24E1E"/>
    <path d="M28.5 9.5C28.5 4.25 32.75 0 38 0C43.25 0 47.5 4.25 47.5 9.5C47.5 14.75 43.25 19 38 19L28.5 19L28.5 9.5Z" fill="#FF7262"/>
    <path d="M28.5 38C28.5 38 28.5 38 28.5 38C28.5 32.75 32.75 28.5 38 28.5C43.25 28.5 47.5 32.75 47.5 38C47.5 43.25 43.25 47.5 38 47.5C32.75 47.5 28.5 43.25 28.5 38Z" fill="#1ABCFE"/>
  </svg>
);

const CodeIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="16 18 22 12 16 6" />
    <polyline points="8 6 2 12 8 18" />
  </svg>
);

const CopyIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </svg>
);

const ExternalLinkIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
    <polyline points="15 3 21 3 21 9" />
    <line x1="10" y1="14" x2="21" y2="3" />
  </svg>
);

const FIGMA_FILE_URL = import.meta.env.VITE_FIGMA_FILE_URL || "https://www.figma.com/file/fyd-logistics-design-mockup";
const FIGMA_PROTOTYPE_EMBED_URL = import.meta.env.VITE_FIGMA_PROTOTYPE_EMBED_URL || "https://embed.figma.com/proto/fyd-logistics-prototype?embed_host=share";
const FIGMA_TOKENS_URL = import.meta.env.VITE_FIGMA_TOKENS_URL || "https://www.figma.com/file/fyd-design-tokens";

export default function DevPortal() {
  const [activeTab, setActiveTab] = useState("library");
  const [activeComponent, setActiveComponent] = useState("button");
  const [sliderPosition, setSliderPosition] = useState(50);
  const [copied, setCopied] = useState(false);
  const { showToast } = useToast();
  const sliderContainerRef = React.useRef(null);

  const handleCopyCode = (codeText) => {
    navigator.clipboard.writeText(codeText);
    showToast("Đã copy mã nguồn vào clipboard!", "success");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSliderMove = (clientX) => {
    if (!sliderContainerRef.current) return;
    const rect = sliderContainerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSliderPosition(percentage);
  };

  const handleMouseMove = (e) => {
    if (e.buttons === 1) { // Left click dragging
      handleSliderMove(e.clientX);
    }
  };

  const handleTouchMove = (e) => {
    if (e.touches.length > 0) {
      handleSliderMove(e.touches[0].clientX);
    }
  };

  // Component Library Specifications
  const componentsList = {
    button: {
      name: "Admin Button",
      description: "Nút nhấn chuẩn hệ thống quản trị, hỗ trợ các biến thể màu sắc, kích thước và trạng thái.",
      figmaLink: `${FIGMA_TOKENS_URL}?node-id=button-frame`,
      props: [
        { name: "className", type: "string", default: "admin-btn", desc: "Class CSS cơ bản" },
        { name: "type", type: "string", default: "button", desc: "Loại button (button, submit, reset)" },
        { name: "disabled", type: "boolean", default: "false", desc: "Vô hiệu hóa click chuột" },
        { name: "onClick", type: "function", default: "undefined", desc: "Hành động khi click" }
      ],
      code: `<button className="admin-btn admin-btn-primary">
  Primary Button
</button>

<button className="admin-btn admin-btn-outline">
  Outline Button
</button>

<button className="admin-btn admin-btn-ghost">
  Ghost Button
</button>`,
      preview: (
        <div className="dev-component-preview-layout">
          <button className="admin-btn admin-btn-primary" type="button">Primary Button</button>
          <button className="admin-btn admin-btn-outline" type="button">Outline Button</button>
          <button className="admin-btn admin-btn-ghost" type="button">Ghost Button</button>
          <button className="admin-btn admin-btn-primary" type="button" disabled>Disabled Button</button>
        </div>
      )
    },
    input: {
      name: "Admin Input & Fields",
      description: "Thành phần nhập liệu được bọc bởi FormField hỗ trợ hiển thị label, text trợ giúp và hiển thị lỗi trực quan.",
      figmaLink: `${FIGMA_TOKENS_URL}?node-id=input-frame`,
      props: [
        { name: "label", type: "string", default: "undefined", desc: "Nhãn tiêu đề của trường nhập" },
        { name: "required", type: "boolean", default: "false", desc: "Hiện ký tự bắt buộc (*)" },
        { name: "status", type: "string", default: "'default'", desc: "Trạng thái hiển thị ('default', 'error', 'success')" },
        { name: "errorText", type: "string", default: "undefined", desc: "Nội dung thông báo lỗi" },
        { name: "helperText", type: "string", default: "undefined", desc: "Nội dung hỗ trợ người dùng" }
      ],
      code: `// Sử dụng FormInput tự xây dựng trong adminFormComponents
import { FormInput } from "../components/adminFormComponents";

<FormInput 
  label="Mã sản phẩm" 
  required 
  placeholder="Nhập mã sản phẩm..." 
/>

<FormInput 
  label="Giá sản phẩm"
  status="error"
  errorText="Vui lòng nhập giá trị lớn hơn 0"
  defaultValue="-1000"
/>`,
      preview: (
        <div className="dev-component-preview-layout-vertical">
          <div className="admin-field">
            <label className="admin-field-label">
              <span>Tên sản phẩm <span style={{ color: 'var(--admin-error)' }}>*</span></span>
            </label>
            <input className="admin-input" placeholder="Ví dụ: Áo thun Gymshark" />
            <span className="admin-field-helper" style={{ fontSize: '11px', color: 'var(--admin-text-muted)', marginTop: '4px', display: 'block' }}>Tối đa 150 ký tự</span>
          </div>

          <div className="admin-field has-error" style={{ marginTop: '16px' }}>
            <label className="admin-field-label">
              <span>Đơn giá <span style={{ color: 'var(--admin-error)' }}>*</span></span>
            </label>
            <input className="admin-input" defaultValue="-50000" style={{ borderColor: 'var(--admin-error)' }} />
            <span className="admin-field-error-msg" style={{ fontSize: '11px', color: 'var(--admin-error)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              Đơn giá không được âm
            </span>
          </div>
        </div>
      )
    },
    badge: {
      name: "Status Pill (Badge)",
      description: "Nhãn trạng thái màu sắc trực quan, thường dùng biểu diễn các trạng thái đơn hàng (Đang xử lý, Thành công, Đã hủy).",
      figmaLink: `${FIGMA_TOKENS_URL}?node-id=badge-frame`,
      props: [
        { name: "status", type: "string", default: "undefined", desc: "Trạng thái đơn hàng (PENDING, SHIPPING, COMPLETED, CANCELLED)" }
      ],
      code: `// Pill trạng thái sử dụng biến CSS variables màu tương ứng
<span className="status-pill success">Hoàn thành</span>
<span className="status-pill info">Đang giao hàng</span>
<span className="status-pill warning">Đang chờ duyệt</span>
<span className="status-pill error">Đã hủy</span>`,
      preview: (
        <div className="dev-component-preview-layout">
          <span className="status-pill success">COMPLETED</span>
          <span className="status-pill info">SHIPPING</span>
          <span className="status-pill warning">PENDING</span>
          <span className="status-pill error">CANCELLED</span>
        </div>
      )
    },
    avatar: {
      name: "Mini Avatar",
      description: "Hiển thị ký tự viết tắt tên khách hàng hoặc nhân viên với background bo tròn tinh tế.",
      figmaLink: `${FIGMA_TOKENS_URL}?node-id=avatar-frame`,
      props: [
        { name: "name", type: "string", default: "'?'", desc: "Tên đầy đủ để trích xuất chữ cái đầu tiên" }
      ],
      code: `function MiniAvatar({ name }) {
  const ch = (name || "?").trim().slice(0, 1).toUpperCase();
  return <div className="miniAvatar">{ch}</div>;
}

<MiniAvatar name="Duy Trùm" />
<MiniAvatar name="Anh Khoa" />`,
      preview: (
        <div className="dev-component-preview-layout">
          <div className="miniAvatar">D</div>
          <div className="miniAvatar" style={{ background: 'var(--admin-accent-2)' }}>A</div>
          <div className="miniAvatar" style={{ background: 'var(--admin-success)' }}>K</div>
        </div>
      )
    },
    modal: {
      name: "Admin Modal Dialog",
      description: "Cửa sổ hộp thoại nổi được tạo từ React Portal, cố định vị trí hiển thị đè lên toàn bộ website.",
      figmaLink: `${FIGMA_TOKENS_URL}?node-id=modal-frame`,
      props: [
        { name: "open", type: "boolean", default: "false", desc: "Điều khiển đóng mở Modal" },
        { name: "title", type: "string", default: "undefined", desc: "Tiêu đề của Modal" },
        { name: "onClose", type: "function", default: "undefined", desc: "Hàm callback đóng Modal" },
        { name: "children", type: "ReactNode", default: "undefined", desc: "Nội dung bên trong Modal" }
      ],
      code: `<Modal open={isOpen} title="Thêm sản phẩm mới" onClose={() => setIsOpen(false)}>
  <div className="modal-form-content">
     <p>Giao diện nhập liệu nằm tại đây...</p>
  </div>
</Modal>`,
      preview: (
        <div className="dev-component-preview-layout" style={{ width: '100%' }}>
          <div style={{
            position: 'relative',
            width: '100%',
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid var(--admin-border)',
            borderRadius: 'var(--admin-radius-lg)',
            padding: '24px'
          }}>
            <div className="modalHead" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--admin-border)', paddingBottom: '12px', marginBottom: '12px' }}>
              <div className="modalTitle" style={{ fontWeight: '600' }}>Demo Modal Header</div>
              <button className="iconBtn" type="button" style={{ background: 'transparent', border: 'none', color: 'var(--admin-text-muted)', cursor: 'pointer' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="modalBody" style={{ color: 'var(--admin-text-muted)', fontSize: '13px' }}>
              Đây là nơi hiển thị nội dung chi tiết. Bạn có thể chèn Form hoặc thông tin chi tiết vào đây.
            </div>
          </div>
        </div>
      )
    },
    toast: {
      name: "Toast Notification",
      description: "Thành phần hiển thị thông báo nhanh góc màn hình (Thành công, Thất bại, Cảnh báo). Hoạt động qua ToastContext.",
      figmaLink: `${FIGMA_TOKENS_URL}?node-id=toast-frame`,
      props: [
        { name: "message", type: "string", default: "undefined", desc: "Nội dung câu thông báo" },
        { name: "type", type: "string", default: "'success'", desc: "Loại thông báo ('success', 'error', 'info', 'warning')" }
      ],
      code: `// Gọi thông qua hook useToast
const { showToast } = useToast();

showToast("Lưu thông tin thành công!", "success");
showToast("Có lỗi xảy ra, vui lòng thử lại!", "error");`,
      preview: (
        <div className="dev-component-preview-layout-vertical">
          <div className="toast-demo-item success" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: '6px', color: '#10b981', fontSize: '13px' }}>
            <span className="toast-icon">✓</span>
            <div className="toast-text">Lưu sản phẩm thành công!</div>
          </div>
          <div className="toast-demo-item error" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '6px', color: '#ef4444', fontSize: '13px', marginTop: '8px' }}>
            <span className="toast-icon">✗</span>
            <div className="toast-text">Lỗi đồng bộ dữ liệu với máy chủ!</div>
          </div>
        </div>
      )
    }
  };

  return (
    <div className="page-container dev-portal-page">
      {/* Header Portal */}
      <div className="dev-portal-header card">
        <div className="header-left">
          <div className="portal-badge">Developer Portal</div>
          <h1 className="portal-title">Design System & Figma Inspector</h1>
          <p className="portal-subtitle">
            Cổng quản lý và đồng bộ quy trình thiết kế giao diện Figma vào hệ thống FYD Order Management.
          </p>
        </div>
        <div className="header-right">
          <a href={FIGMA_FILE_URL} target="_blank" rel="noreferrer" className="admin-btn admin-btn-outline">
            <FigmaIcon />
            <span>Figma Workspace</span>
            <ExternalLinkIcon />
          </a>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="dev-tabs-container">
        <button
          className={`dev-tab-btn ${activeTab === "library" ? "active" : ""}`}
          onClick={() => setActiveTab("library")}
          type="button"
        >
          <CodeIcon />
          <span>Component Library</span>
        </button>
        <button
          className={`dev-tab-btn ${activeTab === "prototype" ? "active" : ""}`}
          onClick={() => setActiveTab("prototype")}
          type="button"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2L2 7l10 5 10-5-10-5z" />
            <path d="M2 17l10 5 10-5" />
            <path d="M2 12l10 5 10-5" />
          </svg>
          <span>Figma Prototype Mode</span>
        </button>
        <button
          className={`dev-tab-btn ${activeTab === "compare" ? "active" : ""}`}
          onClick={() => setActiveTab("compare")}
          type="button"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
            <line x1="8" y1="21" x2="16" y2="21" />
            <line x1="12" y1="17" x2="12" y2="21" />
          </svg>
          <span>Design vs Website Compare</span>
        </button>
      </div>

      {/* Tab Contents */}
      {activeTab === "library" && (
        <div className="dev-tab-content library-grid">
          {/* Sidebar Components List */}
          <div className="components-sidebar card">
            <div className="sidebar-section-title">THÀNH PHẦN UI (UI KIT)</div>
            <div className="component-list-links">
              {Object.keys(componentsList).map((key) => (
                <button
                  key={key}
                  className={`component-link-item ${activeComponent === key ? "active" : ""}`}
                  onClick={() => setActiveComponent(key)}
                  type="button"
                >
                  {componentsList[key].name}
                </button>
              ))}
            </div>
          </div>

          {/* Component Workspace Area */}
          <div className="component-workspace card">
            <div className="workspace-header">
              <div>
                <h2>{componentsList[activeComponent].name}</h2>
                <p className="workspace-desc">{componentsList[activeComponent].description}</p>
              </div>
              <a
                href={componentsList[activeComponent].figmaLink}
                target="_blank"
                rel="noreferrer"
                className="figma-inspector-btn"
              >
                <FigmaIcon />
                <span>Open in Figma</span>
                <ExternalLinkIcon />
              </a>
            </div>

            {/* Preview Component Box */}
            <div className="component-preview-box">
              <div className="box-tag">PREVIEW (BẢN CHẠY THỬ)</div>
              <div className="preview-render-area">
                {componentsList[activeComponent].preview}
              </div>
            </div>

            {/* Code Block Area */}
            <div className="component-code-box">
              <div className="box-header-row">
                <span className="box-tag">CODE REACT</span>
                <button
                  className="copy-code-btn"
                  onClick={() => handleCopyCode(componentsList[activeComponent].code)}
                  type="button"
                >
                  <CopyIcon />
                  <span>{copied ? "Copied!" : "Copy Code"}</span>
                </button>
              </div>
              <pre className="code-renderer">
                <code>{componentsList[activeComponent].code}</code>
              </pre>
            </div>

            {/* Props Table */}
            <div className="component-props-box">
              <div className="box-tag">PROPS API</div>
              <div className="props-table-wrapper">
                <table className="props-table">
                  <thead>
                    <tr>
                      <th>Tên Prop</th>
                      <th>Kiểu dữ liệu</th>
                      <th>Mặc định</th>
                      <th>Mô tả chức năng</th>
                    </tr>
                  </thead>
                  <tbody>
                    {componentsList[activeComponent].props.map((prop, idx) => (
                      <tr key={idx}>
                        <td className="prop-name">{prop.name}</td>
                        <td className="prop-type">{prop.type}</td>
                        <td className="prop-default"><code>{prop.default}</code></td>
                        <td className="prop-desc">{prop.desc}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "prototype" && (
        <div className="dev-tab-content card prototype-workspace">
          <div className="prototype-meta">
            <div>
              <h2>Figma Prototype Mode</h2>
              <p>Trình diễn luồng liên kết từ: <strong>Yêu cầu (Requirement) ➔ Sơ đồ khung xương (Wireframe) ➔ Bản mẫu tương tác (Prototype) ➔ Website thật</strong>.</p>
            </div>
            <a href={FIGMA_PROTOTYPE_EMBED_URL} target="_blank" rel="noreferrer" className="admin-btn admin-btn-outline">
              <FigmaIcon />
              <span>Full Screen Prototype</span>
              <ExternalLinkIcon />
            </a>
          </div>

          <div className="iframe-container">
            <iframe
              title="Figma Prototype Embed"
              width="100%"
              height="650"
              src={FIGMA_PROTOTYPE_EMBED_URL}
              allowFullScreen
              style={{ border: '1px solid var(--admin-border)', borderRadius: 'var(--admin-radius-lg)', background: '#121214' }}
            />
          </div>
        </div>
      )}

      {activeTab === "compare" && (
        <div className="dev-tab-content card compare-workspace">
          <div className="compare-meta">
            <h2>Design vs Website Compare</h2>
            <p>Di chuyển thanh trượt (kéo rê chuột) để so sánh trực diện giữa **Bản thiết kế Figma (Trái)** và **Giao diện Website đang chạy (Phải)** để thấy độ khớp của giao diện.</p>
          </div>

          <div 
            ref={sliderContainerRef}
            className="compare-slider-container"
            onMouseMove={handleMouseMove}
            onTouchMove={handleTouchMove}
            style={{ position: 'relative', width: '100%', height: '600px', overflow: 'hidden', borderRadius: 'var(--admin-radius-lg)', border: '1px solid var(--admin-border)', cursor: 'ew-resize', userSelect: 'none' }}
          >
            {/* Left Image (Design Figma) */}
            <div className="slider-image design-image" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}>
              <img 
                src="https://placehold.co/1200x800/18181b/ffffff?text=Figma+Design+Mockup+(Pixel-Perfect)" 
                alt="Figma Design" 
                style={{ width: '100%', height: '100%', objectFit: 'cover', pointerEvents: 'none' }}
              />
              <div style={{ position: 'absolute', bottom: '16px', left: '16px', background: 'rgba(0,0,0,0.6)', padding: '6px 12px', borderRadius: '4px', fontSize: '12px', fontWeight: '600', border: '1px solid rgba(255,255,255,0.2)', color: '#fff' }}>
                DESIGN MOCKUP (FIGMA)
              </div>
            </div>

            {/* Right Image (Website Real) */}
            <div 
              className="slider-image website-image" 
              style={{ 
                position: 'absolute', 
                top: 0, 
                left: 0, 
                width: '100%', 
                height: '100%',
                clipPath: `polygon(${sliderPosition}% 0, 100% 0, 100% 100%, ${sliderPosition}% 100%)` 
              }}
            >
              <img 
                src="https://placehold.co/1200x800/0f172a/38bdf8?text=Real+React+Website+(Responsive+Flex)" 
                alt="Real Website" 
                style={{ width: '100%', height: '100%', objectFit: 'cover', pointerEvents: 'none' }}
              />
              <div style={{ position: 'absolute', bottom: '16px', right: '16px', background: 'rgba(37,99,235,0.8)', padding: '6px 12px', borderRadius: '4px', fontSize: '12px', fontWeight: '600', border: '1px solid rgba(255,255,255,0.2)', color: '#fff' }}>
                WEBSITE REAL TIME (REACT)
              </div>
            </div>

            {/* Slider Handle Line */}
            <div 
              className="slider-bar" 
              style={{ 
                position: 'absolute', 
                top: 0, 
                bottom: 0, 
                left: `${sliderPosition}%`, 
                width: '2px', 
                background: '#fff', 
                boxShadow: '0 0 10px rgba(0,0,0,0.5)',
                transform: 'translateX(-50%)',
                zIndex: 10
              }}
            >
              <div 
                className="slider-handle" 
                style={{ 
                  position: 'absolute', 
                  top: '50%', 
                  left: '50%', 
                  transform: 'translate(-50%, -50%)', 
                  width: '36px', 
                  height: '36px', 
                  background: '#fff', 
                  borderRadius: '50%', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  color: '#18181b', 
                  fontWeight: 'bold', 
                  boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
                  fontSize: '14px'
                }}
              >
                ↔
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
