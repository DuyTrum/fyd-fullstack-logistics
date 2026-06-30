import { useState } from "react";

export default function TrustBar() {
  const [selectedItem, setSelectedItem] = useState(null);

  const trustItems = [
    {
      id: "shipping",
      title: "MIỄN PHÍ VẬN CHUYỂN",
      desc: "Cho đơn hàng từ 500.000₫",
      detailsTitle: "Chính Sách Miễn Phí Vận Chuyển",
      details: [
        { label: "Phạm vi áp dụng", value: "Miễn phí vận chuyển toàn quốc cho tất cả các đơn hàng có giá trị thanh toán thực tế từ 500.000₫ trở lên." },
        { label: "Thời gian giao nhận", value: "Khu vực nội thành (Hà Nội, TP.HCM): 1 - 2 ngày làm việc. Các tỉnh thành khác trên toàn quốc: 3 - 5 ngày làm việc." },
        { label: "Đối tác giao nhận", value: "Hợp tác cùng các đơn vị uy tín như Giao Hàng Nhanh (GHN), Giao Hàng Tiết Kiệm (GHTK) và Viettel Post." },
        { label: "Theo dõi hành trình", value: "Ngay khi hàng được đóng gói, mã vận đơn sẽ cập nhật trực tiếp tại mục 'Theo Dõi Đơn Hàng' hoặc gửi qua SMS của bạn." }
      ],
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="1" y="3" width="15" height="13" rx="2" ry="2" />
          <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
          <circle cx="5.5" cy="18.5" r="2.5" />
          <circle cx="18.5" cy="18.5" r="2.5" />
        </svg>
      )
    },
    {
      id: "returns",
      title: "30 NGÀY ĐỔI TRẢ",
      desc: "Dễ dàng, không thủ tục rườm rà",
      detailsTitle: "Quy Định Đổi Trả Trong 30 Ngày",
      details: [
        { label: "Thời hạn đổi trả", value: "Hỗ trợ đổi mẫu, đổi size trong vòng 30 ngày kể từ ngày quý khách nhận được đơn hàng." },
        { label: "Điều kiện sản phẩm", value: "Sản phẩm đổi trả phải còn nguyên nhãn mác, chưa qua sử dụng, chưa giặt là và không có mùi lạ." },
        { label: "Thủ tục nhanh gọn", value: "Liên hệ Hotline hoặc Chatbox trên web. Đội ngũ CSKH sẽ hỗ trợ bưu tá thu hồi hàng đổi tận nhà bạn." },
        { label: "Chính sách hoàn tiền", value: "Hoàn trả tiền qua tài khoản ngân hàng trong vòng 24-48 giờ làm việc sau khi xác minh sản phẩm đổi trả hợp lệ." }
      ],
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
        </svg>
      )
    },
    {
      id: "payment",
      title: "THANH TOÁN BẢO MẬT",
      desc: "Mã hóa SSL 100% an toàn",
      detailsTitle: "Chính Sách Bảo Mật Thanh Toán",
      details: [
        { label: "Bảo mật thông tin", value: "Tất cả các giao dịch trực tuyến đều được mã hóa bằng giao thức SSL 256-bit chuẩn quốc tế bảo mật tuyệt đối." },
        { label: "Phương thức đa dạng", value: "Chấp nhận thanh toán bằng Thẻ tín dụng (Visa, Mastercard), ví Momo, cổng VNPay, chuyển khoản ngân hàng hoặc COD." },
        { label: "Không lưu trữ thẻ", value: "Mọi thông tin thẻ được xử lý qua đối tác thanh toán ngân hàng được cấp phép, chúng tôi cam kết không lưu trữ số thẻ của bạn." },
        { label: "Tiêu chuẩn an toàn", value: "Tuân thủ chặt chẽ tiêu chuẩn bảo mật an toàn dữ liệu thanh toán quốc tế PCI DSS." }
      ],
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
      )
    },
    {
      id: "support",
      title: "HỖ TRỢ 24/7",
      desc: "Đội ngũ chăm sóc tận tâm",
      detailsTitle: "Trung Tâm Hỗ Trợ Khách Hàng",
      details: [
        { label: "Hotline CSKH", value: "Đường dây nóng hỗ trợ trực tiếp hoạt động liên tục: 0937712338 (Miễn phí cước cuộc gọi)." },
        { label: "Chat trực tuyến", value: "Tích hợp sẵn nút chat qua Messenger, Zalo và AI Chat trực quan ngay góc phải màn hình của bạn." },
        { label: "Email liên hệ", value: "Gửi phản hồi hoặc khiếu nại tới địa chỉ support@fyd.com. Cam kết phản hồi trong tối đa 2 giờ." },
        { label: "Stylist hỗ trợ size", value: "Đội ngũ nhân viên tư vấn giàu kinh nghiệm luôn túc trực để hỗ trợ bạn chọn size chuẩn xác theo vóc dáng." }
      ],
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
        </svg>
      )
    }
  ];

  return (
    <>
      <div className="shop-trust-bar">
        <div className="trust-bar-container">
          {trustItems.map((item) => (
            <div
              key={item.id}
              className="trust-bar-item"
              onClick={() => setSelectedItem(item)}
            >
              <div className="trust-bar-icon">{item.icon}</div>
              <div className="trust-bar-content">
                <h4 className="trust-bar-title">{item.title}</h4>
                <p className="trust-bar-desc">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {selectedItem && (
        <div className="trust-modal-overlay" onClick={() => setSelectedItem(null)}>
          <div className="trust-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="trust-modal-header">
              <div className="trust-bar-icon">{selectedItem.icon}</div>
              <h3 className="trust-modal-title">{selectedItem.detailsTitle}</h3>
              <button className="trust-modal-close-x" onClick={() => setSelectedItem(null)}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
            <div className="trust-modal-body">
              {selectedItem.details.map((detail, idx) => (
                <div key={idx} className="trust-detail-row">
                  <div className="trust-detail-label">{detail.label}</div>
                  <div className="trust-detail-value">{detail.value}</div>
                </div>
              ))}
            </div>
            <div className="trust-modal-footer">
              <button className="trust-modal-btn-close" onClick={() => setSelectedItem(null)}>
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

