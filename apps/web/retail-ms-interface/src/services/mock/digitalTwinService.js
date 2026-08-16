import eventFeedRaw from '../../../store_events_1hour.jsonl_pretty.txt?raw';

const ZONE_META = {
  entrance: { name: 'Entrance', capacity: 8 },
  mobiles_section: { name: 'Mobiles', capacity: 6 },
  laptops_section: { name: 'Laptops', capacity: 6 },
  accessories_section: { name: 'Accessories', capacity: 6 },
  checkout_1: { name: 'Checkout 1', capacity: 6 },
};

const CAMERA_POSITIONS = {
  cam_01: { x: 6, y: 2 },
  cam_02: { x: 12, y: 2 },
  cam_03: { x: 19, y: 2 },
  cam_04: { x: 20, y: 11 },
};

const SHELVES = [
  { id: 'mobile-01', label: 'Mobile display A', x: 5, y: 3.1, w: 4, h: 0.5, zone: 'mobiles_section', stockStatus: 'unavailable' },
  { id: 'mobile-02', label: 'Mobile display B', x: 5, y: 5.7, w: 4, h: 0.5, zone: 'mobiles_section', stockStatus: 'unavailable' },
  { id: 'laptop-01', label: 'Laptop display A', x: 11, y: 3.1, w: 4, h: 0.7, zone: 'laptops_section', stockStatus: 'unavailable' },
  { id: 'laptop-02', label: 'Laptop display B', x: 11, y: 5.7, w: 4, h: 0.7, zone: 'laptops_section', stockStatus: 'unavailable' },
  { id: 'accessory-01', label: 'Accessory gondola A', x: 17, y: 3.1, w: 5, h: 0.45, zone: 'accessories_section', stockStatus: 'unavailable' },
  { id: 'accessory-02', label: 'Accessory gondola B', x: 17, y: 5.7, w: 5, h: 0.45, zone: 'accessories_section', stockStatus: 'unavailable' },
];

function parseFeed(raw) {
  return raw
    .split(/\r?\n===== END OF MESSAGE \d+ \| .*? =====\r?\n/)
    .map(record => record.trim())
    .filter(Boolean)
    .map(record => JSON.parse(record));
}

const FEED = parseFeed(eventFeedRaw);

export const DIGITAL_TWIN_FEED = {
  frameCount: FEED.length,
  intervalSec: FEED[0]?.interval_sec ?? 5,
  startTime: FEED[0]?.timestamp,
  endTime: FEED.at(-1)?.timestamp,
};

const normaliseTick = tick => ((tick % FEED.length) + FEED.length) % FEED.length;

function mapPerson(person, frameIndex) {
  const firstSeenIndex = Math.max(0, frameIndex - Math.max(0, person.path_trace.length - 1));
  return {
    id: person.track_id,
    reidHash: person.reid_hash,
    x: person.position.x,
    y: person.position.y,
    zone: person.current_zone,
    velocity: person.velocity_mps,
    heading: person.heading_deg,
    confidence: person.position.confidence,
    sourceCamera: person.position.source_camera,
    isStaff: person.is_staff,
    demographics: person.estimated_demographics,
    willPurchase: person.will_purchase_signal,
    pathTrace: person.path_trace,
    visitDuration: (frameIndex - firstSeenIndex + 1) * (FEED[0]?.interval_sec ?? 5),
    zonesVisited: new Set(person.path_trace.map(point => point.cam)).size,
    queueStatus: person.current_zone === 'checkout_1' ? 'In checkout flow' : null,
  };
}

export function getDigitalTwinState(_storeId = 'store_001', tick = 0) {
  const frameIndex = normaliseTick(tick);
  const frame = FEED[frameIndex];
  const checkout = frame.zones.find(zone => zone.zone_id === 'checkout_1');
  const people = frame.tracked_individuals.map(person => mapPerson(person, frameIndex));
  const customers = people.filter(person => !person.isStaff);
  const staff = people.filter(person => person.isStaff);

  const zoneOccupancy = Object.fromEntries(frame.zones.map(zone => {
    const meta = ZONE_META[zone.zone_id] ?? { name: zone.zone_id, capacity: 10 };
    return [zone.zone_id, {
      id: zone.zone_id,
      ...meta,
      type: zone.zone_type,
      currentCount: zone.occupancy,
      utilization: Math.round(zone.heatmap_intensity * 100),
      heatmapIntensity: zone.heatmap_intensity,
      avgDwell: zone.avg_dwell_time_sec,
      attractionCount: zone.attraction_count,
      queueLength: zone.queue_length,
      avgWait: zone.avg_wait_time_sec,
      staffPresent: zone.staff_present,
      alerts: frame.alerts.filter(alert => alert.zone_id === zone.zone_id),
    }];
  }));

  const cameras = frame.cameras.map(camera => ({
    id: camera.camera_id,
    zone: camera.zone_id,
    status: camera.status,
    fps: camera.fps,
    homographyId: camera.homography_matrix_id,
    ...(CAMERA_POSITIONS[camera.camera_id] ?? { x: 12, y: 9 }),
  }));

  return {
    frameIndex,
    frameCount: FEED.length,
    customers,
    staff,
    zoneOccupancy,
    cameras,
    shelves: SHELVES,
    posTerminals: [{
      id: 'checkout-1', x: 20.5, y: 10.8,
      status: checkout?.staff_present ? (checkout.queue_length ? 'busy' : 'idle') : 'offline',
      queueLength: checkout?.queue_length ?? 0,
      avgWait: checkout?.avg_wait_time_sec ?? 0,
    }],
    totalInside: frame.store_metrics.current_occupancy,
    storeMetrics: frame.store_metrics,
    systemHealth: frame.system_health,
    alerts: frame.alerts,
    floorPlan: frame.floor_plan_ref,
    deviceId: frame.device_id,
    storeId: frame.store_id,
    timestamp: frame.timestamp,
  };
}

export function generateLiveEvents(tick = 0) {
  const frameIndex = normaliseTick(tick);
  const frame = FEED[frameIndex];
  const previous = FEED[normaliseTick(frameIndex - 1)];
  const events = [];
  const timestamp = frame.timestamp;

  frame.alerts.forEach((alert, index) => events.push({
    id: `alert-${frameIndex}-${index}`,
    type: 'queue_alert',
    message: `Queue overflow at ${ZONE_META[alert.zone_id]?.name ?? alert.zone_id} · ${alert.severity} severity`,
    timestamp: alert.triggered_at ?? timestamp,
  }));

  if (frame.store_metrics.entries_last_interval > 0) events.push({
    id: `entry-${frameIndex}`,
    type: 'customer_enter',
    message: `${frame.store_metrics.entries_last_interval} customer${frame.store_metrics.entries_last_interval > 1 ? 's' : ''} entered the store`,
    timestamp,
  });
  if (frame.store_metrics.exits_last_interval > 0) events.push({
    id: `exit-${frameIndex}`,
    type: 'customer_exit',
    message: `${frame.store_metrics.exits_last_interval} customer${frame.store_metrics.exits_last_interval > 1 ? 's' : ''} exited the store`,
    timestamp,
  });

  const previousTracks = new Map(previous.tracked_individuals.map(person => [person.track_id, person]));
  frame.tracked_individuals.forEach(person => {
    const before = previousTracks.get(person.track_id);
    if (before && before.current_zone !== person.current_zone) events.push({
      id: `move-${frameIndex}-${person.track_id}`,
      type: 'zone_move',
      message: `${person.track_id} moved to ${ZONE_META[person.current_zone]?.name ?? person.current_zone}`,
      timestamp,
    });
    if (person.will_purchase_signal === true && before?.will_purchase_signal !== true) events.push({
      id: `purchase-${frameIndex}-${person.track_id}`,
      type: 'purchase_signal',
      message: `Purchase intent detected for ${person.track_id} at checkout`,
      timestamp,
    });
  });

  return events.slice(0, 8);
}
