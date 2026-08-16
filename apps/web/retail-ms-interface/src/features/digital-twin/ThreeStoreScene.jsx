import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { CAMERA_PRESETS, STATUS_COLORS, STORE_ZONES, resolveQuality } from './storeSceneConfig';

export { STORE_ZONES } from './storeSceneConfig';

const toWorld = (x, y, floorPlan = { width_m: 24, height_m: 18 }) => ({
  x: x - floorPlan.width_m / 2,
  z: y - floorPlan.height_m / 2,
});

function material(color, options = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: options.roughness ?? 0.55,
    metalness: options.metalness ?? 0.08,
    opacity: options.opacity ?? 1,
    transparent: options.transparent ?? false,
    emissive: options.emissive ?? 0x000000,
    emissiveIntensity: options.emissiveIntensity ?? 0,
    side: options.side ?? THREE.FrontSide,
  });
}

function box(w, h, d, color, options = {}) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material(color, options));
  mesh.castShadow = options.castShadow ?? true;
  mesh.receiveShadow = options.receiveShadow ?? true;
  return mesh;
}

function cylinder(radius, height, color, options = {}) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, height, options.segments ?? 16), material(color, options));
  mesh.castShadow = options.castShadow ?? true;
  mesh.receiveShadow = options.receiveShadow ?? true;
  return mesh;
}

function tagObject(object, type, id, label, data = {}) {
  const userData = { type, id, label, ...data };
  object.userData = userData;
  object.traverse(child => { child.userData = userData; });
  return object;
}

function makeLabel(text, accent = '#f97316', width = 3.2, dark = true) {
  const canvas = document.createElement('canvas');
  canvas.width = 768;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = dark ? 'rgba(9,12,20,.9)' : 'rgba(255,255,255,.92)';
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') ctx.roundRect(5, 5, 758, 118, 22);
  else ctx.rect(5, 5, 758, 118);
  ctx.fill();
  ctx.strokeStyle = accent;
  ctx.lineWidth = 4;
  ctx.stroke();
  ctx.font = '600 36px Inter, Arial';
  ctx.fillStyle = dark ? '#f8fafc' : '#0f172a';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 384, 66);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false }));
  sprite.scale.set(width, width / 6, 1);
  return sprite;
}

function addFixture(parent, mesh, position, meta) {
  mesh.position.set(...position);
  tagObject(mesh, meta.type ?? 'fixture', meta.id, meta.label, meta);
  parent.add(mesh);
  return mesh;
}

function buildStoreShell(parent) {
  const floor = box(24.4, 0.24, 18.4, 0xd7d9de, { roughness: 0.72, metalness: 0.03, castShadow: false });
  floor.position.y = -0.16;
  parent.add(floor);

  const aisle = box(20.8, 0.018, 2.25, 0xf4f1ea, { roughness: 0.9, castShadow: false });
  aisle.position.set(1.4, -0.025, -0.2);
  parent.add(aisle);
  const accessiblePath = box(2.1, 0.022, 7.4, 0xdbeafe, { roughness: 0.86, castShadow: false });
  accessiblePath.position.set(-9.7, -0.018, 2.3);
  parent.add(accessiblePath);

  const wallMat = { roughness: 0.75, metalness: 0.02 };
  const backWall = box(24.4, 3.8, 0.18, 0xe7e5e4, wallMat);
  backWall.position.set(0, 1.9, -9.1);
  parent.add(backWall);
  [-12.1, 12.1].forEach(x => {
    const side = box(0.18, 3.8, 18.2, 0xe2e8f0, wallMat);
    side.position.set(x, 1.9, 0);
    parent.add(side);
  });

  [-7.2, 0, 7.2].forEach(x => {
    const beam = box(0.18, 0.18, 17.8, 0x64748b, { metalness: 0.65, roughness: 0.25 });
    beam.position.set(x, 3.55, 0);
    parent.add(beam);
  });
  [-6, -2, 2, 6].forEach(z => {
    const rail = box(23.5, 0.06, 0.08, 0x475569, { metalness: 0.75, roughness: 0.2, castShadow: false });
    rail.position.set(0, 3.35, z);
    parent.add(rail);
    [-8, -3, 2, 7].forEach(x => {
      const lamp = cylinder(0.12, 0.12, 0xfff7d6, { emissive: 0xffe8a3, emissiveIntensity: 2, castShadow: false });
      lamp.rotation.z = Math.PI / 2;
      lamp.position.set(x, 3.22, z);
      parent.add(lamp);
    });
  });

  const glass = { transparent: true, opacity: 0.24, metalness: 0.08, roughness: 0.06 };
  [-11.2, -8.3].forEach(x => {
    const door = box(1.35, 2.7, 0.08, 0x7dd3fc, glass);
    door.position.set(x, 1.35, 9.03);
    parent.add(door);
  });
  const header = box(5, 0.65, 0.24, 0x111827, { metalness: 0.4, roughness: 0.3 });
  header.position.set(-9.7, 3, 8.98);
  parent.add(header);
  const brand = makeLabel('NOVA  /  LIVE STORE', '#38bdf8', 4.4);
  brand.position.set(-9.7, 3, 8.82);
  parent.add(brand);

  [-3.5, 3.5, 10.5].forEach((x, index) => {
    const column = box(0.38, 3.4, 0.38, index === 1 ? 0x0f766e : 0x334155, { roughness: 0.42, metalness: 0.28 });
    column.position.set(x, 1.7, -0.25);
    parent.add(column);
  });

  const exit = makeLabel('EMERGENCY EXIT  →', '#22c55e', 2.8);
  exit.position.set(9.5, 2.8, -8.94);
  parent.add(exit);
}

function buildRetailFixtures(parent) {
  const tableTops = [
    { id: 'mobile-table-a', x: -5, z: -5.8, color: 0x8b5cf6, label: 'Mobile display A' },
    { id: 'mobile-table-b', x: -5, z: -3.2, color: 0x8b5cf6, label: 'Mobile display B' },
    { id: 'laptop-table-a', x: 1, z: -5.8, color: 0x06b6d4, label: 'Laptop display A' },
    { id: 'laptop-table-b', x: 1, z: -3.2, color: 0x06b6d4, label: 'Laptop display B' },
  ];
  tableTops.forEach(item => {
    const group = new THREE.Group();
    const top = box(4, 0.14, 0.85, 0xf8fafc, { roughness: 0.28, metalness: 0.08 });
    top.position.y = 0.86;
    const leg = box(0.32, 0.82, 0.55, 0x475569, { metalness: 0.58, roughness: 0.26 });
    leg.position.y = 0.41;
    group.add(top, leg);
    for (let i = -1; i <= 1; i += 1) {
      const device = box(0.52, 0.06, 0.32, item.color, { emissive: item.color, emissiveIntensity: 0.16, metalness: 0.35, roughness: 0.24 });
      device.position.set(i * 1.05, 0.97, 0);
      group.add(device);
    }
    addFixture(parent, group, [item.x, 0, item.z], { type: 'shelf', ...item, stockStatus: 'unavailable' });
  });

  [-6.7, -4.9, -3.1].forEach((x, index) => {
    const pedestal = cylinder(0.45, 0.75, 0xf8fafc, { roughness: 0.3 });
    const product = box(0.32, 0.52, 0.12, [0x7c3aed, 0xec4899, 0x0ea5e9][index], { emissive: [0x7c3aed, 0xec4899, 0x0ea5e9][index], emissiveIntensity: 0.15 });
    product.position.y = 0.64;
    const group = new THREE.Group();
    group.add(pedestal, product);
    pedestal.position.y = 0.38;
    addFixture(parent, group, [x, 0, -7.8], { type: 'display', id: `hero-mobile-${index + 1}`, label: `Featured mobile ${index + 1}` });
  });

  [-7.5, -5.2, -2.9, 0.3, 2.6, 4.9, 7.2, 9.5].forEach((x, index) => {
    const wallPanel = box(1.7, 1.75, 0.16, index < 3 ? 0x312e81 : index < 6 ? 0x164e63 : 0x831843, { roughness: 0.5, emissive: index < 3 ? 0x8b5cf6 : index < 6 ? 0x06b6d4 : 0xec4899, emissiveIntensity: 0.08 });
    addFixture(parent, wallPanel, [x, 1.65, -8.94], { type: 'display', id: `wall-display-${index + 1}`, label: 'Wall product display' });
  });

  [5.7, 8.2].forEach((x, row) => [-5.7, -3.2].forEach((z, col) => {
    const group = new THREE.Group();
    const frame = box(1.9, 1.45, 0.52, 0x334155, { metalness: 0.46, roughness: 0.32 });
    frame.position.y = 0.72;
    group.add(frame);
    [0.28, 0.7, 1.12].forEach((y, level) => {
      const productBar = box(1.65, 0.1, 0.62, [0xf472b6, 0x22d3ee, 0xfbbf24][level], { roughness: 0.45, emissive: [0xf472b6, 0x22d3ee, 0xfbbf24][level], emissiveIntensity: 0.06 });
      productBar.position.y = y;
      group.add(productBar);
    });
    addFixture(parent, group, [x, 0, z], { type: 'shelf', id: `accessory-gondola-${row + 1}-${col + 1}`, label: 'Accessory gondola', stockStatus: 'unavailable' });
  }));

  const promo = new THREE.Group();
  const promoStand = cylinder(0.75, 0.18, 0xf59e0b, { emissive: 0xf59e0b, emissiveIntensity: 0.18 });
  promoStand.position.y = 0.1;
  const promoPanel = box(1.3, 2.1, 0.12, 0x111827, { metalness: 0.3, roughness: 0.35 });
  promoPanel.position.y = 1.25;
  const sale = makeLabel('NEW TECH  /  20%', '#f59e0b', 1.7);
  sale.position.set(0, 1.35, 0.08);
  promo.add(promoStand, promoPanel, sale);
  addFixture(parent, promo, [-1.3, 0, 0.35], { type: 'display', id: 'promo-stand-main', label: 'New technology promotion' });
}

function buildCheckoutAndBackOffice(parent) {
  [2.3, 5.2, 8.1].forEach((x, index) => {
    const group = new THREE.Group();
    const counter = box(2.15, 0.9, 1, 0x1e293b, { metalness: 0.35, roughness: 0.34 });
    counter.position.y = 0.45;
    const front = box(1.85, 0.5, 0.05, index === 0 ? 0xf59e0b : 0x0f766e, { emissive: index === 0 ? 0xf59e0b : 0x14b8a6, emissiveIntensity: 0.14 });
    front.position.set(0, 0.48, 0.53);
    const screen = box(0.55, 0.42, 0.08, 0x38bdf8, { emissive: 0x38bdf8, emissiveIntensity: 1.1, roughness: 0.12 });
    screen.position.set(0.5, 1.12, -0.05);
    screen.rotation.x = -0.18;
    group.add(counter, front, screen);
    addFixture(parent, group, [x, 0, 2.2], { type: 'checkout', id: index === 0 ? 'checkout-1' : `checkout-demo-${index + 1}`, label: `POS counter ${index + 1}` });
  });

  [-0.2, 0.75].forEach(z => [1.3, 3.8, 6.6, 9.2].forEach((x, index) => {
    const post = cylinder(0.045, 0.8, 0x94a3b8, { metalness: 0.8, roughness: 0.18 });
    post.position.set(x, 0.4, z + 3);
    parent.add(post);
    if (index < 3) {
      const belt = box(2.5, 0.05, 0.05, 0xf59e0b, { emissive: 0xf59e0b, emissiveIntensity: 0.1, castShadow: false });
      belt.position.set(x + 1.25, 0.7, z + 3);
      parent.add(belt);
    }
  }));

  const service = new THREE.Group();
  const desk = box(2.8, 0.86, 0.86, 0x0f766e, { roughness: 0.36, metalness: 0.25 });
  desk.position.y = 0.43;
  const serviceSign = makeLabel('CUSTOMER CARE', '#2dd4bf', 2.3);
  serviceSign.position.set(0, 1.35, 0);
  service.add(desk, serviceSign);
  addFixture(parent, service, [-5.1, 0, 5.9], { type: 'service', id: 'customer-service', label: 'Customer service desk' });

  const fittingWall = box(0.16, 2.7, 4.2, 0xcbd5e1, { roughness: 0.78 });
  fittingWall.position.set(11.2, 1.35, -5.9);
  parent.add(fittingWall);
  [-7.3, -5.8, -4.3].forEach((z, index) => {
    const door = box(0.08, 2.1, 1.15, 0x7c3aed, { roughness: 0.52 });
    addFixture(parent, door, [11.08, 1.05, z], { type: 'fitting-room', id: `fitting-room-${index + 1}`, label: `Fitting room ${index + 1}`, status: 'unavailable' });
    const indicator = cylinder(0.07, 0.05, STATUS_COLORS.unknown, { emissive: STATUS_COLORS.unknown, emissiveIntensity: 0.8 });
    indicator.rotation.z = Math.PI / 2;
    indicator.position.set(10.99, 2.35, z);
    parent.add(indicator);
  });
  const bench = box(2.2, 0.36, 0.55, 0xb45309, { roughness: 0.65, metalness: 0.04 });
  addFixture(parent, bench, [9.4, 0.28, -6], { type: 'fixture', id: 'fitting-bench', label: 'Fitting room bench' });

  const stockWall = box(5.5, 2.7, 0.16, 0x64748b, { roughness: 0.66 });
  stockWall.position.set(9.25, 1.35, -8);
  parent.add(stockWall);
  const stockSign = makeLabel('STAFF ONLY  /  STOCK', '#ef4444', 2.4);
  stockSign.position.set(8.8, 2.35, -7.88);
  parent.add(stockSign);
  [7.3, 8.8, 10.3].forEach((x, index) => {
    const rack = box(1.15, 1.7, 0.55, 0x475569, { metalness: 0.55, roughness: 0.36 });
    addFixture(parent, rack, [x, 0.85, -8.55], { type: 'restricted', id: `stock-rack-${index + 1}`, label: 'Back-office stock rack' });
  });

  [-10.8, -9.9].forEach((x, index) => {
    const pot = cylinder(0.24, 0.35, 0x92400e, { roughness: 0.8 });
    pot.position.set(x, 0.18, 7.4);
    const leaves = new THREE.Mesh(new THREE.SphereGeometry(0.42, 10, 8), material(index ? 0x16a34a : 0x15803d, { roughness: 0.9 }));
    leaves.scale.set(0.7, 1.35, 0.7);
    leaves.position.set(x, 0.75, 7.4);
    parent.add(pot, leaves);
  });
}

function addPerson(parent, person, selected, animated, floorPlan) {
  const position = toWorld(person.x, person.y, floorPlan);
  const group = new THREE.Group();
  const isQueued = person.zone === 'checkout_1';
  const color = person.isStaff ? 0xf97316 : person.willPurchase ? 0x22c55e : isQueued ? 0xfbbf24 : 0xe2e8f0;
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.15, 0.4, 4, 8), material(color, { roughness: 0.42, emissive: color, emissiveIntensity: 0.1 }));
  body.position.y = 0.48;
  body.castShadow = true;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 8), material(0xd6a77a, { roughness: 0.72 }));
  head.position.y = 0.9;
  const direction = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.24, 8), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.85 }));
  direction.rotation.x = Math.PI / 2;
  direction.position.set(0, 0.12, -0.31);
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.24, selected ? 0.34 : 0.29, 28), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: selected ? 1 : 0.4, side: THREE.DoubleSide }));
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.02;
  group.add(body, head, direction, ring);
  group.position.set(position.x, 0.04, position.z);
  group.rotation.y = THREE.MathUtils.degToRad(person.heading ?? 0);
  tagObject(group, person.isStaff ? 'staff' : 'customer', person.id, person.isStaff ? `Staff ${person.id}` : `Customer ${person.id}`);
  parent.add(group);
  animated.push({ kind: 'person', object: group, phase: (person.x + person.y) * 0.2, ring });
}

function addDynamicScene(parent, state, options, animated) {
  const { layers, selectedObject } = options;
  const floorPlan = state.floorPlan;
  STORE_ZONES.forEach(zone => {
    const center = toWorld(zone.x + zone.w / 2, zone.y + zone.h / 2, floorPlan);
    const occupancy = state.zoneOccupancy[zone.id];
    const selected = selectedObject?.type === 'zone' && selectedObject.id === zone.id;
    const intensity = occupancy?.heatmapIntensity ?? 0;
    const zoneColor = layers.heatmap
      ? new THREE.Color().setHSL(0.33 - Math.min(intensity, 1) * 0.33, 0.9, 0.5)
      : new THREE.Color(zone.accent);
    const plate = box(zone.w - 0.18, 0.055, zone.h - 0.18, zoneColor, {
      transparent: true,
      opacity: layers.heatmap ? 0.14 + intensity * 0.54 : selected ? 0.34 : 0.075,
      emissive: zoneColor,
      emissiveIntensity: selected ? 0.42 : layers.heatmap ? intensity * 0.24 : 0.03,
      castShadow: false,
    });
    plate.position.set(center.x, 0.006, center.z);
    tagObject(plate, 'zone', zone.id, zone.label);
    parent.add(plate);
    const label = makeLabel(`${zone.label.toUpperCase()}  ·  ${occupancy?.currentCount ?? 0}/${occupancy?.capacity ?? '—'}`, `#${zoneColor.getHexString()}`);
    label.position.set(center.x, 1.2, center.z - zone.h * 0.32);
    parent.add(label);
  });

  if (layers.shelves) state.shelves.forEach(shelf => {
    const center = toWorld(shelf.x + shelf.w / 2, shelf.y + shelf.h / 2, floorPlan);
    const selected = selectedObject?.type === 'shelf' && selectedObject.id === shelf.id;
    const fixture = box(shelf.w, 0.12, shelf.h, selected ? 0xffffff : 0x94a3b8, { roughness: 0.34, metalness: 0.38, emissive: selected ? 0xf59e0b : 0x000000, emissiveIntensity: selected ? 0.55 : 0 });
    fixture.position.set(center.x, 1.02, center.z);
    tagObject(fixture, 'shelf', shelf.id, shelf.label ?? shelf.id, { zone: shelf.zone, stockStatus: shelf.stockStatus ?? 'unavailable' });
    parent.add(fixture);
    if (layers.stock) {
      const indicatorColor = shelf.stockStatus === 'low' ? STATUS_COLORS.warning : shelf.stockStatus === 'empty' ? STATUS_COLORS.critical : shelf.stockStatus === 'healthy' ? STATUS_COLORS.healthy : STATUS_COLORS.unknown;
      const indicator = cylinder(0.07, shelf.w * 0.78, indicatorColor, { emissive: indicatorColor, emissiveIntensity: 0.75, castShadow: false });
      indicator.rotation.z = Math.PI / 2;
      indicator.position.set(center.x, 1.13, center.z + shelf.h * 0.54);
      tagObject(indicator, 'shelf', shelf.id, shelf.label ?? shelf.id, { zone: shelf.zone, stockStatus: shelf.stockStatus ?? 'unavailable' });
      parent.add(indicator);
    }
  });

  state.posTerminals.forEach(pos => {
    const world = toWorld(pos.x, pos.y, floorPlan);
    const color = pos.status === 'busy' ? STATUS_COLORS.warning : pos.status === 'offline' ? STATUS_COLORS.critical : STATUS_COLORS.healthy;
    const beacon = cylinder(0.1, 0.1, color, { emissive: color, emissiveIntensity: 1.3, castShadow: false });
    beacon.position.set(world.x, 1.52, world.z);
    tagObject(beacon, 'checkout', pos.id, `Checkout · queue ${pos.queueLength}`, pos);
    parent.add(beacon);
    if (pos.status !== 'idle') animated.push({ kind: 'pulse', object: beacon, phase: 0 });
    const label = makeLabel(`CHECKOUT  ·  Q${pos.queueLength}  ·  ${Math.round(pos.avgWait)}s`, '#f59e0b', 2.7);
    label.position.set(world.x, 1.85, world.z);
    parent.add(label);
  });

  if (layers.queues) {
    const count = state.zoneOccupancy.checkout_1?.queueLength ?? 0;
    for (let index = 0; index < count; index += 1) {
      const marker = cylinder(0.19, 0.025, STATUS_COLORS.warning, { emissive: STATUS_COLORS.warning, emissiveIntensity: 0.45, transparent: true, opacity: 0.75, castShadow: false });
      marker.position.set(7.7 - (index % 4) * 0.65, 0.025, 4.2 + Math.floor(index / 4) * 0.7);
      parent.add(marker);
    }
  }

  if (layers.cameras) state.cameras.forEach(cameraData => {
    const world = toWorld(cameraData.x, cameraData.y, floorPlan);
    const cameraGroup = new THREE.Group();
    const mast = box(0.08, 1.6, 0.08, 0x475569, { metalness: 0.78, roughness: 0.22 });
    mast.position.y = 0.8;
    const color = cameraData.status === 'online'
      ? STATUS_COLORS.healthy
      : cameraData.status === 'offline'
        ? STATUS_COLORS.critical
        : STATUS_COLORS.unknown;
    const housing = box(0.42, 0.25, 0.3, 0xe2e8f0, { metalness: 0.45, roughness: 0.28 });
    housing.position.y = 1.67;
    const lens = cylinder(0.07, 0.08, color, { emissive: color, emissiveIntensity: 1.15, castShadow: false });
    lens.rotation.x = Math.PI / 2;
    lens.position.set(0, 1.67, 0.18);
    cameraGroup.add(mast, housing, lens);
    if (layers.sensors) {
      const cone = new THREE.Mesh(new THREE.ConeGeometry(1.45, 3.5, 24, 1, true), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.045, side: THREE.DoubleSide, depthWrite: false }));
      cone.rotation.x = Math.PI;
      cone.position.y = -0.15;
      cameraGroup.add(cone);
    }
    cameraGroup.position.set(world.x, 0, world.z);
    tagObject(cameraGroup, 'camera', cameraData.id, `Camera ${cameraData.id}`, cameraData);
    parent.add(cameraGroup);
  });

  if (layers.paths) [...state.customers, ...state.staff].forEach(person => {
    if (person.pathTrace.length < 2) return;
    const points = person.pathTrace.map(point => {
      const world = toWorld(point.x, point.y, floorPlan);
      return new THREE.Vector3(world.x, 0.09, world.z);
    });
    const color = person.isStaff ? 0xf97316 : person.willPurchase ? 0x22c55e : 0xe2e8f0;
    const trail = new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.6 }));
    parent.add(trail);
  });

  if (layers.alerts) state.alerts.forEach((alert, index) => {
    const zone = STORE_ZONES.find(item => item.id === alert.zone_id);
    if (!zone) return;
    const center = toWorld(zone.x + zone.w / 2, zone.y + zone.h / 2, floorPlan);
    const marker = new THREE.Mesh(new THREE.OctahedronGeometry(0.24), material(STATUS_COLORS.critical, { emissive: STATUS_COLORS.critical, emissiveIntensity: 1.1 }));
    marker.position.set(center.x + index * 0.5, 2.15, center.z);
    tagObject(marker, 'alert', `${alert.zone_id}-${index}`, `${alert.severity ?? 'Active'} alert`, alert);
    parent.add(marker);
    animated.push({ kind: 'alert', object: marker, phase: index });
  });

  state.customers.filter(() => layers.customers).forEach(person => addPerson(parent, person, selectedObject?.id === person.id, animated, floorPlan));
  state.staff.filter(() => layers.staff).forEach(person => addPerson(parent, person, selectedObject?.id === person.id, animated, floorPlan));
}

function disposeGroup(group) {
  group.traverse(object => {
    object.material?.map?.dispose?.();
    object.geometry?.dispose?.();
    if (Array.isArray(object.material)) object.material.forEach(item => item.dispose());
    else object.material?.dispose?.();
  });
}

function animateCamera(engine, destination, target) {
  engine.cameraTween = {
    start: performance.now(),
    duration: 750,
    fromPosition: engine.camera.position.clone(),
    toPosition: new THREE.Vector3(...destination),
    fromTarget: engine.controls.target.clone(),
    toTarget: new THREE.Vector3(...target),
  };
}

export default function ThreeStoreScene({
  state, selectedObject, onSelectObject, onHoverObject, layers, zoom, paused,
  quality = 'auto', lighting = 'day', projection = 'perspective', cameraCommand,
}) {
  const mountRef = useRef(null);
  const engineRef = useRef(null);
  const pausedRef = useRef(paused);
  const hoverRef = useRef(null);
  pausedRef.current = paused;

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return undefined;
    const qualitySettings = resolveQuality(quality);
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(lighting === 'night' ? 0x07111f : 0xb9d6e8);
    scene.fog = new THREE.FogExp2(scene.background, lighting === 'night' ? 0.018 : 0.012);
    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 120);
    camera.position.set(...CAMERA_PRESETS.overview.position);
    const renderer = new THREE.WebGLRenderer({ antialias: qualitySettings.antialias, powerPreference: 'high-performance' });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = lighting === 'night' ? 0.88 : 1.1;
    renderer.shadowMap.enabled = qualitySettings.shadows;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, qualitySettings.pixelRatio));
    renderer.domElement.style.cssText = 'display:block;width:100%;height:100%;touch-action:none';
    renderer.domElement.setAttribute('aria-label', 'Interactive 3D digital twin of the retail store');
    renderer.domElement.setAttribute('role', 'img');
    mount.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.065;
    controls.target.set(...CAMERA_PRESETS.overview.target);
    controls.minDistance = 5;
    controls.maxDistance = 45;
    controls.maxPolarAngle = Math.PI * 0.48;
    controls.minPolarAngle = Math.PI * 0.08;
    controls.screenSpacePanning = false;
    controls.target.y = Math.max(0, controls.target.y);
    controls.addEventListener('change', () => {
      controls.target.x = THREE.MathUtils.clamp(controls.target.x, -11, 11);
      controls.target.z = THREE.MathUtils.clamp(controls.target.z, -8.5, 8.5);
      controls.target.y = THREE.MathUtils.clamp(controls.target.y, 0, 3);
    });
    controls.update();

    const hemi = new THREE.HemisphereLight(lighting === 'night' ? 0x60a5fa : 0xfffbeb, 0x172033, lighting === 'night' ? 1.25 : 2.25);
    scene.add(hemi);
    const keyLight = new THREE.DirectionalLight(lighting === 'night' ? 0x93c5fd : 0xffffff, lighting === 'night' ? 1.5 : 2.6);
    keyLight.position.set(-9, 18, 12);
    keyLight.castShadow = qualitySettings.shadows;
    keyLight.shadow.mapSize.set(qualitySettings.shadowSize, qualitySettings.shadowSize);
    Object.assign(keyLight.shadow.camera, { left: -16, right: 16, top: 16, bottom: -16 });
    scene.add(keyLight);
    [[-5, 5, -3, 0x8b5cf6], [1, 5, -3, 0x06b6d4], [7, 5, -3, 0xec4899], [5, 5, 4, 0xf59e0b]].forEach(([x, y, z, color]) => {
      const light = new THREE.PointLight(color, lighting === 'night' ? 10 : 6, 11, 2);
      light.position.set(x, y, z);
      scene.add(light);
    });

    const staticGroup = new THREE.Group();
    const dynamicGroup = new THREE.Group();
    scene.add(staticGroup, dynamicGroup);
    buildStoreShell(staticGroup);
    buildRetailFixtures(staticGroup);
    buildCheckoutAndBackOffice(staticGroup);

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const getHit = event => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      return raycaster.intersectObjects([dynamicGroup, staticGroup], true).find(item => item.object.userData?.type);
    };
    const handlePointerUp = event => {
      const hit = getHit(event);
      if (hit) onSelectObject(hit.object.userData);
    };
    const handlePointerMove = event => {
      const hit = getHit(event);
      const nextId = hit ? `${hit.object.userData.type}:${hit.object.userData.id}` : null;
      renderer.domElement.style.cursor = hit ? 'pointer' : 'grab';
      if (nextId === hoverRef.current) return;
      hoverRef.current = nextId;
      onHoverObject(hit ? { ...hit.object.userData, x: event.clientX, y: event.clientY } : null);
    };
    const handleDoubleClick = event => {
      const hit = getHit(event);
      if (!hit) return;
      const point = hit.point;
      animateCamera(engineRef.current, [point.x + 5, 5.5, point.z + 6], [point.x, 0.8, point.z]);
    };
    const handlePointerLeave = () => {
      hoverRef.current = null;
      onHoverObject(null);
    };
    renderer.domElement.addEventListener('pointerup', handlePointerUp);
    renderer.domElement.addEventListener('pointermove', handlePointerMove);
    renderer.domElement.addEventListener('pointerleave', handlePointerLeave);
    renderer.domElement.addEventListener('dblclick', handleDoubleClick);

    const resize = () => {
      if (!mount.clientWidth || !mount.clientHeight) return;
      renderer.setSize(mount.clientWidth, mount.clientHeight, true);
      camera.aspect = mount.clientWidth / mount.clientHeight;
      camera.updateProjectionMatrix();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(mount);
    resize();
    let animationFrame;
    let visible = !document.hidden;
    const handleVisibility = () => { visible = !document.hidden; };
    document.addEventListener('visibilitychange', handleVisibility);
    const timer = new THREE.Timer();
    timer.connect(document);
    engineRef.current = { camera, renderer, controls, dynamicGroup, animated: [], cameraTween: null };
    const render = timestamp => {
      animationFrame = requestAnimationFrame(render);
      if (!visible) return;
      timer.update(timestamp);
      const elapsed = timer.getElapsed();
      if (!pausedRef.current) engineRef.current?.animated.forEach(({ kind, object, phase, ring }) => {
        if (kind === 'person') {
          object.position.y = Math.sin(elapsed * 2.1 + phase) * 0.022;
          ring.rotation.z = elapsed * 0.3 + phase;
        } else if (kind === 'pulse') object.scale.setScalar(1 + Math.sin(elapsed * 3 + phase) * 0.16);
        else if (kind === 'alert') {
          object.rotation.y = elapsed * 1.2;
          object.position.y = 2.15 + Math.sin(elapsed * 2.4 + phase) * 0.16;
        }
      });
      const tween = engineRef.current?.cameraTween;
      if (tween) {
        const amount = Math.min(1, (performance.now() - tween.start) / tween.duration);
        const eased = 1 - (1 - amount) ** 3;
        camera.position.lerpVectors(tween.fromPosition, tween.toPosition, eased);
        controls.target.lerpVectors(tween.fromTarget, tween.toTarget, eased);
        if (amount === 1) engineRef.current.cameraTween = null;
      }
      controls.update();
      renderer.render(scene, camera);
    };
    render();

    return () => {
      cancelAnimationFrame(animationFrame);
      timer.dispose();
      observer.disconnect();
      document.removeEventListener('visibilitychange', handleVisibility);
      renderer.domElement.removeEventListener('pointerup', handlePointerUp);
      renderer.domElement.removeEventListener('pointermove', handlePointerMove);
      renderer.domElement.removeEventListener('pointerleave', handlePointerLeave);
      renderer.domElement.removeEventListener('dblclick', handleDoubleClick);
      controls.dispose();
      disposeGroup(scene);
      renderer.dispose();
      renderer.forceContextLoss();
      mount.removeChild(renderer.domElement);
      engineRef.current = null;
    };
  }, [lighting, onHoverObject, onSelectObject, quality]);

  useEffect(() => {
    const engine = engineRef.current;
    if (!engine || !state) return;
    disposeGroup(engine.dynamicGroup);
    engine.dynamicGroup.clear();
    engine.animated = [];
    addDynamicScene(engine.dynamicGroup, state, { layers, selectedObject }, engine.animated);
  }, [layers, selectedObject, state]);

  useEffect(() => {
    const camera = engineRef.current?.camera;
    if (!camera) return;
    camera.zoom = Math.max(0.65, Math.min(1.65, zoom));
    camera.updateProjectionMatrix();
  }, [zoom]);

  useEffect(() => {
    const engine = engineRef.current;
    if (!engine || !cameraCommand) return;
    const preset = CAMERA_PRESETS[cameraCommand.preset] ?? CAMERA_PRESETS.overview;
    animateCamera(engine, preset.position, preset.target);
  }, [cameraCommand]);

  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return;
    engine.camera.fov = projection === 'top' ? 25 : projection === 'isometric' ? 35 : 42;
    if (projection === 'top') animateCamera(engine, CAMERA_PRESETS.heatmap.position, CAMERA_PRESETS.heatmap.target);
    if (projection === 'isometric') animateCamera(engine, [17, 18, 17], [0, 0, 0]);
    engine.camera.updateProjectionMatrix();
  }, [projection]);

  return <div ref={mountRef} className="h-full min-h-0 w-full" data-quality={quality} data-projection={projection} />;
}
