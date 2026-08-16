import { useState } from 'react';
import { useAppStore } from '../../store/appStore';
import PageHeader from '../../components/common/PageHeader.jsx';
import {
  Building2, Clock, Users, AlertTriangle, Bell, Globe,
  Camera, Radio, Monitor, Database, Shield, Zap,
  ChevronRight, Save, RotateCcw
} from 'lucide-react';

const SECTIONS = [
  { id: 'store', label: 'Store Profile', icon: Building2 },
  { id: 'hours', label: 'Operating Hours', icon: Clock },
  { id: 'occupancy', label: 'Occupancy Limits', icon: Users },
  { id: 'queue', label: 'Queue Thresholds', icon: Users },
  { id: 'alerts', label: 'Alert Rules', icon: AlertTriangle },
  { id: 'regional', label: 'Currency & Timezone', icon: Globe },
  { id: 'cameras', label: 'Camera Devices', icon: Camera },
  { id: 'sensors', label: 'Sensors', icon: Radio },
  { id: 'pos', label: 'POS Terminals', icon: Monitor },
  { id: 'data', label: 'Data Retention', icon: Database },
  { id: 'privacy', label: 'Privacy Mode', icon: Shield },
  { id: 'demo', label: 'Demo Simulation', icon: Zap },
];

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState('store');
  const [saved, setSaved] = useState(false);

  const { demoMode, triggerDemoEvent, resetDemo } = useAppStore();

  // Local state for settings
  const [settings, setSettings] = useState({
    storeName: 'Cairo Festival City',
    storeAddress: 'New Cairo, Cairo, Egypt',
    openTime: '10:00',
    closeTime: '22:00',
    maxOccupancy: 120,
    warningOccupancy: 100,
    maxQueueWait: 300,
    queueWarning: 180,
    currency: 'EGP',
    timezone: 'Africa/Cairo',
    dateFormat: 'dd/MM/yyyy',
    dataRetentionDays: 90,
    privacyMode: true,
    anonymousTracking: true,
    noFaceRecognition: true,
    edgeProcessing: true,
    alertEmail: true,
    alertSms: false,
    alertPush: true,
  });

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const update = (key, value) => setSettings(prev => ({ ...prev, [key]: value }));

  return (
    <div>
      <PageHeader title="Settings" subtitle="System configuration and preferences" />

      <div className="flex gap-6">
        {/* Sidebar */}
        <div data-tour="settings-sections" className="w-56 shrink-0 hidden md:block">
          <div className="space-y-0.5">
            {SECTIONS.map(s => (
              <button
                key={s.id}
                onClick={() => setActiveSection(s.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs font-medium transition-colors ${
                  activeSection === s.id
                    ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-white/[0.04] border border-transparent'
                }`}
              >
                <s.icon size={14} />
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div data-tour="settings-content" className="flex-1">
          <div className="glass rounded-xl p-6">
            {activeSection === 'store' && (
              <SettingsSection title="Store Profile">
                <Field label="Store Name" value={settings.storeName} onChange={v => update('storeName', v)} />
                <Field label="Address" value={settings.storeAddress} onChange={v => update('storeAddress', v)} />
              </SettingsSection>
            )}

            {activeSection === 'hours' && (
              <SettingsSection title="Operating Hours">
                <Field label="Opening Time" value={settings.openTime} onChange={v => update('openTime', v)} type="time" />
                <Field label="Closing Time" value={settings.closeTime} onChange={v => update('closeTime', v)} type="time" />
              </SettingsSection>
            )}

            {activeSection === 'occupancy' && (
              <SettingsSection title="Occupancy Limits">
                <Field label="Maximum Occupancy" value={settings.maxOccupancy} onChange={v => update('maxOccupancy', Number(v))} type="number" />
                <Field label="Warning Threshold" value={settings.warningOccupancy} onChange={v => update('warningOccupancy', Number(v))} type="number" />
              </SettingsSection>
            )}

            {activeSection === 'queue' && (
              <SettingsSection title="Queue Thresholds">
                <Field label="Max Wait Time (seconds)" value={settings.maxQueueWait} onChange={v => update('maxQueueWait', Number(v))} type="number" />
                <Field label="Warning Threshold (seconds)" value={settings.queueWarning} onChange={v => update('queueWarning', Number(v))} type="number" />
              </SettingsSection>
            )}

            {activeSection === 'alerts' && (
              <SettingsSection title="Alert Rules">
                <Toggle label="Email Notifications" value={settings.alertEmail} onChange={v => update('alertEmail', v)} />
                <Toggle label="SMS Notifications" value={settings.alertSms} onChange={v => update('alertSms', v)} />
                <Toggle label="Push Notifications" value={settings.alertPush} onChange={v => update('alertPush', v)} />
              </SettingsSection>
            )}

            {activeSection === 'regional' && (
              <SettingsSection title="Currency & Timezone">
                <Field label="Currency" value={settings.currency} onChange={v => update('currency', v)} />
                <Field label="Timezone" value={settings.timezone} onChange={v => update('timezone', v)} />
                <Field label="Date Format" value={settings.dateFormat} onChange={v => update('dateFormat', v)} />
              </SettingsSection>
            )}

            {activeSection === 'cameras' && (
              <SettingsSection title="Camera Devices">
                <DeviceList items={['CAM-01 (Electronics)', 'CAM-02 (Mobile)', 'CAM-03 (Accessories)', 'CAM-04 (Promo)', 'CAM-05 (Service)', 'CAM-06 (Checkout)', 'CAM-07 (Entrance)']} />
              </SettingsSection>
            )}

            {activeSection === 'sensors' && (
              <SettingsSection title="Sensors">
                <DeviceList items={['SN-01 (Entry Counter)', 'SN-02 (Exit Counter)', 'SN-03 (Electronics Zone)', 'SN-04 (Mobile Zone)', 'SN-05 (Checkout Area)', 'SN-06 (Entrance)']} />
              </SettingsSection>
            )}

            {activeSection === 'pos' && (
              <SettingsSection title="POS Terminals">
                <DeviceList items={['POS-01 (Active — Ahmed Hassan)', 'POS-02 (Active — Fatma Ali)', 'POS-03 (Active — Omar Khaled)', 'POS-04 (Idle — Nour Ibrahim)']} />
              </SettingsSection>
            )}

            {activeSection === 'data' && (
              <SettingsSection title="Data Retention">
                <Field label="Retention Period (days)" value={settings.dataRetentionDays} onChange={v => update('dataRetentionDays', Number(v))} type="number" />
              </SettingsSection>
            )}

            {activeSection === 'privacy' && (
              <SettingsSection title="Privacy Mode">
                <Toggle label="Anonymous Tracking Only" value={settings.anonymousTracking} onChange={v => update('anonymousTracking', v)} />
                <Toggle label="No Face Recognition" value={settings.noFaceRecognition} onChange={v => update('noFaceRecognition', v)} />
                <Toggle label="Local Edge Processing" value={settings.edgeProcessing} onChange={v => update('edgeProcessing', v)} />
                <div className="mt-4 p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
                  <p className="text-xs text-emerald-400 font-medium mb-1">🔒 Privacy-First Architecture</p>
                  <p className="text-[11px] text-gray-400 leading-relaxed">
                    All customer tracking is fully anonymous. No facial recognition, identity storage, or demographic inference (age, gender, emotion).
                    Data is processed at the edge with only aggregated analytics stored.
                  </p>
                </div>
              </SettingsSection>
            )}

            {activeSection === 'demo' && (
              <SettingsSection title="Demo Simulation Controls">
                <p className="text-xs text-gray-400 mb-4">Trigger simulated events for client demonstrations. These affect KPIs, Digital Twin, and Alerts in real-time.</p>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: '🏃 Customer Rush', event: 'customer_rush', desc: 'Simulate sudden traffic spike' },
                    { label: '⏳ Checkout Congestion', event: 'checkout_congestion', desc: 'Increase queue wait times' },
                    { label: '📦 Low Stock Event', event: 'low_stock', desc: 'Trigger inventory alert' },
                    { label: '🖥️ POS Failure', event: 'pos_failure', desc: 'POS-03 goes offline' },
                    { label: '📷 Camera Offline', event: 'camera_offline', desc: 'CAM-06 disconnected' },
                    { label: '📉 Conversion Drop', event: 'conversion_drop', desc: 'Simulate sales decline' },
                    { label: '📥 New Stock Arrival', event: 'stock_arrival', desc: 'Inventory replenishment' },
                    { label: '🏢 Branch Compare', event: 'branch_compare', desc: 'Show cross-branch data' },
                  ].map(item => (
                    <button
                      key={item.event}
                      onClick={() => triggerDemoEvent({ type: item.event, label: item.label })}
                      className="p-3 rounded-lg bg-white/[0.03] border border-white/[0.06] hover:border-amber-500/20 hover:bg-amber-500/[0.03] text-left transition-colors"
                    >
                      <span className="text-xs font-medium text-gray-200">{item.label}</span>
                      <p className="text-[10px] text-gray-500 mt-0.5">{item.desc}</p>
                    </button>
                  ))}
                </div>
                <button
                  onClick={resetDemo}
                  className="mt-4 flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium hover:bg-red-500/20"
                >
                  <RotateCcw size={13} />
                  Reset Demo State
                </button>
              </SettingsSection>
            )}

            {/* Save button */}
            <div data-tour="settings-save" className="flex items-center gap-3 mt-6 pt-4 border-t border-white/[0.04]">
              <button
                onClick={handleSave}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-cyan-500 text-white text-xs font-semibold hover:bg-cyan-400 transition-colors"
              >
                <Save size={14} />
                Save Changes
              </button>
              {saved && <span className="text-xs text-emerald-400">✓ Settings saved (demo)</span>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SettingsSection({ title, children }) {
  return (
    <div>
      <h2 className="text-lg font-semibold text-white mb-4">{title}</h2>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function Field({ label, value, onChange, type = 'text' }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-400 mb-1.5">{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full max-w-md px-3 py-2.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-sm text-gray-200 focus:outline-none focus:border-cyan-500/30"
      />
    </div>
  );
}

function Toggle({ label, value, onChange }) {
  return (
    <div className="flex items-center justify-between max-w-md">
      <span className="text-sm text-gray-300">{label}</span>
      <button
        onClick={() => onChange(!value)}
        className={`relative w-10 h-5 rounded-full transition-colors ${value ? 'bg-cyan-500' : 'bg-gray-700'}`}
      >
        <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${value ? 'translate-x-5' : 'translate-x-0.5'}`} />
      </button>
    </div>
  );
}

function DeviceList({ items }) {
  return (
    <div className="space-y-1.5">
      {items.map(item => (
        <div key={item} className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-white/[0.02] border border-white/[0.04]">
          <span className="text-xs text-gray-300">{item}</span>
          <span className="text-[10px] text-emerald-400 font-medium">Online</span>
        </div>
      ))}
    </div>
  );
}
