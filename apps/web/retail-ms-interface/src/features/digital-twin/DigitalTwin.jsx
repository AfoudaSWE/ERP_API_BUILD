import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useAppStore } from '../../store/appStore';
import { getDigitalTwinState } from '../../services/mock/digitalTwinService';
import {
  createRetailTrackingClient,
  getRetailTrackingStoreId,
  RETAIL_TRACKING_WS_URL,
} from '../../services/retailTrackingService';
import PageHeader from '../../components/common/PageHeader.jsx';
import ThreeStoreScene from './ThreeStoreScene.jsx';
import { CAMERA_PRESETS, DEFAULT_LAYERS, STORE_ZONES } from './storeSceneConfig';
import { formatDuration } from '../../constants';
import {
  Play, Pause, RotateCcw, ZoomIn, ZoomOut, Thermometer, Radio, Package,
  MapPin, X, LogIn, LogOut, CreditCard, AlertTriangle, ChevronRight,
  Box, MousePointer2, Orbit, Users, Maximize2,
  Sun, Moon, SlidersHorizontal, Eye, Focus, Layers3, Camera, Footprints,
  UserRound, UserCog, Activity, Boxes, ShieldAlert, Zap,
} from 'lucide-react';

const ICON_MAP = {
  customer_enter: LogIn,
  customer_exit: LogOut,
  zone_move: MapPin,
  queue_alert: AlertTriangle,
  purchase_signal: CreditCard,
};

const LAYER_META = {
  customers: { label: 'Customers', icon: UserRound },
  staff: { label: 'Staff', icon: UserCog },
  shelves: { label: 'Shelves', icon: Package },
  stock: { label: 'Stock status', icon: Boxes },
  heatmap: { label: 'Heat map', icon: Thermometer },
  paths: { label: 'Paths', icon: Footprints },
  queues: { label: 'Queues', icon: Users },
  cameras: { label: 'Cameras', icon: Camera },
  sensors: { label: 'Camera coverage', icon: Radio },
  alerts: { label: 'Alerts', icon: ShieldAlert },
};

export default function DigitalTwin() {
  const storeId = useAppStore(store => store.selectedStoreId);
  const trackingStoreId = getRetailTrackingStoreId(storeId);
  const simulationPaused = useAppStore(store => store.simulationPaused);
  const toggleSimulation = useAppStore(store => store.toggleSimulation);
  const sceneContainerRef = useRef(null);
  const pausedRef = useRef(simulationPaused);
  const tracksByCameraRef = useRef(new Map());
  const pathsByTrackRef = useRef(new Map());
  const firstSeenByTrackRef = useRef(new Map());
  const tracksFrameRef = useRef();
  const [state, setState] = useState(() => createInitialLiveState(storeId));
  const [events, setEvents] = useState([]);
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const [connectionError, setConnectionError] = useState('');
  const [socketTelemetry, setSocketTelemetry] = useState({
    messageCount: 0,
    lastType: 'none',
    lastAt: null,
    sourceStoreId: null,
  });
  const [selectedObject, setSelectedObject] = useState(null);
  const [hoveredObject, setHoveredObject] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [layers, setLayers] = useState(DEFAULT_LAYERS);
  const [layersOpen, setLayersOpen] = useState(false);
  const [quality, setQuality] = useState('auto');
  const [lighting, setLighting] = useState('day');
  const [projection, setProjection] = useState('perspective');
  const [cameraCommand, setCameraCommand] = useState({ preset: 'overview', nonce: 0 });

  useEffect(() => {
    pausedRef.current = simulationPaused;
  }, [simulationPaused]);

  useEffect(() => {
    tracksByCameraRef.current = new Map();
    pathsByTrackRef.current = new Map();
    firstSeenByTrackRef.current = new Map();
    window.cancelAnimationFrame(tracksFrameRef.current);
    setState(createInitialLiveState(storeId));
    setEvents([]);
    setConnectionError('');
    setSocketTelemetry({ messageCount: 0, lastType: 'none', lastAt: null, sourceStoreId: null });

    const disconnect = createRetailTrackingClient({
      storeId: trackingStoreId,
      onStatus: status => {
        setConnectionStatus(status);
        if (status === 'connected') setConnectionError('');
      },
      onError: setConnectionError,
      onMessage: message => {
        setSocketTelemetry(current => ({
          messageCount: current.messageCount + 1,
          lastType: message.type,
          lastAt: message.timestamp ?? new Date().toISOString(),
          sourceStoreId: message.storeId ?? current.sourceStoreId,
        }));
        if (message.type === 'subscribed') {
          setConnectionStatus('live');
          setConnectionError('');
          return;
        }
        if (message.type === 'error') {
          setConnectionError(message.message);
          return;
        }

        if (message.type === 'occupancy.updated') {
          setState(current => applyOccupancyUpdate(current, message));
        } else if (message.type === 'tracks.updated') {
          tracksByCameraRef.current.set(message.cameraId, message.tracks);
          window.cancelAnimationFrame(tracksFrameRef.current);
          tracksFrameRef.current = window.requestAnimationFrame(() => {
            setState(current => applyTracksUpdate(
              current,
              tracksByCameraRef.current,
              pathsByTrackRef.current,
              firstSeenByTrackRef.current,
              message.timestamp,
            ));
          });
        } else if (message.type === 'camera.status') {
          setState(current => applyCameraStatus(current, message));
        }

        const activity = createTrackingEvent(message);
        if (activity) {
          setEvents(previous => (
            previous.some(event => event.id === activity.id)
              ? previous
              : [activity, ...previous].slice(0, 30)
          ));
        }
      },
    });
    return () => {
      window.cancelAnimationFrame(tracksFrameRef.current);
      disconnect();
    };
  }, [storeId, trackingStoreId]);

  const handleReset = useCallback(() => {
    tracksByCameraRef.current = new Map();
    pathsByTrackRef.current = new Map();
    firstSeenByTrackRef.current = new Map();
    setState(createInitialLiveState(storeId));
    setSelectedObject(null);
    setZoom(1);
    setEvents([]);
    setCameraCommand(current => ({ preset: 'overview', nonce: current.nonce + 1 }));
  }, [storeId]);
  const handleObjectSelect = useCallback(object => setSelectedObject(object), []);
  const handleObjectHover = useCallback(object => setHoveredObject(object), []);
  const toggleLayer = useCallback(name => setLayers(current => ({ ...current, [name]: !current[name] })), []);
  const selectPreset = useCallback(preset => {
    setCameraCommand(current => ({ preset, nonce: current.nonce + 1 }));
    if (preset === 'heatmap') setLayers(current => ({ ...current, heatmap: true }));
  }, []);
  const enterFullscreen = useCallback(() => sceneContainerRef.current?.requestFullscreen?.(), []);

  const selectedData = useMemo(() => resolveSelectedData(selectedObject, state), [selectedObject, state]);

  if (!state) return (
    <div className="grid h-[calc(100dvh-6rem)] place-items-center" role="status">
      <p className="text-sm text-[var(--muted-foreground)]">Loading store digital twin…</p>
    </div>
  );
  const trackedPeople = state.customers.length + state.staff.length;
  const onlineCameras = state.cameras.filter(cameraItem => cameraItem.status === 'online').length;
  const offlineCameras = state.cameras.filter(cameraItem => cameraItem.status === 'offline').length;
  const checkoutWaits = state.posTerminals.map(terminal => terminal.avgWait).filter(Number.isFinite);
  const averageWait = checkoutWaits.length
    ? checkoutWaits.reduce((total, wait) => total + wait, 0) / checkoutWaits.length
    : null;
  const liveStayDurations = state.customers.map(customer => customer.visitDuration).filter(Number.isFinite);
  const averageStay = liveStayDurations.length
    ? liveStayDurations.reduce((total, duration) => total + duration, 0) / liveStayDurations.length
    : null;
  const isLive = connectionStatus === 'live';
  const electricityKw = getCurrentElectricityKw(state, storeId);
  const hasLiveElectricityTelemetry = Number.isFinite(state.storeMetrics.energy_current_kw);

  return (
    <div className="flex h-[calc(100dvh-5rem)] flex-col overflow-y-auto lg:h-[calc(100dvh-6.5rem)] xl:overflow-hidden">
      <div className="shrink-0">
        <PageHeader title="Live Digital Twin" subtitle="Real-time 3D operations, traffic and edge-camera intelligence" />
      </div>

      <div data-tour="twin-controls" className="mb-3 flex shrink-0 flex-wrap items-center gap-2">
        <ControlButton onClick={toggleSimulation} active={!simulationPaused} label={simulationPaused ? 'Resume live updates' : 'Pause live updates'}>
          {simulationPaused ? <Play size={13} /> : <Pause size={13} />}
          {simulationPaused ? 'Resume' : 'Pause live'}
        </ControlButton>
        <ControlButton onClick={handleReset} label="Clear live tracks and reset camera"><RotateCcw size={13} /> Reset</ControlButton>
        <div className="ui-button overflow-hidden p-0" aria-label="Scene zoom controls">
          <button onClick={() => setZoom(value => Math.max(0.65, value - 0.1))} className="p-2 hover:text-orange-500" aria-label="Zoom out"><ZoomOut size={13} /></button>
          <span className="min-w-10 text-center text-[11px] text-[var(--muted-foreground)]">{Math.round(zoom * 100)}%</span>
          <button onClick={() => setZoom(value => Math.min(1.65, value + 0.1))} className="p-2 hover:text-orange-500" aria-label="Zoom in"><ZoomIn size={13} /></button>
        </div>
        <SelectControl value={cameraCommand.preset} onChange={selectPreset} label="Camera preset" icon={Eye}>
          {Object.entries(CAMERA_PRESETS).map(([id, preset]) => <option key={id} value={id}>{preset.label}</option>)}
        </SelectControl>
        <SelectControl value={projection} onChange={setProjection} label="View projection" icon={Orbit}>
          <option value="perspective">Perspective</option>
          <option value="isometric">Isometric</option>
          <option value="top">Top-down</option>
        </SelectControl>
        <div className="relative">
          <ControlButton onClick={() => setLayersOpen(value => !value)} active={layersOpen} label="Open scene layer menu">
            <Layers3 size={13} /> Layers
          </ControlButton>
          {layersOpen && (
            <div className="absolute left-0 top-9 z-30 grid w-56 grid-cols-1 gap-1 rounded-xl border border-[var(--border)] bg-[var(--card)] p-2 shadow-2xl" role="group" aria-label="Scene layers">
              {Object.entries(LAYER_META).map(([name, meta]) => (
                <LayerToggle key={name} active={layers[name]} onClick={() => toggleLayer(name)} icon={meta.icon} label={meta.label} />
              ))}
            </div>
          )}
        </div>
        <SelectControl value={quality} onChange={setQuality} label="Graphics quality" icon={SlidersHorizontal}>
          <option value="auto">Quality: Auto</option>
          <option value="low">Quality: Low</option>
          <option value="medium">Quality: Medium</option>
          <option value="high">Quality: High</option>
        </SelectControl>
        <ControlButton onClick={() => setLighting(value => value === 'day' ? 'night' : 'day')} label={`Switch to ${lighting === 'day' ? 'night' : 'day'} lighting`}>
          {lighting === 'day' ? <Sun size={13} /> : <Moon size={13} />} {lighting === 'day' ? 'Day' : 'Night'}
        </ControlButton>
        <button onClick={enterFullscreen} className="ui-button ml-auto p-2" aria-label="View scene full screen"><Maximize2 size={14} /></button>
      </div>

      <div data-tour="twin-health" className="mb-3 grid shrink-0 grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-5">
        <FeedMetric icon={Users} label="Inside now" value={state.totalInside} detail="Current store occupancy" />
        <FeedMetric
          icon={Zap}
          label="Electricity"
          value={`${electricityKw.toFixed(1)} kW`}
          detail={hasLiveElectricityTelemetry ? 'Live branch demand' : 'Estimated from live occupancy'}
        />
        <FeedMetric
          icon={Footprints}
          label="Avg stay time"
          value={averageStay == null ? '—' : formatDuration(averageStay)}
          detail={liveStayDurations.length ? `${liveStayDurations.length} live WebSocket track${liveStayDurations.length === 1 ? '' : 's'}` : 'Waiting for person tracks'}
        />
        <CombinedFeedMetric
          icon={Activity}
          label="Customer flow"
          values={[
            { label: 'Avg wait', value: averageWait == null ? '—' : formatDuration(averageWait) },
            { label: 'Entries', value: state.storeMetrics.entries_last_interval },
            { label: 'Exits', value: state.storeMetrics.exits_last_interval },
          ]}
        />
        <CombinedFeedMetric
          icon={Camera}
          label="Camera health"
          alert={offlineCameras > 0}
          values={[
            { label: 'Online', value: onlineCameras, tone: 'text-emerald-500' },
            { label: 'Offline', value: offlineCameras, tone: offlineCameras > 0 ? 'text-red-500' : 'text-[var(--foreground)]' },
          ]}
        />
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1fr)_310px]">
        <section ref={sceneContainerRef} data-tour="twin-scene" className="glass relative min-h-[480px] overflow-hidden rounded-xl border-[var(--border)] bg-slate-950 xl:min-h-0">
          <div className="pointer-events-none absolute left-3 top-3 z-10 flex items-center gap-2 rounded-lg border border-white/10 bg-slate-950/75 px-3 py-2 backdrop-blur-md">
            <span className="relative flex h-2 w-2">
              {isLive && !simulationPaused && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-70" />}
              <span className={`relative inline-flex h-2 w-2 rounded-full ${simulationPaused ? 'bg-zinc-500' : isLive ? 'bg-emerald-400' : 'bg-amber-400'}`} />
            </span>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white">Live spatial operations</p>
              <p className="text-[9px] text-slate-400">{formatTimestamp(state.timestamp)} · {simulationPaused ? 'View paused' : connectionLabel(connectionStatus)}</p>
            </div>
          </div>
          <div className="pointer-events-none absolute right-3 top-3 z-10 rounded-lg border border-white/10 bg-slate-950/75 px-3 py-2 text-right backdrop-blur-md">
            <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-cyan-300">{state.floorPlan.map_id}</p>
            <p className="mt-0.5 text-[9px] text-slate-400">{trackedPeople} tracks · {state.floorPlan.width_m} × {state.floorPlan.height_m} m</p>
          </div>

          <ThreeStoreScene
            state={state}
            selectedObject={selectedObject}
            onSelectObject={handleObjectSelect}
            onHoverObject={handleObjectHover}
            layers={layers}
            zoom={zoom}
            paused={simulationPaused}
            quality={quality}
            lighting={lighting}
            projection={projection}
            cameraCommand={cameraCommand}
          />

          {hoveredObject && (
            <div className="pointer-events-none fixed z-50 max-w-52 rounded-md border border-white/10 bg-slate-950/90 px-2.5 py-1.5 text-[10px] text-white shadow-xl" style={{ left: hoveredObject.x + 12, top: hoveredObject.y + 12 }}>
              <p className="font-semibold">{hoveredObject.label}</p>
              <p className="mt-0.5 text-slate-400">{humanize(hoveredObject.type)} · {hoveredObject.id}</p>
            </div>
          )}

          <div className="pointer-events-none absolute bottom-16 left-3 z-10 hidden items-center gap-3 rounded-lg border border-white/10 bg-slate-950/70 px-3 py-2 text-[9px] text-slate-300 backdrop-blur-md md:flex">
            <span className="flex items-center gap-1.5"><Orbit size={11} className="text-cyan-300" /> Drag orbit</span>
            <span className="flex items-center gap-1.5"><MousePointer2 size={11} className="text-cyan-300" /> Click inspect</span>
            <span className="flex items-center gap-1.5"><Focus size={11} className="text-cyan-300" /> Double-click focus</span>
          </div>

          <SceneLegend layers={layers} />

          <div data-tour="twin-replay" className="absolute inset-x-3 bottom-3 z-10 rounded-lg border border-white/10 bg-slate-950/80 px-3 py-2 backdrop-blur-md sm:left-auto sm:w-[360px]">
            <div className="flex items-center gap-2 text-[9px]">
              <Radio size={11} className={isLive ? 'text-emerald-400' : 'text-amber-400'} />
              <span className="font-medium text-slate-200">{connectionLabel(connectionStatus)}</span>
              <span className="ml-auto truncate text-slate-400" title={`${RETAIL_TRACKING_WS_URL} · ${trackingStoreId}`}>{trackingStoreId}</span>
            </div>
            <p className="mt-1 truncate text-[9px] text-slate-400">
              Received {socketTelemetry.messageCount} · Last: <span className="text-cyan-300">{socketTelemetry.lastType}</span>
              {socketTelemetry.sourceStoreId ? ` · ${socketTelemetry.sourceStoreId}` : ''}
              {socketTelemetry.lastAt ? ` · ${formatTimestamp(socketTelemetry.lastAt)}` : ''}
            </p>
            {connectionError && <p className="mt-1 truncate text-[9px] text-red-300" title={connectionError}>{connectionError}</p>}
          </div>
        </section>

        <aside className="flex min-h-0 flex-col gap-3">
          {selectedData ? (
            <ObjectDetailsPanel selection={selectedData} onClose={() => setSelectedObject(null)} onFocus={() => focusSelection(selectedObject, selectPreset)} />
          ) : (
            <div data-tour="twin-inspector" className="glass rounded-xl p-4">
              <div className="mb-2 flex items-center gap-2"><Box size={15} className="text-cyan-500" /><h3 className="text-sm font-semibold text-[var(--foreground)]">Scene inspector</h3></div>
              <p className="text-xs leading-relaxed text-[var(--muted-foreground)]">Select a zone, shelf, checkout, person, camera, fitting room, service desk, or alert. Double-click any object to focus the camera.</p>
            </div>
          )}
          <div data-tour="twin-activity" className="glass flex min-h-[240px] flex-1 flex-col overflow-hidden rounded-xl xl:min-h-0">
            <div className="flex items-center gap-2 border-b border-[var(--border)] px-4 py-3">
              <Activity size={13} className="text-emerald-500" />
              <h3 className="text-sm font-semibold text-[var(--foreground)]">Live activity</h3>
              <span className={`ml-auto rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider ${isLive ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'}`}>{connectionLabel(connectionStatus)}</span>
            </div>
            <div className="no-scrollbar min-h-0 flex-1 space-y-1 overflow-y-auto p-2.5">
              {events.length === 0 && <p className="px-2 py-8 text-center text-[11px] text-[var(--muted-foreground)]">Waiting for a movement or store event…</p>}
              {events.map(event => {
                const EventIcon = ICON_MAP[event.type] || ChevronRight;
                return (
                  <div key={event.id} className="flex items-start gap-2.5 rounded-lg p-2.5 hover:bg-[var(--muted)]">
                    <div className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-md bg-orange-500/10"><EventIcon size={11} className="text-orange-500" /></div>
                    <div className="min-w-0 flex-1"><p className="text-[11px] leading-relaxed text-[var(--foreground)]">{event.message}</p><p className="mt-0.5 text-[9px] text-[var(--muted-foreground)]">{new Date(event.timestamp).toLocaleTimeString('en-EG')}</p></div>
                  </div>
                );
              })}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function createInitialLiveState(storeId) {
  const baseline = getDigitalTwinState(storeId, 0);
  const zoneOccupancy = Object.fromEntries(
    Object.entries(baseline.zoneOccupancy).map(([id, zone]) => [id, {
      ...zone,
      currentCount: 0,
      utilization: 0,
      heatmapIntensity: 0,
      attractionCount: 0,
      queueLength: 0,
      avgWait: 0,
      staffPresent: null,
      alerts: [],
    }]),
  );

  return {
    ...baseline,
    customers: [],
    staff: [],
    zoneOccupancy,
    cameras: baseline.cameras.map(cameraItem => ({ ...cameraItem, status: 'unknown', fps: 0 })),
    totalInside: 0,
    storeMetrics: {
      ...baseline.storeMetrics,
      current_occupancy: 0,
      entries_last_interval: 0,
      exits_last_interval: 0,
    },
    alerts: [],
    storeId,
    timestamp: null,
  };
}

function applyOccupancyUpdate(state, message) {
  return {
    ...state,
    totalInside: message.currentOccupancy,
    storeMetrics: {
      ...state.storeMetrics,
      current_occupancy: message.currentOccupancy,
      entries_last_interval: message.entered,
      exits_last_interval: message.exited,
    },
    timestamp: message.timestamp,
  };
}

function applyTracksUpdate(state, tracksByCamera, pathsByTrack, firstSeenByTrack, timestamp) {
  const visibleTracks = new Map();
  tracksByCamera.forEach((tracks, cameraId) => {
    tracks.forEach(track => visibleTracks.set(track.trackId, { ...track, cameraId }));
  });

  const frameTime = Number.isNaN(Date.parse(timestamp)) ? Date.now() : Date.parse(timestamp);
  const visibleTrackIds = new Set(visibleTracks.keys());
  firstSeenByTrack.forEach((_value, trackId) => {
    if (!visibleTrackIds.has(trackId)) firstSeenByTrack.delete(trackId);
  });

  const customers = [...visibleTracks.values()].map(track => {
    if (!firstSeenByTrack.has(track.trackId)) firstSeenByTrack.set(track.trackId, frameTime);
    const position = toFloorPosition(track, state.floorPlan);
    const previousPath = pathsByTrack.get(track.trackId) ?? [];
    const lastPoint = previousPath.at(-1);
    const nextPoint = { x: position.x, y: position.y };
    const positionChanged = !lastPoint || lastPoint.x !== position.x || lastPoint.y !== position.y;
    const pathTrace = positionChanged ? [...previousPath, nextPoint].slice(-30) : previousPath;
    pathsByTrack.set(track.trackId, pathTrace);

    const before = pathTrace.at(-2);
    const heading = before
      ? Math.atan2(position.y - before.y, position.x - before.x) * (180 / Math.PI)
      : 0;

    return {
      id: track.trackId,
      reidHash: `track-${track.trackId}`,
      x: position.x,
      y: position.y,
      zone: findTrackZone(position.x, position.y),
      velocity: before ? Math.hypot(position.x - before.x, position.y - before.y) : 0,
      heading,
      confidence: track.confidence,
      sourceCamera: track.cameraId,
      isStaff: false,
      demographics: null,
      willPurchase: null,
      pathTrace,
      visitDuration: Math.max(0, (frameTime - firstSeenByTrack.get(track.trackId)) / 1000),
      zonesVisited: 0,
      queueStatus: null,
    };
  });

  const zoneCounts = Object.fromEntries(STORE_ZONES.map(zone => [zone.id, 0]));
  customers.forEach(person => {
    if (person.zone in zoneCounts) zoneCounts[person.zone] += 1;
  });
  const zoneOccupancy = Object.fromEntries(
    Object.entries(state.zoneOccupancy).map(([id, zone]) => {
      const currentCount = zoneCounts[id] ?? 0;
      return [id, {
        ...zone,
        currentCount,
        utilization: Math.round((currentCount / Math.max(zone.capacity, 1)) * 100),
        heatmapIntensity: Math.min(1, currentCount / Math.max(zone.capacity, 1)),
        queueLength: id === 'checkout_1' ? currentCount : zone.queueLength,
      }];
    }),
  );

  const reportingCameraIds = new Set([...tracksByCamera.keys()]);
  const cameras = state.cameras.map(cameraItem => (
    reportingCameraIds.has(cameraItem.id) ? { ...cameraItem, status: 'online' } : cameraItem
  ));
  reportingCameraIds.forEach(cameraId => {
    if (!cameras.some(cameraItem => cameraItem.id === cameraId)) {
      cameras.push({ id: cameraId, zone: 'unknown', status: 'online', fps: 0, homographyId: 'not-provided', x: 12, y: 9 });
    }
  });

  return { ...state, customers, staff: [], zoneOccupancy, cameras, timestamp };
}

function toFloorPosition(track, floorPlan) {
  const normalized = track.x >= 0 && track.x <= 1 && track.y >= 0 && track.y <= 1;
  if (!normalized) return { x: track.x, y: track.y };
  return {
    x: track.x * floorPlan.width_m,
    y: track.y * floorPlan.height_m,
  };
}

function applyCameraStatus(state, message) {
  const cameras = state.cameras.map(cameraItem => (
    cameraItem.id === message.cameraId ? { ...cameraItem, status: message.status } : cameraItem
  ));
  if (!cameras.some(cameraItem => cameraItem.id === message.cameraId)) {
    cameras.push({
      id: message.cameraId,
      zone: 'unknown',
      status: message.status,
      fps: 0,
      homographyId: 'not-provided',
      x: 12,
      y: 9,
    });
  }
  return { ...state, cameras, timestamp: message.timestamp };
}

function findTrackZone(x, y) {
  return STORE_ZONES.find(zone => (
    x >= zone.x && x <= zone.x + zone.w && y >= zone.y && y <= zone.y + zone.h
  ))?.id ?? 'unknown';
}

function createTrackingEvent(message) {
  if (message.type === 'crossing.detected') {
    const entering = message.direction === 'ENTER';
    return {
      id: message.eventId,
      type: entering ? 'customer_enter' : 'customer_exit',
      message: `Track ${message.trackId} ${entering ? 'entered' : 'exited'} via ${message.cameraId}`,
      timestamp: message.timestamp,
    };
  }
  if (message.type === 'occupancy.updated' && (message.entered > 0 || message.exited > 0)) {
    return {
      id: `occupancy-${message.cameraId}-${message.timestamp}`,
      type: message.entered > 0 ? 'customer_enter' : 'customer_exit',
      message: `Occupancy is now ${message.currentOccupancy} (+${message.entered} in · ${message.exited} out)`,
      timestamp: message.timestamp,
    };
  }
  if (message.type === 'camera.status') {
    return {
      id: `camera-${message.cameraId}-${message.timestamp}`,
      type: 'camera_status',
      message: `Camera ${message.cameraId} is ${message.status}`,
      timestamp: message.timestamp,
    };
  }
  return null;
}

function connectionLabel(status) {
  if (status === 'live') return 'Live';
  if (status === 'connected') return 'Subscribing';
  if (status === 'disconnected') return 'Disconnected';
  return 'Connecting';
}

function formatTimestamp(timestamp) {
  if (!timestamp) return 'Waiting for data';
  const date = new Date(timestamp);
  return Number.isNaN(date.getTime()) ? 'Waiting for data' : date.toLocaleTimeString('en-EG');
}

function getCurrentElectricityKw(state, storeId) {
  const liveReading = Number(state.storeMetrics.energy_current_kw);
  if (Number.isFinite(liveReading)) return Math.max(0, liveReading);

  const branchOffset = [...String(storeId)].reduce((total, character) => total + character.charCodeAt(0), 0) % 8;
  const hour = state.timestamp ? new Date(state.timestamp).getHours() : new Date().getHours();
  const tradingHoursLoad = hour >= 9 && hour < 23 ? 8 : 2;
  return 28 + branchOffset + tradingHoursLoad + (state.totalInside * 0.18);
}

function resolveSelectedData(selection, state) {
  if (!selection || !state) return null;
  if (selection.type === 'zone') return { type: 'zone', data: state.zoneOccupancy[selection.id], label: selection.label, id: selection.id };
  if (selection.type === 'customer' || selection.type === 'staff') {
    const person = [...state.customers, ...state.staff].find(item => item.id === selection.id);
    return person ? { type: selection.type, data: person, label: selection.label, id: selection.id } : null;
  }
  if (selection.type === 'camera') {
    const cameraItem = state.cameras.find(item => item.id === selection.id);
    return cameraItem ? { type: 'camera', data: cameraItem, label: selection.label, id: selection.id } : null;
  }
  if (selection.type === 'checkout') {
    const terminal = state.posTerminals.find(item => item.id === selection.id);
    return { type: 'checkout', data: terminal ?? selection, label: selection.label, id: selection.id };
  }
  return { type: selection.type, data: selection, label: selection.label, id: selection.id };
}

function focusSelection(selection, selectPreset) {
  if (!selection) return;
  if (selection.type === 'zone') {
    const mapping = { entrance: 'entrance', checkout_1: 'checkout', mobiles_section: 'shelves', laptops_section: 'shelves', accessories_section: 'shelves' };
    selectPreset(mapping[selection.id] ?? 'overview');
    return;
  }
  if (selection.type === 'fitting-room') selectPreset('fitting');
  else if (selection.type === 'restricted') selectPreset('stockroom');
  else if (selection.type === 'checkout') selectPreset('checkout');
  else selectPreset('overview');
}

function ControlButton({ children, onClick, active = false, label }) {
  return <button onClick={onClick} aria-label={label} className={`ui-button twin-control whitespace-nowrap font-medium ${active ? 'border-cyan-500/30 text-cyan-500' : ''}`}>{children}</button>;
}

function SelectControl({ value, onChange, label, icon: Icon, children }) {
  return (
    <label className="ui-button twin-control gap-1.5 text-[var(--muted-foreground)]">
      <Icon size={12} aria-hidden="true" />
      <span className="sr-only">{label}</span>
      <select value={value} onChange={event => onChange(event.target.value)} className="h-full max-w-28 bg-transparent text-[11px] text-[var(--foreground)] outline-none" aria-label={label}>{children}</select>
    </label>
  );
}

function LayerToggle({ active, onClick, icon: Icon, label }) {
  return (
    <button onClick={onClick} aria-pressed={active} className={`flex items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[11px] font-medium transition-colors ${active ? 'bg-cyan-500/10 text-cyan-600' : 'text-[var(--muted-foreground)] hover:bg-[var(--muted)]'}`}>
      <Icon size={12} /><span className="flex-1">{label}</span><span className={`h-2 w-2 rounded-full ${active ? 'bg-cyan-500' : 'bg-zinc-400'}`} />
    </button>
  );
}

function SceneLegend({ layers }) {
  return (
    <div className="pointer-events-none absolute bottom-16 right-3 z-10 hidden rounded-lg border border-white/10 bg-slate-950/75 px-3 py-2 backdrop-blur-md lg:block" aria-label="Scene legend">
      <p className="mb-1.5 text-[8px] font-semibold uppercase tracking-[0.16em] text-slate-400">Status legend</p>
      <div className="flex gap-3 text-[9px] text-slate-200">
        <LegendDot color="bg-emerald-400" label="Healthy / intent" />
        <LegendDot color="bg-amber-400" label="Queue / warning" />
        <LegendDot color="bg-red-500" label="Alert / offline" />
        <LegendDot color="bg-slate-400" label="No source data" />
        {layers.heatmap && <span>Heat: green → red</span>}
      </div>
    </div>
  );
}

function LegendDot({ color, label }) {
  return <span className="flex items-center gap-1"><span className={`h-1.5 w-1.5 rounded-full ${color}`} />{label}</span>;
}

function FeedMetric({ icon: Icon, label, value, detail, alert = false }) {
  return (
    <div className={`glass rounded-xl border px-3.5 py-2.5 ${alert ? 'border-amber-500/35 bg-amber-500/5' : 'border-[var(--border)]'}`}>
      <div className="flex items-center gap-2"><div className={`grid h-6 w-6 place-items-center rounded-lg ${alert ? 'bg-amber-500/15 text-amber-500' : 'bg-cyan-500/10 text-cyan-600'}`}><Icon size={13} /></div><p className="text-[9px] font-medium uppercase tracking-wider text-[var(--muted-foreground)]">{label}</p></div>
      <div className="mt-1 flex items-baseline gap-2"><p className="text-base font-semibold text-[var(--foreground)]">{value}</p><p className="truncate text-[9px] text-[var(--muted-foreground)]">{detail}</p></div>
    </div>
  );
}

function CombinedFeedMetric({ icon: Icon, label, values, alert = false }) {
  return (
    <div className={`glass rounded-xl border px-3.5 py-2.5 ${alert ? 'border-amber-500/35 bg-amber-500/5' : 'border-[var(--border)]'}`}>
      <div className="flex items-center gap-2">
        <div className={`grid h-6 w-6 place-items-center rounded-lg ${alert ? 'bg-amber-500/15 text-amber-500' : 'bg-cyan-500/10 text-cyan-600'}`}><Icon size={13} /></div>
        <p className="text-[9px] font-medium uppercase tracking-wider text-[var(--muted-foreground)]">{label}</p>
      </div>
      <div className="mt-2 grid grid-flow-col auto-cols-fr divide-x divide-[var(--border)]">
        {values.map(item => (
          <div key={item.label} className="min-w-0 px-2 first:pl-0 last:pr-0">
            <p className={`truncate text-base font-semibold ${item.tone || 'text-[var(--foreground)]'}`}>{item.value}</p>
            <p className="truncate text-[8px] uppercase tracking-wider text-[var(--muted-foreground)]">{item.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function ObjectDetailsPanel({ selection, onClose, onFocus }) {
  const { type, data, label, id } = selection;
  return (
    <div data-tour="twin-inspector" className="glass rounded-xl p-4">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="min-w-0"><p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-cyan-600">{humanize(type)}</p><h3 className="mt-0.5 truncate text-sm font-semibold text-[var(--foreground)]">{label ?? id}</h3><p className="mt-0.5 truncate text-[9px] text-[var(--muted-foreground)]">Business ID · {id}</p></div>
        <div className="flex gap-1">
          <button onClick={onFocus} className="grid h-7 w-7 place-items-center rounded-md text-[var(--muted-foreground)] hover:bg-[var(--muted)]" aria-label="Focus camera on selection"><Focus size={13} /></button>
          <button onClick={onClose} className="grid h-7 w-7 place-items-center rounded-md text-[var(--muted-foreground)] hover:bg-[var(--muted)]" aria-label="Close inspector"><X size={14} /></button>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {type === 'zone' && <ZoneDetails zone={data} />}
        {(type === 'customer' || type === 'staff') && <PersonDetails person={data} />}
        {type === 'camera' && <CameraDetails camera={data} />}
        {type === 'checkout' && <CheckoutDetails terminal={data} />}
        {type === 'shelf' && <><MiniStat label="Department" value={humanize(data.zone ?? 'unknown')} /><MiniStat label="Stock level" value={statusLabel(data.stockStatus)} accent /></>}
        {type === 'fitting-room' && <><MiniStat label="Occupancy" value="Not provided" /><MiniStat label="Indicator" value="No backend field" /></>}
        {!['zone', 'customer', 'staff', 'camera', 'checkout', 'shelf', 'fitting-room'].includes(type) && <><MiniStat label="Object type" value={humanize(type)} /><MiniStat label="Live metrics" value="Not provided" /></>}
      </div>
      {['shelf', 'fitting-room'].includes(type) && <p className="mt-2 rounded-lg border border-slate-500/20 bg-slate-500/5 px-2.5 py-2 text-[9px] leading-relaxed text-[var(--muted-foreground)]">This fixture is mapped with a stable ID. Its operational status is shown as unavailable because the current replay contract does not include this field.</p>}
    </div>
  );
}

function ZoneDetails({ zone }) {
  return <><MiniStat label="Occupancy" value={`${zone.currentCount}/${zone.capacity}`} /><MiniStat label="Utilization" value={`${zone.utilization}%`} accent /><MiniStat label="Attractions" value={zone.attractionCount} /><MiniStat label="Avg dwell" value={formatDuration(zone.avgDwell)} />{zone.queueLength != null && <MiniStat label="Queue" value={zone.queueLength} />}{zone.avgWait != null && <MiniStat label="Avg wait" value={formatDuration(zone.avgWait)} />}<MiniStat label="Staff present" value={zone.staffPresent == null ? 'Not tracked' : zone.staffPresent ? 'Yes' : 'No'} /><MiniStat label="Zone type" value={humanize(zone.type)} />{zone.alerts.length > 0 && <p className="col-span-2 rounded-lg border border-red-500/20 bg-red-500/10 px-2.5 py-2 text-[10px] text-red-500">{zone.alerts.length} active alert{zone.alerts.length > 1 ? 's' : ''}</p>}</>;
}

function PersonDetails({ person }) {
  return <><MiniStat label="Current zone" value={humanize(person.zone)} accent /><MiniStat label="Velocity" value={`${person.velocity.toFixed(2)} m/s`} /><MiniStat label="Heading" value={`${person.heading.toFixed(1)}°`} /><MiniStat label="Source camera" value={person.sourceCamera} /><MiniStat label="Confidence" value={`${Math.round(person.confidence * 100)}%`} /><MiniStat label="Path points" value={person.pathTrace.length} /><MiniStat label="Visit duration" value={formatDuration(person.visitDuration)} /><MiniStat label="Purchase signal" value={person.willPurchase == null ? 'Pending' : person.willPurchase ? 'Detected' : 'Not detected'} /><p className="col-span-2 rounded-lg border border-emerald-500/15 bg-emerald-500/5 px-2.5 py-2 text-[9px] text-emerald-600">{person.isStaff ? 'Staff track' : 'Anonymous customer session'} · re-identification hash only</p></>;
}

function CameraDetails({ camera }) {
  return <><MiniStat label="Status" value={humanize(camera.status)} accent={camera.status === 'online'} /><MiniStat label="Frame rate" value={`${camera.fps.toFixed(1)} FPS`} /><MiniStat label="Zone" value={humanize(camera.zone)} /><MiniStat label="Calibration" value={camera.homographyId} /></>;
}

function CheckoutDetails({ terminal }) {
  return <><MiniStat label="Status" value={humanize(terminal?.status ?? 'unknown')} /><MiniStat label="Queue length" value={terminal?.queueLength ?? '—'} accent /><MiniStat label="Average wait" value={terminal?.avgWait == null ? '—' : formatDuration(terminal.avgWait)} /></>;
}

function MiniStat({ label, value, accent = false }) {
  return <div className="min-w-0 rounded-lg bg-[var(--muted)] px-2.5 py-2"><p className="text-[8px] uppercase tracking-wider text-[var(--muted-foreground)]">{label}</p><p className={`mt-1 truncate text-[11px] font-semibold ${accent ? 'text-cyan-600' : 'text-[var(--foreground)]'}`} title={String(value)}>{value}</p></div>;
}

function humanize(value) {
  return String(value ?? 'unknown').replaceAll('_', ' ').replaceAll('-', ' ').replace(/\b\w/g, letter => letter.toUpperCase());
}

function statusLabel(status) {
  return status === 'unavailable' || !status ? 'Not provided' : humanize(status);
}
