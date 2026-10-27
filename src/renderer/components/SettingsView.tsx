import React, { useState } from 'react';
import {
  Download,
  Upload,
  FolderOpen,
  ShieldCheck,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import {
  AccentType,
  AppSettings,
  DensityMode,
  ImportAnalysis,
  ImportConflictStrategy,
  ImportOptions,
  Language,
  ShortcutRegistrationStatus,
  SortBy,
  SortOrder,
  ThemeMode
} from '../../shared/types';
import { APP_VERSION } from '../../shared/constants';
import { TranslationDict } from '../i18n/translations';

interface SettingsViewProps {
  settings: AppSettings;
  shortcutStatus: ShortcutRegistrationStatus;
  onUpdateSettings: (partial: Partial<AppSettings>) => Promise<void>;
  onUpdateShortcut: (shortcut: string) => Promise<void>;
  onExportAllJson: () => Promise<void>;
  onSelectImportFile: () => Promise<{
    canceled: boolean;
    filePath?: string;
    rawContent?: string;
    analysis?: ImportAnalysis;
  }>;
  onExecuteImport: (rawContent: string, options: ImportOptions) => Promise<void>;
  onCreateManualBackup: () => Promise<void>;
  onOpenDataFolder: () => Promise<void>;
  lang: Language;
  t: TranslationDict;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  shortcutStatus,
  onUpdateSettings,
  onUpdateShortcut,
  onExportAllJson,
  onSelectImportFile,
  onExecuteImport,
  onCreateManualBackup,
  onOpenDataFolder,
  lang,
  t
}) => {
  const [shortcutInput, setShortcutInput] = useState(settings.globalShortcut);
  const [importModalState, setImportModalState] = useState<{
    rawContent: string;
    analysis: ImportAnalysis;
  } | null>(null);
  const [conflictStrategy, setConflictStrategy] = useState<ImportConflictStrategy>('skip');
  const [includeBlocks, setIncludeBlocks] = useState(true);
  const [includeSettings, setIncludeSettings] = useState(false);

  const handleOpenImport = async () => {
    const res = await onSelectImportFile();
    if (!res.canceled && res.rawContent && res.analysis) {
      setImportModalState({
        rawContent: res.rawContent,
        analysis: res.analysis
      });
    }
  };

  const handleConfirmImport = async () => {
    if (!importModalState) return;
    await onExecuteImport(importModalState.rawContent, {
      conflictStrategy,
      includeBlocks,
      includeSettings
    });
    setImportModalState(null);
  };

  return (
    <div className="page-container">
      <h1 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700 }}>{t.settingsTitle}</h1>

      {/* 1. Appearance & Theme */}
      <section className="settings-card">
        <h2 style={{ fontSize: 'var(--font-size-base)', fontWeight: 600 }}>{t.appearanceSection}</h2>

        <div className="settings-row">
          <span>{t.themeLabel}</span>
          <select
            className="select-input"
            value={settings.theme}
            onChange={e => onUpdateSettings({ theme: e.target.value as ThemeMode })}
          >
            <option value="system">{t.themeSystem}</option>
            <option value="light">{t.themeLight}</option>
            <option value="dark">{t.themeDark}</option>
          </select>
        </div>

        <div className="settings-row">
          <span>{t.accentColorLabel}</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <select
              className="select-input"
              value={settings.accentType}
              onChange={e => onUpdateSettings({ accentType: e.target.value as AccentType })}
            >
              <option value="neutral">{t.accentNeutral}</option>
              <option value="system">{t.accentSystem}</option>
              <option value="custom">{t.accentCustom}</option>
            </select>
            {settings.accentType === 'custom' && (
              <input
                type="color"
                value={settings.customAccentColor}
                onChange={e => onUpdateSettings({ customAccentColor: e.target.value })}
                style={{ width: 40, height: 34, border: '1px solid var(--border-subtle)', borderRadius: 6, cursor: 'pointer' }}
              />
            )}
          </div>
        </div>

        <div className="settings-row">
          <span>{t.densityLabel}</span>
          <select
            className="select-input"
            value={settings.density}
            onChange={e => onUpdateSettings({ density: e.target.value as DensityMode })}
          >
            <option value="comfortable">{t.densityComfortable}</option>
            <option value="compact">{t.densityCompact}</option>
          </select>
        </div>

        <div className="settings-row">
          <span>{t.reducedMotionLabel}</span>
          <input
            type="checkbox"
            checked={settings.reducedMotion}
            onChange={e => onUpdateSettings({ reducedMotion: e.target.checked })}
            style={{ width: 18, height: 18, cursor: 'pointer' }}
          />
        </div>
      </section>

      {/* 2. Language & Default Sorting */}
      <section className="settings-card">
        <h2 style={{ fontSize: 'var(--font-size-base)', fontWeight: 600 }}>{t.languageSection}</h2>

        <div className="settings-row">
          <span>{t.languageLabel}</span>
          <select
            className="select-input"
            value={settings.language}
            onChange={e => onUpdateSettings({ language: e.target.value as Language })}
          >
            <option value="fa">فارسی (راست‌به‌چپ / RTL)</option>
            <option value="en">English (Left-to-Right / LTR)</option>
          </select>
        </div>

        <div className="settings-row">
          <span>{t.defaultSortSection}</span>
          <div style={{ display: 'flex', gap: '8px' }}>
            <select
              className="select-input"
              value={settings.defaultSortBy}
              onChange={e => onUpdateSettings({ defaultSortBy: e.target.value as SortBy })}
            >
              <option value="updatedAt">{t.sortUpdated}</option>
              <option value="createdAt">{t.sortCreated}</option>
              <option value="alphabetical">{t.sortAlpha}</option>
              <option value="usageCount">{t.sortUsage}</option>
            </select>
            <select
              className="select-input"
              value={settings.defaultSortOrder}
              onChange={e => onUpdateSettings({ defaultSortOrder: e.target.value as SortOrder })}
            >
              <option value="desc">{t.sortDesc}</option>
              <option value="asc">{t.sortAsc}</option>
            </select>
          </div>
        </div>

        <div className="settings-row">
          <span>{t.versionLimitLabel}</span>
          <input
            type="number"
            min={1}
            max={50}
            className="text-input"
            style={{ width: 90 }}
            value={settings.versionHistoryLimit}
            onChange={e =>
              onUpdateSettings({
                versionHistoryLimit: Math.max(1, Math.min(50, Number(e.target.value) || 10))
              })
            }
          />
        </div>
      </section>

      {/* 3. Global Quick Launcher Shortcut */}
      <section className="settings-card">
        <h2 style={{ fontSize: 'var(--font-size-base)', fontWeight: 600 }}>{t.shortcutsSection}</h2>

        <div className="settings-row">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span>{t.globalShortcutLabel}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: 'var(--font-size-xs)' }}>
              {shortcutStatus.registered ? (
                <span style={{ color: 'var(--status-success)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <CheckCircle2 size={14} /> {t.shortcutActiveBadge} ({shortcutStatus.shortcut})
                </span>
              ) : (
                <span style={{ color: 'var(--status-danger)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <AlertCircle size={14} /> {shortcutStatus.error || t.shortcutFailedBadge}
                </span>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <input
              type="text"
              className="text-input"
              dir="ltr"
              style={{ width: 240, fontFamily: 'var(--font-mono)' }}
              value={shortcutInput}
              onChange={e => setShortcutInput(e.target.value)}
              placeholder="CommandOrControl+Shift+Space"
            />
            <button
              className="btn btn-primary"
              onClick={() => onUpdateShortcut(shortcutInput)}
            >
              {t.applyShortcutBtn}
            </button>
          </div>
        </div>
      </section>

      {/* 4. Data Portability & Backups */}
      <section className="settings-card">
        <h2 style={{ fontSize: 'var(--font-size-base)', fontWeight: 600 }}>{t.dataBackupSection}</h2>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button className="btn btn-primary" onClick={onExportAllJson}>
            <Download size={15} />
            <span>{t.exportAllJsonBtn}</span>
          </button>
          <button className="btn" onClick={handleOpenImport}>
            <Upload size={15} />
            <span>{t.importJsonBtn}</span>
          </button>
          <button className="btn" onClick={onCreateManualBackup}>
            <ShieldCheck size={15} />
            <span>{t.createBackupNowBtn}</span>
          </button>
          <button className="btn" onClick={onOpenDataFolder}>
            <FolderOpen size={15} />
            <span>{t.openDataFolderBtn}</span>
          </button>
        </div>
      </section>

      {/* 5. About Section */}
      <section className="settings-card">
        <h2 style={{ fontSize: 'var(--font-size-base)', fontWeight: 600 }}>
          {t.aboutSection} — v{APP_VERSION}
        </h2>
        <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
          {t.aboutDescription}
        </p>
      </section>

      {/* Import Conflict Resolution Modal */}
      {importModalState && (
        <div className="modal-backdrop" onClick={() => setImportModalState(null)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <strong>{t.importModalTitle}</strong>
            </div>
            <div className="modal-body">
              {!importModalState.analysis.valid ? (
                <div style={{ color: 'var(--status-danger)' }}>
                  {importModalState.analysis.errors.map((err, i) => (
                    <p key={i}>{err}</p>
                  ))}
                </div>
              ) : (
                <>
                  <div style={{ fontSize: 'var(--font-size-sm)', display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <div>
                      • {lang === 'fa' ? 'تعداد کل پرامپت‌های فایل:' : 'Prompts found in file:'}{' '}
                      <strong>{importModalState.analysis.totalPrompts}</strong>
                    </div>
                    <div>
                      • {lang === 'fa' ? 'موارد تکراری شناسایی‌شده:' : 'Duplicates detected:'}{' '}
                      <strong>{importModalState.analysis.duplicatePromptsCount}</strong>
                    </div>
                    <div>
                      • {lang === 'fa' ? 'بلوک‌های آماده:' : 'Reusable blocks:'}{' '}
                      <strong>{importModalState.analysis.blocksCount}</strong>
                    </div>
                  </div>

                  <div className="form-field">
                    <label className="form-label">{t.importConflictLabel}</label>
                    <select
                      className="select-input"
                      value={conflictStrategy}
                      onChange={e => setConflictStrategy(e.target.value as ImportConflictStrategy)}
                    >
                      <option value="skip">{t.conflictSkip}</option>
                      <option value="copy">{t.conflictCopy}</option>
                      <option value="overwrite">{t.conflictOverwrite}</option>
                    </select>
                  </div>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={includeBlocks}
                      onChange={e => setIncludeBlocks(e.target.checked)}
                    />
                    <span>{t.importIncludeBlocks}</span>
                  </label>

                  {importModalState.analysis.hasSettings && (
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={includeSettings}
                        onChange={e => setIncludeSettings(e.target.checked)}
                      />
                      <span>{t.importIncludeSettings}</span>
                    </label>
                  )}
                </>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn" onClick={() => setImportModalState(null)}>
                {t.cancel}
              </button>
              {importModalState.analysis.valid && (
                <button className="btn btn-primary" onClick={handleConfirmImport}>
                  {t.confirmImportBtn}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
