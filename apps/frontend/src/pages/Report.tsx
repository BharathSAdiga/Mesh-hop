import { useState, useEffect } from 'react';
import type { Priority, Location } from '@rescuenet/shared';
import { LocationService } from '../services/LocationService';
import { ReportService } from '../services/ReportService';
import type { ReportEventType, DisasterReport, AcknowledgementState } from '../services/ReportService';

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
      desc: 'Building, bridge, or tunnel structural failure or rubble entrapment',
      defaultSeverity: 'CRITICAL',
    },
    {
      type: 'STAMPEDE',
      label: 'Stampede / Crowd Panic',
      icon: '🏃',
      desc: 'Mass crowd crush, surge, or uncontrolled panic bottleneck',
      defaultSeverity: 'HIGH',
    },
    {
      type: 'FIRE',
      label: 'Fire Hazard',
      icon: '🔥',
      desc: 'Structure fire, intense blaze, or smoke inhalation threat',
      defaultSeverity: 'CRITICAL',
    },
    {
      type: 'FLOOD',
      label: 'Flood / Water Ingress',
      icon: '🌊',
      desc: 'Flash flooding, dam breach, or rapidly rising water levels',
      defaultSeverity: 'HIGH',
    },
    {
      type: 'GENERAL_EMERGENCY',
      label: 'General Emergency',
      icon: '⚠️',
      desc: 'Acute medical emergency, landslide, or unspecified disaster',
      defaultSeverity: 'MEDIUM',
    },
  ];

  // Fetch location on mount or when toggle is active
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

      // Simulate progressing acknowledgement to CONFIRMED over 1.5s
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
    <div className="space-y-6 max-w-2xl mx-auto pb-10">
      <div>
        <h2 className="text-2xl font-black text-gray-900 flex items-center gap-2">
          <span>🚨</span> Disaster Incident Report
        </h2>
        <p className="text-xs text-gray-500 mt-1">
          Submit field disaster observations directly to the local mesh network, nearby gateways, and Command Center.
        </p>
      </div>

      {submittedReport ? (
        /* Post-Submission Acknowledgement Card */
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-md space-y-5">
          <div className="flex items-center justify-between border-b pb-3">
            <div className="flex items-center space-x-2">
              <span className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
              <h3 className="font-bold text-gray-900 text-base">Report Dispatched to Mesh</h3>
            </div>
            <span className="text-xs font-mono bg-gray-100 text-gray-700 px-2.5 py-1 rounded font-bold">
              {submittedReport.reportId}
            </span>
          </div>

          {/* Acknowledgement Status Timeline */}
          <div className="space-y-2">
            <span className="text-xs font-bold uppercase text-gray-400 block tracking-wider">
              Acknowledgement State
            </span>
            <div className="grid grid-cols-4 gap-2">
              {[
                { state: 'RECEIVED', label: '1. Received', desc: 'Packed into Mesh Packet' },
                { state: 'PROCESSING', label: '2. Processing', desc: 'Routing via Hop Chain' },
                { state: 'CONFIRMED', label: '3. Confirmed', desc: 'Gateway & Backend Sync' },
                { state: 'RESOLVED', label: '4. Resolved', desc: 'Response Dispatched' },
              ].map((step) => {
                const isCurrent = acknowledgement === step.state;
                const isPassed =
                  (acknowledgement === 'CONFIRMED' && (step.state === 'RECEIVED' || step.state === 'PROCESSING' || step.state === 'CONFIRMED')) ||
                  (acknowledgement === 'PROCESSING' && (step.state === 'RECEIVED' || step.state === 'PROCESSING')) ||
                  (acknowledgement === 'RESOLVED');

                return (
                  <div
                    key={step.state}
                    className={`p-3 rounded-xl border text-center transition font-mono ${
                      isPassed
                        ? 'border-green-300 bg-green-50 text-green-800'
                        : isCurrent
                        ? 'border-blue-400 bg-blue-50 text-blue-800 ring-2 ring-blue-300'
                        : 'border-gray-200 bg-gray-50 text-gray-400'
                    }`}
                  >
                    <div className="font-bold text-xs">{step.label}</div>
                    <div className="text-[10px] mt-0.5 text-gray-500 font-sans">{step.desc}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Report Summary Details */}
          <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 text-xs space-y-2 font-sans">
            <div className="flex justify-between">
              <span className="text-gray-500">Incident Type:</span>
              <strong className="text-gray-900">{submittedReport.eventType}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Severity:</span>
              <span className={`font-bold px-2 py-0.5 rounded text-[11px] ${
                submittedReport.priority === 'CRITICAL' ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'
              }`}>
                {submittedReport.priority}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Location:</span>
              <span className="font-mono text-gray-700">
                {submittedReport.location
                  ? `${submittedReport.location.latitude.toFixed(4)}, ${submittedReport.location.longitude.toFixed(4)}`
                  : 'Coordinates Omitted'}
              </span>
            </div>
            {submittedReport.description && (
              <div className="pt-2 border-t text-gray-700">
                <span className="font-bold block text-gray-500 mb-0.5">Description:</span>
                {submittedReport.description}
              </div>
            )}
          </div>

          {/* Transmission Pipeline Diagram */}
          <div className="bg-gray-900 text-white p-3.5 rounded-xl text-xs font-mono space-y-2">
            <div className="text-cyan-400 font-bold text-[11px]">Active Transmission Pipeline</div>
            <div className="text-gray-300 flex items-center justify-between text-[11px]">
              <span>Report</span> ➔ <span>Packet</span> ➔ <span>Local IDB</span> ➔ <span>Mesh Transport</span> ➔ <span>Gateway</span> ➔ <span>Backend</span>
            </div>
          </div>

          <div className="flex space-x-3 pt-2">
            <button
              onClick={handleResetForm}
              className="flex-1 py-3 bg-gray-900 hover:bg-gray-800 text-white font-bold text-sm rounded-xl transition shadow-sm"
            >
              Submit Another Report
            </button>
          </div>
        </div>
      ) : (
        /* Report Form */
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-6">
          {/* 1. Disaster Event Type Selection */}
          <div className="space-y-3">
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700">
              1. Select Disaster Category <span className="text-red-500">*</span>
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {disasterTypes.map((evt) => {
                const isSelected = selectedEvent === evt.type;
                return (
                  <div
                    key={evt.type}
                    onClick={() => {
                      setSelectedEvent(evt.type);
                      setSeverity(evt.defaultSeverity);
                    }}
                    className={`p-3.5 rounded-xl border-2 cursor-pointer transition flex items-start space-x-3 ${
                      isSelected
                        ? 'border-red-600 bg-red-50/60 shadow-sm ring-2 ring-red-300'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                  >
                    <span className="text-2xl">{evt.icon}</span>
                    <div className="space-y-0.5">
                      <div className="font-bold text-gray-900 text-sm">{evt.label}</div>
                      <div className="text-[11px] text-gray-500 leading-tight">{evt.desc}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 2. Severity Tier */}
          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700">
              2. Hazard Severity Level
            </label>
            <div className="grid grid-cols-4 gap-2">
              {(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as Priority[]).map((lvl) => (
                <button
                  type="button"
                  key={lvl}
                  onClick={() => setSeverity(lvl)}
                  className={`py-2 px-1 text-xs font-bold rounded-lg border transition ${
                    severity === lvl
                      ? lvl === 'CRITICAL'
                        ? 'bg-red-600 text-white border-red-600 shadow-sm'
                        : lvl === 'HIGH'
                        ? 'bg-orange-500 text-white border-orange-500 shadow-sm'
                        : lvl === 'MEDIUM'
                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                        : 'bg-gray-600 text-white border-gray-600 shadow-sm'
                      : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  {lvl}
                </button>
              ))}
            </div>
          </div>

          {/* 3. Description Notes */}
          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700">
              3. Description / Critical Field Observations
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide specific details: number of victims, structural conditions, hazards..."
              className="w-full p-3 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-red-500 focus:outline-none bg-gray-50"
            />
          </div>

          {/* 4. Permission-Based Location */}
          <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-3">
            <div className="flex justify-between items-center">
              <div>
                <span className="text-xs font-bold text-gray-800 block">Include Precise GPS Coordinates</span>
                <span className="text-[11px] text-gray-500">Requires device location permission</span>
              </div>
              <input
                type="checkbox"
                checked={withLocation}
                onChange={(e) => setWithLocation(e.target.checked)}
                className="w-5 h-5 accent-red-600 rounded cursor-pointer"
              />
            </div>

            {withLocation && (
              <div className="text-xs font-mono pt-2 border-t border-gray-200 text-gray-600">
                {isLocating ? (
                  <span className="text-blue-600 animate-pulse">📡 Acquiring GPS fix...</span>
                ) : locationCoords ? (
                  <span className="text-green-700">
                    ✓ GPS Fixed: {locationCoords.latitude.toFixed(4)}, {locationCoords.longitude.toFixed(4)} (±{locationCoords.accuracy?.toFixed(0) || 5}m)
                  </span>
                ) : permissionDenied ? (
                  <span className="text-orange-600">⚠️ Location unavailable or permission denied. Report will send without coordinates.</span>
                ) : null}
              </div>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={!selectedEvent || isSubmitting}
            className={`w-full py-4 rounded-xl font-bold text-base transition shadow-md flex items-center justify-center gap-2 ${
              selectedEvent && !isSubmitting
                ? 'bg-red-600 hover:bg-red-700 text-white'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            {isSubmitting ? 'Dispatching to Mesh Network...' : '🚨 Broadcast Disaster Report'}
          </button>
        </form>
      )}
    </div>
  );
}
