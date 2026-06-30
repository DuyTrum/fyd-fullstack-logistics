import React, { useState, useEffect, useRef, useCallback } from 'react';
import { luckySpinAPI } from '../../../shared/utils/api';
import { getCustomerSession } from '../../../shared/utils/customerSession';
import Toast from '../../../shared/components/Toast';
import './LuckySpinModal.css';

/**
 * Lucky Spin Modal - Vòng quay may mắn (SVG version)
 * Premium wheel spin with tier-based probability.
 * Supports Vietnamese characters natively.
 */
const LuckySpinModal = ({ isOpen, onClose, onLoginRequired }) => {
    const [loading, setLoading] = useState(true);
    const [spinning, setSpinning] = useState(false);
    const [spinInfo, setSpinInfo] = useState(null);
    const [result, setResult] = useState(null);
    const [coupons, setCoupons] = useState([]);
    const [rotation, setRotation] = useState(0);
    const wheelRef = useRef(null);

    // Toast state
    const [toast, setToast] = useState({ show: false, message: "", type: "success" });

    const showToast = useCallback((message, type = "success") => {
        setToast({ show: true, message, type });
    }, []);

    const session = getCustomerSession();
    const isLoggedIn = session && session.token;

    // Fetch spin info on mount
    useEffect(() => {
        if (isOpen && isLoggedIn) {
            fetchSpinInfo();
            fetchCoupons();
        } else if (isOpen && !isLoggedIn) {
            setLoading(false);
        }
    }, [isOpen, isLoggedIn]);

    // Prevent body scroll when modal is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen]);

    const fetchSpinInfo = async () => {
        try {
            setLoading(true);
            const data = await luckySpinAPI.getInfo(session.token);
            setSpinInfo(data);
        } catch (error) {
            console.error('Failed to fetch spin info:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchCoupons = async () => {
        try {
            const data = await luckySpinAPI.getMyCoupons(session.token, 'all');
            setCoupons(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Failed to fetch coupons:', error);
        }
    };

    const handleSpin = async (usePoints = false) => {
        if (spinning) return;

        setSpinning(true);
        setResult(null);

        try {
            const data = usePoints
                ? await luckySpinAPI.exchangePoints(session.token)
                : await luckySpinAPI.play(session.token);

            if (data.success) {
                // Calculate rotation based on reward index
                const segmentCount = spinInfo.rewards.length;
                const segmentAngle = 360 / segmentCount;
                // Target is the center of the segment, offset to account for SVG starting angle
                const targetAngle = 360 - (data.rewardIndex * segmentAngle) - (segmentAngle / 2);
                const spins = 7 + Math.floor(Math.random() * 3); // 7-9 full spins for dramatic effect
                const newRotation = rotation + (spins * 360) + targetAngle - (rotation % 360);

                setRotation(newRotation);

                // Wait for spin animation to complete (7s as per CSS)
                setTimeout(() => {
                    setResult(data);
                    setSpinning(false);
                    // Update spin status
                    if (data.spinStatus) {
                        setSpinInfo(prev => ({
                            ...prev,
                            spinStatus: data.spinStatus
                        }));
                    }
                    // Refresh coupons if won
                    if (data.coupon) {
                        fetchCoupons();
                    }
                }, 7200);
            } else {
                showToast(data.message || 'Không thể quay vòng quay', 'error');
                setSpinning(false);
            }
        } catch (error) {
            console.error('Spin failed:', error);
            showToast('Đã xảy ra lỗi. Vui lòng thử lại.', 'error');
            setSpinning(false);
        }
    };

    const closeResult = () => {
        setResult(null);
    };

    if (!isOpen) return null;

    // Render login prompt if not logged in
    if (!isLoggedIn) {
        return (
            <div className="lucky-spin-modal-overlay" onClick={onClose}>
                <div className="lucky-spin-modal" onClick={(e) => e.stopPropagation()}>
                    <button className="modal-close-btn" onClick={onClose} aria-label="Đóng">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </button>
                    <div className="spin-login-prompt">
                        <h2 className="prompt-title">Vòng Quay May Mắn</h2>
                        <p className="prompt-text">Vui lòng đăng nhập để tham gia và nhận ưu đãi độc quyền.</p>
                        <button className="spin-btn-outline" onClick={() => { onClose(); onLoginRequired(); }}>
                            ĐĂNG NHẬP NGAY
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Render loading state
    if (loading) {
        return (
            <div className="lucky-spin-modal-overlay" onClick={onClose}>
                <div className="lucky-spin-modal" onClick={(e) => e.stopPropagation()}>
                    <div className="spin-loading">
                        <div className="spin-loader"></div>
                        <p>ĐANG TẢI VÒNG QUAY...</p>
                    </div>
                </div>
            </div>
        );
    }

    // Render no program message
    if (!spinInfo || !spinInfo.hasActiveProgram) {
        return (
            <div className="lucky-spin-modal-overlay" onClick={onClose}>
                <div className="lucky-spin-modal" onClick={(e) => e.stopPropagation()}>
                    <button className="modal-close-btn" onClick={onClose} aria-label="Đóng">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </button>
                    <div className="spin-login-prompt">
                        <h2 className="prompt-title">Vòng Quay May Mắn</h2>
                        <p className="prompt-text">Hiện không có chương trình nào đang diễn ra. Hẹn gặp lại bạn sau!</p>
                    </div>
                </div>
            </div>
        );
    }

    const { program, rewards, spinStatus } = spinInfo;
    const canSpinFree = spinStatus.remainingFreeSpins > 0;
    const canExchange = spinStatus.canExchangePoints;

    return (
        <div className="lucky-spin-modal-overlay" onClick={onClose}>
            <div className="lucky-spin-modal lucky-spin-modal--full" onClick={(e) => e.stopPropagation()}>
                <button className="modal-close-btn" onClick={onClose} aria-label="Đóng">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                </button>

                {/* Modal Header */}
                <div className="spin-modal-header">
                    <span className="spin-badge">Sự kiện Độc quyền</span>
                    <h2 className="spin-modal-title">{program.name}</h2>
                    <p className="spin-modal-desc">{program.description}</p>
                </div>

                {/* Main Content */}
                <div className="spin-modal-content">
                    {/* Wheel Section */}
                    <div className="spin-wheel-container">
                        <div className="spin-wheel-outer">
                            {/* Pointer */}
                            <div className="spin-wheel-pointer"></div>

                            {/* Wheel SVG */}
                            <div
                                className={`spin-wheel-svg-container ${spinning ? 'is-spinning' : ''}`}
                                style={{ transform: `rotate(${rotation}deg)` }}
                            >
                                <svg
                                    viewBox="0 0 100 100"
                                    className="wheel-svg"
                                    xmlns="http://www.w3.org/2000/svg"
                                >
                                    {rewards.map((reward, index) => {
                                        const segmentCount = rewards.length;
                                        const angle = 360 / segmentCount;
                                        const startAngle = index * angle;
                                        const endAngle = (index + 1) * angle;

                                        // Path for the slice
                                        const x1 = 50 + 50 * Math.cos((Math.PI * (startAngle - 90)) / 180);
                                        const y1 = 50 + 50 * Math.sin((Math.PI * (startAngle - 90)) / 180);
                                        const x2 = 50 + 50 * Math.cos((Math.PI * (endAngle - 90)) / 180);
                                        const y2 = 50 + 50 * Math.sin((Math.PI * (endAngle - 90)) / 180);

                                        const largeArcFlag = angle > 180 ? 1 : 0;
                                        const pathData = `M 50 50 L ${x1} ${y1} A 50 50 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;

                                        // Color logic
                                        let color = index % 2 === 0 ? '#000000' : '#ffffff';
                                        if (reward.rewardType === 'NO_REWARD') {
                                            color = '#222222'; // Dark gray instead of near-white for NO_REWARD
                                        } else if (reward.rewardValue >= 100000 || (reward.rewardType === 'PERCENT' && reward.rewardValue >= 20)) {
                                            color = '#FFD700'; // Gold for high rewards
                                        }

                                        // Label position (slightly inward to avoid edge overflow)
                                        const labelAngle = startAngle + angle / 2;
                                        const labelRadius = reward.name.length > 15 ? 28 : 32;
                                        const labelX = 50 + labelRadius * Math.cos((Math.PI * (labelAngle - 90)) / 180);
                                        const labelY = 50 + labelRadius * Math.sin((Math.PI * (labelAngle - 90)) / 180);

                                        // Helper to wrap text for long labels
                                        const renderWrappedText = (text) => {
                                            if (text.length <= 12) return <tspan x={labelX} y={labelY}>{text}</tspan>;

                                            const words = text.split(' ');
                                            const mid = Math.ceil(words.length / 2);
                                            const line1 = words.slice(0, mid).join(' ');
                                            const line2 = words.slice(mid).join(' ');

                                            return (
                                                <>
                                                    <tspan x={labelX} dy="-1.2">{line1}</tspan>
                                                    <tspan x={labelX} dy="3.2">{line2}</tspan>
                                                </>
                                            );
                                        };

                                        return (
                                            <g key={reward.id || index}>
                                                <path d={pathData} fill={color} stroke="#333" strokeWidth="0.2" />
                                                <text
                                                    x={labelX}
                                                    y={labelY}
                                                    fill={color === '#000000' || color === '#222222' ? '#fff' : '#000'}
                                                    transform={`rotate(${labelAngle}, ${labelX}, ${labelY})`}
                                                    textAnchor="middle"
                                                    dominantBaseline="middle"
                                                    className="wheel-label-text"
                                                    style={{
                                                        fontSize: reward.name.length > 15 ? '2.2px' : (reward.name.length > 10 ? '2.6px' : '3.2px'),
                                                        fontWeight: '900'
                                                    }}
                                                >
                                                    {renderWrappedText(reward.name)}
                                                </text>
                                            </g>
                                        );
                                    })}
                                </svg>
                            </div>

                            {/* Center Hub */}
                            <div className="spin-wheel-hub">
                                <button
                                    className="spin-wheel-btn"
                                    onClick={() => handleSpin(false)}
                                    disabled={spinning || !canSpinFree}
                                >
                                    {spinning ? '•••' : 'QUAY'}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Info Section */}
                    <div className="spin-info-panel">
                        <h3 className="spin-info-title">Thông Tin Lượt Quay</h3>

                        <div className="spin-stat-row">
                            <span className="spin-stat-label">Miễn phí hôm nay</span>
                            <span className={`spin-stat-value ${canSpinFree ? 'success' : ''}`}>
                                {spinStatus.remainingFreeSpins} / {program.dailyFreeSpins}
                            </span>
                        </div>

                        <div className="spin-stat-row">
                            <span className="spin-stat-label">Điểm hiện có</span>
                            <span className="spin-stat-value gold">{spinStatus.customerPoints} Điểm</span>
                        </div>

                        <div className="spin-stat-row">
                            <span className="spin-stat-label">Đổi lượt quay</span>
                            <span className="spin-stat-value">{spinStatus.pointsPerSpin} Điểm</span>
                        </div>

                        <div className="spin-actions">
                            {canSpinFree ? (
                                <button
                                    className="spin-btn-outline"
                                    onClick={() => handleSpin(false)}
                                    disabled={spinning}
                                >
                                    {spinning ? 'ĐANG QUAY...' : 'QUAY MIỄN PHÍ NGAY'}
                                </button>
                            ) : (
                                <button
                                    className="spin-btn-outline"
                                    onClick={() => handleSpin(true)}
                                    disabled={spinning || !canExchange}
                                >
                                    {spinning ? 'ĐANG XỬ LÝ...' : `ĐỔI ${spinStatus.pointsPerSpin} ĐIỂM + QUAY`}
                                </button>
                            )}
                            {!canSpinFree && !canExchange && (
                                <p className="spin-insufficient-msg">Bạn không đủ điểm để đổi lượt quay</p>
                            )}
                        </div>

                        {/* Rewards Preview */}
                        <div className="spin-coupons-preview">
                            <h4 className="spin-coupons-title">Phần thưởng của tôi ({coupons.length})</h4>
                            <div className="spin-coupons-list">
                                {coupons.length > 0 ? (
                                    coupons.slice(0, 3).map(coupon => (
                                        <div key={coupon.id} className="spin-coupon-item">
                                            <span className="coupon-value">
                                                {coupon.discountType === 'PERCENT' ? coupon.discountValue : coupon.discountValue / 1000}{coupon.discountType === 'PERCENT' ? '%' : 'K'}
                                            </span>
                                            <span className="coupon-code">{coupon.code}</span>
                                        </div>
                                    ))
                                ) : (
                                    <p style={{ fontSize: '12px', color: '#999', fontStyle: 'italic' }}>Bạn chưa có phần thưởng nào.</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Result Modal */}
                {result && (
                    <div className="spin-result-overlay" onClick={closeResult}>
                        <div className="spin-result-modal" onClick={e => e.stopPropagation()}>
                            <h2 className="result-title">
                                {result.coupon ? 'Chúc mừng chiến thắng!' : 'Rất tiếc!'}
                            </h2>

                            <div className="result-reward">
                                <span className="result-label">BẠN ĐÃ NHẬN ĐƯỢC</span>
                                <div className="result-name">{result.reward?.name}</div>
                            </div>

                            {result.coupon && (
                                <div className="result-coupon">
                                    <div className="result-label">MÃ GIẢM GIÁ CỦA BẠN</div>
                                    <div className="result-coupon-code">{result.coupon.code}</div>
                                    <p style={{ fontSize: '12px', color: '#888', marginTop: '10px' }}>
                                        Sử dụng khi thanh toán để được giảm giá ngay.
                                    </p>
                                </div>
                            )}

                            <div className="result-footer">
                                <button className="spin-btn-primary" onClick={closeResult}>
                                    TIẾP TỤC
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <Toast
                show={toast.show}
                message={toast.message}
                type={toast.type}
                onClose={() => setToast({ ...toast, show: false })}
            />
        </div>
    );
};

export default LuckySpinModal;
