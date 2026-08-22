import { useState, useEffect } from 'react';
import type { Priority, Location } from '@rescuenet/shared';
import { LocationService } from '../services/LocationService';
import { ReportService } from '../services/ReportService';
import type { ReportEventType, DisasterReport, AcknowledgementState } from '../services/ReportService';
import { 
  AlertTriangleIcon, 
  MapPinIcon, 
  ShieldIcon, 
  CheckCircleIcon, 
  ArrowRightIcon, 
  RefreshCwIcon 
} from '../components/Icons';

export function Report() {
  const [selectedEvent, setSelectedEvent] = useState<ReportEventType | null>('STRUCTURAL_COLLAPSE');
  const [description, setDescription] = useState<string>('');
  const [severity, setSeverity] = useState<Priority>('CRITICAL');
  const [withLocation, setWithLocation] = useState<boolean>(true);
  const [locationCoords, setLocationCoords] = useState<Location | null>(null);
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [permissionDenied, setPermissionDenied] = useState<boolean>(false);

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submittedReport, setSubmittedReport] = useState<DisasterReport | null>(null);
  const [acknowledgement, setAcknowledgement] = useState<AcknowledgementState>('RECEIVED');

  const disasterTypes: { type: ReportEventType; label: string; icon: string; desc: string; defaultSeverity: Priority }[] = [
    {
      type: 'STRUCTURAL_COLLAPSE',
      label: 'Structural Collapse',
      icon: '🏢',
      desc: 'Building, bridge, or rubble failure with entrapment hazard',
      defaultSeverity: 'CRITICAL',
    },
    {
      type: 'STAMPEDE',
      label: 'Stampede / Crowd Surge',
      icon: '🏃',
      desc: 'Mass crowd crush, panic rush, or dangerous bottleneck',
      defaultSeverity: 'HIGH',
    },
    {
      type: 'FIRE',
      label: 'Fire Hazard',
      icon: '🔥',
      desc: 'Active blaze, toxic smoke, or explosion hazard',
      defaultSeverity: 'CRITICAL',
    },
    {
      type: 'FLOOD',
      label: 'Flood / Water Surge',
      icon: '🌊',
      desc: 'Flash flooding, water ingress, or trapped vehicles',
      defaultSeverity: 'HIGH',
    },
    {
      type: 'GENERAL_EMERGENCY',
      label: 'General Emergency',
      icon: '⚠️',
      desc: 'Severe casualty triage or unspecified catastrophe',
      defaultSeverity: 'MEDIUM',
    },
  ];

  useEffect(() => {
    if (withLocation) {
      requestLocation();
    } else {
      setLocationCoords(null);
    }
  }, [withLocation]);

  const requestLocation = async () => {
    setIsLocating(true);
    const loc = await LocationService.getCurrentLocation();
    setIsLocating(false);
    if (loc) {
      setLocationCoords(loc);
      setPermissionDenied(false);
    } else {
      setPermissionDenied(true);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEvent) return;

    setIsSubmitting(true);
    setAcknowledgement('RECEIVED');

    try {
      const report = await ReportService.submitReport({
        eventType: selectedEvent,
        description,
        withLocation,
        severity,
        customLocation: locationCoords,
      });

      setSubmittedReport(report);
      setAcknowledgement(report.acknowledgementState);

      setTimeout(() => {
        setAcknowledgement('PROCESSING');
        ReportService.updateAcknowledgement(report.reportId, 'PROCESSING');
      }, 700);

      setTimeout(() => {
        setAcknowledgement('CONFIRMED');
        ReportService.updateAcknowledgement(report.reportId, 'CONFIRMED');
      }, 1600);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetForm = () => {
    setSubmittedReport(null);
    setDescription('');
    setSelectedEvent('STRUCTURAL_COLLAPSE');
  };

  return (
    <div className="space-y-4 max-w-2xl mx-auto pb-8">
      {/* Header */}
      <div>
        <div className="flex items-center space-x-2">
          <span className="p-1.5 rounded-lg bg-orange-950/80 border border-orange-800/80 text-orange-400">
            <AlertTriangleIcon size={18} />
          </span>
          <h1 className="text-xl font-black text-white tracking-tight">Disaster Incident Report</h1>
        </div>
        <p className="text-xs text-slate-400 mt-1">
          Broadcast tactical observations directly across local peer devices, field gateways, and Command Center.
        </p>
      </div>

      {submittedReport ? (
        /* Post-Submission Acknowledgement Card */
        <div className="bg-slate-900/90 p-5 rounded-2xl border border-slate-800 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <h2 className="font-bold text-white text-sm">Dispatched to Mesh Transport</h2>
            </div>
            <span className="text-xs font-mono bg-slate-950 text-cyan-400 border border-slate-800 px-2 py-0.5 rounded font-bold">
              {submittedReport.reportId}
            </span>
          </div>

          {/* Acknowledgement State Timeline */}
          <div className="space-y-2">
            <span className="text-[10px] font-bold font-mono uppercase text-slate-400 block tracking-wider">
              Acknowledgement State Machine
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              {[
                { state: 'RECEIVED', label: '1. Received', desc: 'Packed into Mesh Packet' },
                { state: 'PROCESSING', label: '2. Routing', desc: 'Multi-Hop Relay Chain' },
                { state: 'CONFIRMED', label: '3. Confirmed', desc: 'Gateway & Backend Sync' },
                { state: 'RESOLVED', label: '4. Resolved', desc: 'Response Units Dispatched' },
              ].map((step) => {
                const isCurrent = acknowledgement === step.state;
                const isPassed =
                  (acknowledgement === 'CONFIRMED' && (step.state === 'RECEIVED' || step.state === 'PROCESSING' || step.state === 'CONFIRMED')) ||
                  (acknowledgement === 'PROCESSING' && (step.state === 'RECEIVED' || step.state === 'PROCESSING')) ||
                  (acknowledgement === 'RESOLVED');

                return (
                  <div
                    key={step.state}
                    className={`p-2.5 rounded-xl border transition ${
                      isCurrent
                        ? 'border-emerald-500 bg-emerald-950/40 text-emerald-300 ring-1 ring-emerald-500/40 font-bold'
                        : isPassed
                        ? 'border-slate-800 bg-slate-950/60 text-slate-300'
                        : 'border-slate-900 bg-slate-950/30 text-slate-600'
                    }`}
                  >
                    <div className="flex items-center space-x-1">
                      {isPassed && <CheckCircleIcon size={12} className="text-emerald-400 shrink-0" />}
                      <span className="text-[11px] font-mono">{step.label}</span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">{step.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs font-mono space-y-1.5 text-slate-400">
            <div className="flex justify-between">
              <span>Event:</span>
              <span className="text-white font-bold">{submittedReport.eventType}</span>
            </div>
            <div className="flex justify-between">
              <span>Severity:</span>
              <span className="text-red-400 font-bold">{submittedReport.priority}</span>
            </div>
            <div className="flex justify-between">
              <span>Location:</span>
              <span className="text-slate-200">
                {submittedReport.location
                  ? `${submittedReport.location.latitude.toFixed(3)}, ${submittedReport.location.longitude.toFixed(3)}`
                  : 'Omitted (Permission Optional)'}
              </span>
            </div>
          </div>

          <button
            onClick={handleResetForm}
            className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl border border-slate-700 transition flex items-center justify-center space-x-2 text-xs"
          >
            <RefreshCwIcon size={14} />
            <span>Submit Another Incident Report</span>
          </button>
        </div>
      ) : (
        /* The Report Submission Form */
        <form onSubmit={handleSubmit} className="bg-slate-900/90 p-5 rounded-2xl border border-slate-800 shadow-xl space-y-4">
          {/* Disaster Category Selection */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-200 block uppercase font-mono tracking-wider">
              1. Select Disaster Category
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {disasterTypes.map((dt) => {
                const isSelected = selectedEvent === dt.type;
                return (
                  <button
                    type="button"
                    key={dt.type}
                    onClick={() => {
                      setSelectedEvent(dt.type);
                      setSeverity(dt.defaultSeverity);
                    }}
                    className={`p-3 rounded-xl border text-left transition flex items-start space-x-2.5 ${
                      isSelected
                        ? 'border-orange-500 bg-orange-950/40 text-white ring-1 ring-orange-500/40'
                        : 'border-slate-800 bg-slate-950/60 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                    }`}
                  >
                    <span className="text-2xl shrink-0">{dt.icon}</span>
                    <div>
                      <h3 className="text-xs font-bold text-white">{dt.label}</h3>
                      <p className="text-[10px] text-slate-400 mt-0.5 leading-tight">{dt.desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Severity Selector */}
          <div className="space-y-2 pt-2 border-t border-slate-800">
            <label className="text-xs font-bold text-slate-200 block uppercase font-mono tracking-wider">
              2. Hazard Severity Tier
            </label>
            <div className="grid grid-cols-4 gap-2">
              {(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as Priority[]).map((p) => {
                const isSelected = severity === p;
                return (
                  <button
                    type="button"
                    key={p}
                    onClick={() => setSeverity(p)}
                    className={`py-2 rounded-xl text-[11px] font-mono font-bold uppercase border transition ${
                      isSelected
                        ? p === 'CRITICAL'
                          ? 'bg-red-950 border-red-500 text-red-300 ring-1 ring-red-500/40'
                          : p === 'HIGH'
                          ? 'bg-orange-950 border-orange-500 text-orange-300 ring-1 ring-orange-500/40'
                          : p === 'MEDIUM'
                          ? 'bg-yellow-950 border-yellow-500 text-yellow-300 ring-1 ring-yellow-500/40'
                          : 'bg-blue-950 border-blue-500 text-blue-300 ring-1 ring-blue-500/40'
                        : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {p}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Field Description */}
          <div className="space-y-2 pt-2 border-t border-slate-800">
            <label className="text-xs font-bold text-slate-200 block uppercase font-mono tracking-wider">
              3. Field Notes / Details (Optional)
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. 2nd floor stairwell collapsed, 4 people trapped near north exit..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-orange-500"
            />
          </div>

          {/* Location Permission Toggle */}
          <div className="space-y-2 pt-2 border-t border-slate-800">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-200 flex items-center space-x-1.5">
                <MapPinIcon size={14} className="text-cyan-400" />
                <span>4. Attach Approximate Location</span>
              </label>
              <span className="text-[10px] font-mono text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                OPTIONAL
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setWithLocation(true)}
                className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center space-x-1.5 transition ${
                  withLocation
                    ? 'bg-emerald-950/80 border-emerald-500/80 text-emerald-300 ring-1 ring-emerald-500/40'
                    : 'bg-slate-950 border-slate-800 text-slate-400'
                }`}
              >
                <MapPinIcon size={13} />
                <span>Attach GPS</span>
              </button>

              <button
                type="button"
                onClick={() => setWithLocation(false)}
                className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center space-x-1.5 transition ${
                  !withLocation
                    ? 'bg-slate-800 border-slate-500 text-white ring-1 ring-slate-500/40'
                    : 'bg-slate-950 border-slate-800 text-slate-400'
                }`}
              >
                <ShieldIcon size={13} />
                <span>Omit Coordinates</span>
              </button>
            </div>

            {withLocation && (
              <div className="text-[11px] font-mono text-slate-400 pt-1">
                {isLocating ? (
                  <span className="text-cyan-400 animate-pulse">Acquiring GPS fix...</span>
                ) : locationCoords ? (
                  <span className="text-emerald-400">✓ GPS Acquired: {locationCoords.latitude.toFixed(3)}, {locationCoords.longitude.toFixed(3)}</span>
                ) : permissionDenied ? (
                  <span className="text-amber-400">⚠️ GPS unavailable / denied. Will transmit without coordinates.</span>
                ) : null}
              </div>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3.5 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 text-white font-extrabold rounded-xl shadow-lg shadow-orange-950/50 transition flex items-center justify-center space-x-2 text-xs uppercase tracking-wider"
          >
            {isSubmitting ? (
              <RefreshCwIcon size={16} className="animate-spin" />
            ) : (
              <>
                <AlertTriangleIcon size={16} />
                <span>Broadcast Incident Report</span>
                <ArrowRightIcon size={14} />
              </>
            )}
          </button>
        </form>
      )}
    </div>
  );
}
