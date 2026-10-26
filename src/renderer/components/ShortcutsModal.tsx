import React from 'react';
import { X, Keyboard } from 'lucide-react';
import { Language } from '../../shared/types';
import { TranslationDict } from '../i18n/translations';

interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: Language;
  t: TranslationDict;
  globalShortcut: string;
}

export const ShortcutsModal: React.FC<ShortcutsModalProps> = ({
  isOpen,
  onClose,
  lang,
  t,
  globalShortcut
}) => {
  if (!isOpen) return null;

  const shortcuts = [
    {
      keys: 'Ctrl + N',
      label: lang === 'fa' ? 'ایجاد پرامپت جدید' : 'Create new prompt'
    },
    {
      keys: 'Ctrl + K',
      label: lang === 'fa' ? 'تمرکز روی کادر جستجوی سراسری' : 'Focus global search bar'
    },
    {
      keys: globalShortcut || 'Ctrl + Shift + Space',
      label: lang === 'fa' ? 'باز کردن پنجره جستجوی سریع (Quick Launcher)' : 'Open global Quick Launcher window'
    },
    {
      keys: 'Ctrl + S',
      label: lang === 'fa' ? 'ذخیره تغییرات در هنگام ویرایش پرامپت' : 'Save prompt edits in editor'
    },
    {
      keys: 'Ctrl + Enter',
      label: lang === 'fa' ? 'کپی کردن پرامپت انتخاب‌شده یا تکمیل‌شده' : 'Copy selected or variable-filled prompt'
    },
    {
      keys: '↑ / ↓ / Enter',
      label: lang === 'fa' ? 'پیمایش و کپی سریع در پنجره Quick Launcher' : 'Navigate and copy in Quick Launcher'
    },
    {
      keys: 'Escape',
      label: lang === 'fa' ? 'بستن پنجره‌های باز یا بازگشت به نمای قبلی' : 'Close active modal, drawer, or Quick Launcher'
    }
  ];

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600 }}>
            <Keyboard size={18} />
            <span>{t.keyboardShortcuts}</span>
          </div>
          <button className="icon-btn" onClick={onClose} title={t.close}>
            <X size={18} />
          </button>
        </div>
        <div className="modal-body">
          {shortcuts.map((item, idx) => (
            <div
              key={idx}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingBottom: '10px',
                borderBottom: idx < shortcuts.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                gap: '16px'
              }}
            >
              <span style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>
                {item.label}
              </span>
              <kbd
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 'var(--font-size-xs)',
                  padding: '3px 8px',
                  borderRadius: '4px',
                  backgroundColor: 'var(--bg-surface-muted)',
                  border: '1px solid var(--border-strong)',
                  direction: 'ltr',
                  whiteSpace: 'nowrap'
                }}
              >
                {item.keys}
              </kbd>
            </div>
          ))}
        </div>
        <div className="modal-footer">
          <button className="btn btn-primary" onClick={onClose}>
            {t.close}
          </button>
        </div>
      </div>
    </div>
  );
};
