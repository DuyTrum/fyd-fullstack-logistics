import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Sparkles, Zap, ShieldCheck, ArrowLeft } from 'lucide-react';
import { nightMarketAPI as api } from '@shared/utils/api';
import { getCustomerSession } from '@shared/utils/customerSession';
import NightMarketCard from '../components/NightMarketCard';
import '../styles/NightMarket.css';

const NightMarket = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [offers, setOffers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const session = getCustomerSession();
    const isLoggedIn = session && session.token;

    useEffect(() => {
        if (isLoggedIn) {
            fetchOffers();
        } else {
            setLoading(false);
        }
    }, [isLoggedIn]);

    const fetchOffers = async () => {
        try {
            setLoading(true);
            const response = await api.getOffers(session.token);
            setOffers(response || []);
            setError(null);
        } catch (err) {
            console.error('Failed to fetch Night Market offers:', err);
            if (err.code === 'FEATURE_DISABLED') {
                setError({
                    type: 'FEATURE_DISABLED',
                    message: err.message || 'Chợ đêm hiện đang tạm đóng. Hẹn gặp lại bạn sớm!'
                });
            } else {
                setError({
                    type: 'ERROR',
                    message: 'Could not load offers. Please try again later.'
                });
            }
        } finally {
            setLoading(false);
        }
    };

    const handleReveal = async (offerId) => {
        try {
            const response = await api.revealOffer(offerId, session.token);
            setOffers(prev => prev.map(o => o.id === offerId ? response : o));
        } catch (err) {
            console.error('Failed to reveal offer:', err);
        }
    };

    if (loading) {
        return (
            <div className="night-market-page">
                <button className="nm-back-btn" onClick={() => navigate('/shop')}>
                    <ArrowLeft size={18} />
                    <span>{t('common.back', 'Quay lại')}</span>
                </button>
                <div className="nm-tag-text animate-pulse" style={{ textAlign: 'center', marginTop: '30vh' }}>Initializing Interface...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="night-market-page">
                <button className="nm-back-btn" onClick={() => navigate('/shop')}>
                    <ArrowLeft size={18} />
                    <span>{t('common.back', 'Quay lại')}</span>
                </button>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', paddingTop: '15vh' }}>
                    <div className="w-24 h-24 mb-8 bg-white/5 rounded-full flex items-center justify-center border border-white/10">
                        <ShieldCheck className="text-red-400" size={48} />
                    </div>
                    <h2 className="nm-title mb-6">
                        {error.type === 'FEATURE_DISABLED' ? 'Temporarily <span>Closed</span>' : 'System <span>Error</span>'}
                    </h2>
                    <p className="text-slate-400 max-w-md mb-12 italic">
                        {error.message}
                    </p>
                    {error.type === 'FEATURE_DISABLED' && (
                        <button className="btn-primary-nm" onClick={() => navigate('/shop')}>
                            Return to Shop
                        </button>
                    )}
                </div>
            </div>
        );
    }

    if (!isLoggedIn) {
        return (
            <div className="night-market-page">
                <button className="nm-back-btn" onClick={() => navigate('/shop')}>
                    <ArrowLeft size={18} />
                    <span>{t('common.back', 'Quay lại')}</span>
                </button>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', paddingTop: '15vh' }}>
                    <div className="w-24 h-24 mb-8 bg-white/5 rounded-full flex items-center justify-center border border-white/10">
                        <Zap className="text-cyan-400" size={48} />
                    </div>
                    <h2 className="nm-title mb-6">Access <span>Denied</span></h2>
                    <p className="text-slate-400 max-w-md mb-12 italic">
                        The Night Market is a classified event available only to registered members. Log in to view your personalized offers.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="night-market-page">
            <div className="nm-background">
                <div className="nm-grid"></div>
                <div className="nm-glow-1"></div>
                <div className="nm-glow-2"></div>
            </div>

            <button
                className="nm-back-btn"
                onClick={() => navigate('/shop')}
            >
                <ArrowLeft size={18} />
                <span>{t('common.back', 'Quay lại')}</span>
            </button>

            <div className="nm-header">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="nm-event-tag"
                >
                    <div className="nm-line"></div>
                    <span className="nm-tag-text">Classified Event</span>
                    <div className="nm-line rev"></div>
                </motion.div>

                <motion.h1
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="nm-title"
                >
                    Night <span>Market</span>
                    <div className="nm-underline"></div>
                </motion.h1>

                <div className="nm-features">
                    {[
                        { icon: Sparkles, label: t('nightMarket.personalizedLoot', 'Personalized Loot') },
                        { icon: Zap, label: t('nightMarket.hugeDiscounts', 'Huge Discounts') },
                        { icon: ShieldCheck, label: t('nightMarket.limitedTime', 'Limited Time') }
                    ].map((item, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.5 + (i * 0.2) }}
                            className="nm-feature-item"
                        >
                            <item.icon className="nm-feature-icon" size={16} />
                            <span className="nm-feature-label">{item.label}</span>
                        </motion.div>
                    ))}
                </div>
            </div>

            <div className="nm-grid-container">
                {offers.map((offer, index) => (
                    <motion.div
                        key={offer.id}
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 * index }}
                    >
                        <NightMarketCard
                            offer={offer}
                            onReveal={handleReveal}
                        />
                    </motion.div>
                ))}
            </div>

            <div className="nm-footer">
                <div className="nm-notice-box">
                    <div className="nm-notice-inner">
                        <p className="nm-notice-label">Notice</p>
                        <p className="nm-notice-text">
                            These offers are unique to your account and will expire in 7 days. Once they are gone, they are gone forever.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default NightMarket;
