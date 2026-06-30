import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { colorAPI, sizeAPI } from "@shared/utils/api.js";
import { useToast } from "@shared/context/ToastContext";
import { useTranslation } from "react-i18next";
import { useConfirm } from "@shared/context/ConfirmContext";
import "../styles/dashboard.css";
import "../styles/pages.css";

// SVG Icons
const CloseIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M18 6L6 18M6 6l12 12" />
    </svg>
);

const ArrowUpIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 19V5M5 12l7-7 7 7" />
    </svg>
);

const ArrowDownIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 5v14M5 12l7 7 7-7" />
    </svg>
);

function Modal({ open, title, children, onClose }) {
    if (!open) return null;
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

// Empty forms
const emptyColorForm = { name: "", hexCode: "#000000" };
const emptySizeForm = { name: "", sortOrder: 0 };

export default function ColorsAndSizes() {
    const { t } = useTranslation();
    const [activeTab, setActiveTab] = useState("colors");

    return (
        <div className="card">
            <div className="cardHead">
                <div>
                    <div className="cardTitle">{t("products.color_size_title")}</div>
                    <div className="cardSub">{t("products.color_size_subtitle")}</div>
                </div>
            </div>

            {/* Tabs */}
            <div className="chips" style={{ marginBottom: 20 }}>
                <button
                    className={`chip ${activeTab === "colors" ? "on" : ""}`}
                    onClick={() => setActiveTab("colors")}
                    type="button"
                >
                    {t("colors.tab")}
                </button>
                <button
                    className={`chip ${activeTab === "sizes" ? "on" : ""}`}
                    onClick={() => setActiveTab("sizes")}
                    type="button"
                >
                    {t("sizes.tab")}
                </button>
            </div>

            {activeTab === "colors" ? <ColorsTab /> : <SizesTab />}
        </div>
    );
}

function ColorsTab() {
    const { t } = useTranslation();
    const [colors, setColors] = useState([]);
    const [loading, setLoading] = useState(true);
    const [q, setQ] = useState("");
    const [editOpen, setEditOpen] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [form, setForm] = useState(emptyColorForm);
    const [saving, setSaving] = useState(false);
    const { showToast } = useToast();
    const { showConfirm } = useConfirm();

    useEffect(() => {
        loadData();
    }, []);

    async function loadData() {
        setLoading(true);
        try {
            const data = await colorAPI.getAll();
            setColors(data || []);
        } catch (error) {
            console.error("Failed to load colors:", error);
        } finally {
            setLoading(false);
        }
    }

    const editing = useMemo(
        () => colors.find((c) => c.id === editingId) || null,
        [colors, editingId]
    );

    const filtered = useMemo(() => {
        return colors.filter((c) => {
            const text = `${c.name || ""} ${c.hexCode || ""}`.toLowerCase();
            return !q || text.includes(q.toLowerCase());
        });
    }, [colors, q]);

    function openAdd() {
        setEditingId(null);
        setForm(emptyColorForm);
        setEditOpen(true);
    }

    function openEdit(c) {
        setEditingId(c.id);
        setForm({
            name: c.name || "",
            hexCode: c.hexCode || "#000000",
        });
        setEditOpen(true);
    }

    async function save() {
        if (!form.name) {
            showToast(t("colors.validate_error"), "error");
            return;
        }

        setSaving(true);
        try {
            const payload = {
                name: form.name,
                hexCode: form.hexCode || "#000000",
            };

            if (editingId) {
                await colorAPI.update(editingId, payload);
            } else {
                await colorAPI.create(payload);
            }
            await loadData();
            setEditOpen(false);
            showToast(editingId ? t("products.msg_update_success") : t("products.msg_save_success"));
        } catch (error) {
            showToast(error.message || "Error", "error");
        } finally {
            setSaving(false);
        }
    }

    async function deleteItem(c) {
        if (!(await showConfirm(t("common.confirm_delete_title"), t("colors.delete_confirm", { name: c.name })))) return;
        try {
            await colorAPI.delete(c.id);
            await loadData();
            showToast(t("products.msg_delete_success"));
        } catch (error) {
            showToast(error.message || "Error", "error");
        }
    }

    if (loading) {
        return (
            <div style={{ padding: 40, textAlign: "center", color: "#666" }}>
                {t("common.loading")}
            </div>
        );
    }

    return (
        <>
            <div style={{ display: "flex", gap: 10, marginBottom: 16, justifyContent: "space-between" }}>
                <input
                    className="miniInput"
                    placeholder={t("colors.search_placeholder")}
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    style={{ flex: 1, maxWidth: 300 }}
                />
                <button className="btnPrimary" type="button" onClick={openAdd}>
                    {t("colors.btn_add")}
                </button>
            </div>

            {/* Grid layout for colors */}
            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
                    gap: 12,
                }}
            >
                {filtered.length === 0 ? (
                    <div style={{ padding: 40, textAlign: "center", color: "#888", gridColumn: "1 / -1" }}>
                        {t("colors.empty")}
                    </div>
                ) : (
                    filtered.map((c) => (
                        <div
                            key={c.id}
                            style={{
                                background: "var(--glass-bg)",
                                border: "1px solid var(--admin-border)",
                                borderRadius: "var(--admin-radius-md)",
                                padding: "12px 16px",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                gap: 12,
                            }}
                        >
                            <div
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 12,
                                    minWidth: 0,
                                    flex: 1,
                                }}
                            >
                                <div
                                    style={{
                                        width: 40,
                                        height: 40,
                                        borderRadius: 8,
                                        background: c.hexCode || "#000",
                                        border: "2px solid rgba(255,255,255,0.2)",
                                        flexShrink: 0,
                                    }}
                                    title={c.hexCode}
                                />
                                <div style={{ minWidth: 0, flex: 1 }}>
                                    <div
                                        style={{
                                            fontWeight: 600,
                                            color: "var(--admin-text)",
                                            whiteSpace: "nowrap",
                                            overflow: "hidden",
                                            textOverflow: "ellipsis",
                                        }}
                                        title={c.name}
                                    >
                                        {c.name}
                                    </div>
                                    <div className="mono" style={{ fontSize: 11, color: "var(--admin-text-muted)" }}>
                                        {c.hexCode}
                                    </div>
                                </div>
                            </div>
                            <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                                <button
                                    className="linkBtn"
                                    type="button"
                                    onClick={() => openEdit(c)}
                                    style={{ padding: "4px 6px" }}
                                >
                                    {t("common.edit")}
                                </button>
                                <button
                                    className="linkBtn"
                                    type="button"
                                    onClick={() => deleteItem(c)}
                                    style={{ color: "var(--admin-error)", padding: "4px 6px" }}
                                >
                                    {t("common.delete")}
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            <Modal
                open={editOpen}
                title={editing ? t("colors.modal_edit", { name: editing.name }) : t("colors.modal_add")}
                onClose={() => setEditOpen(false)}
            >
                <div className="formGrid">
                    <label className="field">
                        <span>{t("colors.label_name")}</span>
                        <input
                            value={form.name}
                            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                            placeholder="VD: Đen"
                        />
                    </label>
                    <label className="field">
                        <span>{t("colors.label_hex")}</span>
                        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                            <input
                                type="color"
                                value={form.hexCode}
                                onChange={(e) => setForm((f) => ({ ...f, hexCode: e.target.value }))}
                                style={{
                                    width: 48,
                                    height: 40,
                                    border: "1px solid var(--admin-border)",
                                    borderRadius: 8,
                                    cursor: "pointer",
                                    padding: 0,
                                }}
                            />
                            <input
                                value={form.hexCode}
                                onChange={(e) => setForm((f) => ({ ...f, hexCode: e.target.value }))}
                                placeholder="#000000"
                                style={{ flex: 1 }}
                            />
                        </div>
                    </label>
                </div>
                <div className="modalActions">
                    <button className="btnGhost" type="button" onClick={() => setEditOpen(false)}>
                        {t("common.cancel")}
                    </button>
                    <button className="btnPrimary" type="button" onClick={save} disabled={saving}>
                        {saving ? t("products.gallery_saving") : editing ? t("common.save") : t("common.add")}
                    </button>
                </div>
            </Modal>
        </>
    );
}

function SizesTab() {
    const { t } = useTranslation();
    const [sizes, setSizes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editOpen, setEditOpen] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [form, setForm] = useState(emptySizeForm);
    const [saving, setSaving] = useState(false);
    const { showToast } = useToast();
    const { showConfirm } = useConfirm();

    useEffect(() => {
        loadData();
    }, []);

    async function loadData() {
        setLoading(true);
        try {
            const data = await sizeAPI.getAll();
            // Sort by sortOrder
            const sorted = (data || []).sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
            setSizes(sorted);
        } catch (error) {
            console.error("Failed to load sizes:", error);
        } finally {
            setLoading(false);
        }
    }

    const editing = useMemo(
        () => sizes.find((s) => s.id === editingId) || null,
        [sizes, editingId]
    );

    function openAdd() {
        setEditingId(null);
        setForm({ name: "", sortOrder: sizes.length });
        setEditOpen(true);
    }

    function openEdit(s) {
        setEditingId(s.id);
        setForm({
            name: s.name || "",
            sortOrder: s.sortOrder || 0,
        });
        setEditOpen(true);
    }

    async function save() {
        if (!form.name) {
            showToast(t("sizes.validate_error"), "error");
            return;
        }

        setSaving(true);
        try {
            const payload = {
                name: form.name,
                sortOrder: Number(form.sortOrder) || 0,
            };

            if (editingId) {
                await sizeAPI.update(editingId, payload);
            } else {
                await sizeAPI.create(payload);
            }
            await loadData();
            setEditOpen(false);
            showToast(editingId ? t("products.msg_update_success") : t("products.msg_save_success"));
        } catch (error) {
            showToast(error.message || "Error", "error");
        } finally {
            setSaving(false);
        }
    }

    async function deleteItem(s) {
        if (!(await showConfirm(t("common.confirm_delete_title"), t("sizes.delete_confirm", { name: s.name })))) return;
        try {
            await sizeAPI.delete(s.id);
            await loadData();
            showToast(t("products.msg_delete_success"));
        } catch (error) {
            showToast(error.message || "Error", "error");
        }
    }

    async function moveUp(index) {
        if (index <= 0) return;
        const newSizes = [...sizes];
        [newSizes[index - 1], newSizes[index]] = [newSizes[index], newSizes[index - 1]];
        await saveOrder(newSizes);
    }

    async function moveDown(index) {
        if (index >= sizes.length - 1) return;
        const newSizes = [...sizes];
        [newSizes[index], newSizes[index + 1]] = [newSizes[index + 1], newSizes[index]];
        await saveOrder(newSizes);
    }

    async function saveOrder(newSizes) {
        try {
            const orders = newSizes.map((s, i) => ({ id: s.id, sortOrder: i }));
            await sizeAPI.reorder(orders);
            await loadData();
            showToast(t("sizes.order_saved"));
        } catch (error) {
            showToast(error.message || "Error", "error");
        }
    }

    if (loading) {
        return (
            <div style={{ padding: 40, textAlign: "center", color: "#666" }}>
                {t("common.loading")}
            </div>
        );
    }

    return (
        <>
            <div style={{ display: "flex", gap: 10, marginBottom: 16, justifyContent: "flex-end" }}>
                <button className="btnPrimary" type="button" onClick={openAdd}>
                    {t("sizes.btn_add")}
                </button>
            </div>

            <div className="table">
                <div className="tr th" style={{ gridTemplateColumns: "60px 1fr 120px 150px" }}>
                    <div>{t("sizes.col_no")}</div>
                    <div>{t("sizes.col_name")}</div>
                    <div>{t("sizes.col_order")}</div>
                    <div>{t("categories.col_action")}</div>
                </div>
                {sizes.length === 0 ? (
                    <div style={{ padding: 40, textAlign: "center", color: "#888" }}>
                        {t("sizes.empty")}
                    </div>
                ) : (
                    sizes.map((s, index) => (
                        <div
                            className="tr"
                            key={s.id}
                            style={{ gridTemplateColumns: "60px 1fr 120px 150px" }}
                        >
                            <div style={{ color: "var(--admin-text-muted)" }}>{index + 1}</div>
                            <div style={{ fontWeight: 600 }}>{s.name}</div>
                            <div style={{ display: "flex", gap: 4 }}>
                                <button
                                    className="iconBtn"
                                    type="button"
                                    onClick={() => moveUp(index)}
                                    disabled={index === 0}
                                    style={{
                                        width: 28,
                                        height: 28,
                                        opacity: index === 0 ? 0.3 : 1,
                                    }}
                                    title={t("sizes.move_up")}
                                >
                                    <ArrowUpIcon />
                                </button>
                                <button
                                    className="iconBtn"
                                    type="button"
                                    onClick={() => moveDown(index)}
                                    disabled={index === sizes.length - 1}
                                    style={{
                                        width: 28,
                                        height: 28,
                                        opacity: index === sizes.length - 1 ? 0.3 : 1,
                                    }}
                                    title={t("sizes.move_down")}
                                >
                                    <ArrowDownIcon />
                                </button>
                            </div>
                            <div className="rowActions">
                                <button className="linkBtn" type="button" onClick={() => openEdit(s)}>
                                    {t("common.edit")}
                                </button>
                                <button
                                    className="linkBtn"
                                    type="button"
                                    onClick={() => deleteItem(s)}
                                    style={{ color: "var(--admin-error)" }}
                                >
                                    {t("common.delete")}
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            <Modal
                open={editOpen}
                title={editing ? t("sizes.modal_edit", { name: editing.name }) : t("sizes.modal_add")}
                onClose={() => setEditOpen(false)}
            >
                <div className="formGrid">
                    <label className="field">
                        <span>{t("sizes.label_name")}</span>
                        <input
                            value={form.name}
                            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                            placeholder="VD: M, L, XL"
                        />
                    </label>
                    <label className="field">
                        <span>{t("sizes.label_order")}</span>
                        <input
                            type="number"
                            value={form.sortOrder}
                            onChange={(e) => setForm((f) => ({ ...f, sortOrder: e.target.value }))}
                            placeholder="0"
                        />
                    </label>
                </div>
                <div className="modalActions">
                    <button className="btnGhost" type="button" onClick={() => setEditOpen(false)}>
                        {t("common.cancel")}
                    </button>
                    <button className="btnPrimary" type="button" onClick={save} disabled={saving}>
                        {saving ? t("products.gallery_saving") : editing ? t("common.save") : t("common.add")}
                    </button>
                </div>
            </Modal>
        </>
    );
}
