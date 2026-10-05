/* ═══════════════════════════════════════════════════════════
   SJCEM SmartNav — app.js
   Features:
   • Dijkstra shortest-path routing
   • Live GPS tracking (watchPosition) with accuracy ring
   • DeviceOrientation compass heading
   • Map pan + pinch-zoom (touch & mouse)
   • Animated SVG route drawing
   • Turn-by-turn step navigation panel (mobile)
   • QR code / camera start point
   • URL params: ?start=X&to=Y
   ═══════════════════════════════════════════════════════════ */

(() => {
  'use strict';

  /* ── Data & DOM helpers ─────────────────────────────────── */
  const data = window.CAMPUS_DATA;
  const $ = id => document.getElementById(id);
  const destination  = $('destination');
  const startSelect  = $('start');
  const accessible   = $('accessible');

  let chosenDestination = null;
  let activeRoute       = null;
  let cameraStream      = null;
  let toastTimer        = null;
  let gpsWatchId        = null;
  let gpsActive         = false;
  let lastGpsPos        = null;       // {svgX, svgY, accuracy}
  let compassHeading    = 0;          // degrees
  let currentNavStep    = 0;          // index in activeRoute.nodes
  let navPanelOpen      = false;

  /* Campus real-world bounding box (approx, from satellite)
     Used to map GPS coords → SVG canvas (720×440)           */
  const GEO = {
    latMax: 19.7068,  // north edge (top of map)
    latMin: 19.7042,  // south edge
    lngMin: 72.7685,  // west edge  (left of map)
    lngMax: 72.7710   // east edge
  };
  const SVG_W = 720, SVG_H = 440;

  /* Build lookup maps */
  const byNode       = new Map(data.nodes.map(n => [n.id, n]));
  const locationByNode = new Map(data.locations.map(l => [l.node, l]));
  const pretty = id  => locationByNode.get(id)?.name || byNode.get(id)?.label || id;
  const escapeHtml = s => String(s).replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  /* ── GPS → SVG coordinate projection ───────────────────── */
  function geoToSvg(lat, lng) {
    const x = ((lng - GEO.lngMin) / (GEO.lngMax - GEO.lngMin)) * SVG_W;
    const y = ((GEO.latMax - lat) / (GEO.latMax - GEO.latMin)) * SVG_H;
    return { x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 };
  }

  /* ── Pan / Zoom state ───────────────────────────────────── */
  const PAN = { scale: 1, tx: 0, ty: 0, dragging: false, startX: 0, startY: 0, startTx: 0, startTy: 0 };
  const SCALE_MIN = 0.4, SCALE_MAX = 10;
  let   pinchStartDist = 0, pinchStartScale = 1;
  let   userMovedMap = false;

  function applyTransform() {
    $('mapWrapper').style.transform = `translate(${PAN.tx}px,${PAN.ty}px) scale(${PAN.scale})`;
  }

  function clampTransform() {
    const vp = $('mapViewport');
    const vpW = vp.clientWidth, vpH = vp.clientHeight;
    const mapW = SVG_W * PAN.scale, mapH = SVG_H * PAN.scale;
    PAN.tx = Math.min(0, Math.max(vpW - mapW, PAN.tx));
    PAN.ty = Math.min(0, Math.max(vpH - mapH, PAN.ty));
  }

  /* SVG point → viewport pixel */
  function svgToViewport(svgX, svgY) {
    const vp = $('mapViewport');
    const svgEl = $('campusMap');
    const svgW = svgEl.clientWidth  || SVG_W;
    const svgH = svgEl.clientHeight || SVG_H;
    const px = (svgX / SVG_W) * svgW * PAN.scale + PAN.tx;
    const py = (svgY / SVG_H) * svgH * PAN.scale + PAN.ty;
    return { px, py };
  }

  /* Center map on a given SVG point */
  function centerOn(svgX, svgY, smooth = true) {
    const vp = $('mapViewport');
    PAN.tx = vp.clientWidth  / 2 - svgX * PAN.scale;
    PAN.ty = vp.clientHeight / 2 - svgY * PAN.scale;
    clampTransform();
    if (smooth) {
      $('mapWrapper').style.transition = 'transform 0.45s cubic-bezier(0.4,0,0.2,1)';
      applyTransform();
      setTimeout(() => { $('mapWrapper').style.transition = 'none'; }, 500);
    } else {
      applyTransform();
    }
    userMovedMap = false;
    $('recenterBtn').classList.remove('visible');
  }

  /* Fit entire map in viewport */
  function fitMap() {
    const vp = $('mapViewport');
    /* Use Math.max to 'cover' the viewport so the map is nicely zoomed in by default */
    PAN.scale = Math.max(vp.clientWidth / SVG_W, vp.clientHeight / SVG_H) * 1.2;
    PAN.tx = (vp.clientWidth  - SVG_W * PAN.scale) / 2;
    PAN.ty = (vp.clientHeight - SVG_H * PAN.scale) / 2;
    applyTransform();
    userMovedMap = false;
  }

  /* ── Mouse pan ──────────────────────────────────────────── */
  function initPanZoom() {
    const vp = $('mapViewport');

    /* Mouse */
    vp.addEventListener('mousedown', e => {
      if (e.button !== 0) return;
      PAN.dragging = true;
      PAN.startX = e.clientX; PAN.startY = e.clientY;
      PAN.startTx = PAN.tx;   PAN.startTy = PAN.ty;
      vp.style.cursor = 'grabbing';
    });
    window.addEventListener('mousemove', e => {
      if (!PAN.dragging) return;
      PAN.tx = PAN.startTx + (e.clientX - PAN.startX);
      PAN.ty = PAN.startTy + (e.clientY - PAN.startY);
      clampTransform(); applyTransform();
      userMovedMap = true;
      $('recenterBtn').classList.toggle('visible', gpsActive);
    });
    window.addEventListener('mouseup', () => {
      PAN.dragging = false;
      vp.style.cursor = '';
    });

    /* Wheel zoom */
    vp.addEventListener('wheel', e => {
      e.preventDefault();
      const rect = vp.getBoundingClientRect();
      const ox = e.clientX - rect.left, oy = e.clientY - rect.top;
      const delta = e.deltaY > 0 ? 0.85 : 1.15;
      const newScale = Math.min(SCALE_MAX, Math.max(SCALE_MIN, PAN.scale * delta));
      PAN.tx = ox - (ox - PAN.tx) * (newScale / PAN.scale);
      PAN.ty = oy - (oy - PAN.ty) * (newScale / PAN.scale);
      PAN.scale = newScale;
      clampTransform(); applyTransform();
      userMovedMap = true;
      $('recenterBtn').classList.toggle('visible', gpsActive);
    }, { passive: false });

    /* Touch pan + pinch-zoom */
    vp.addEventListener('touchstart', e => {
      if (e.touches.length === 1) {
        PAN.dragging = true;
        PAN.startX = e.touches[0].clientX; PAN.startY = e.touches[0].clientY;
        PAN.startTx = PAN.tx; PAN.startTy = PAN.ty;
      } else if (e.touches.length === 2) {
        PAN.dragging = false;
        pinchStartDist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        pinchStartScale = PAN.scale;
      }
    }, { passive: true });

    vp.addEventListener('touchmove', e => {
      e.preventDefault();
      if (e.touches.length === 1 && PAN.dragging) {
        PAN.tx = PAN.startTx + (e.touches[0].clientX - PAN.startX);
        PAN.ty = PAN.startTy + (e.touches[0].clientY - PAN.startY);
        clampTransform(); applyTransform();
        userMovedMap = true;
        $('recenterBtn').classList.toggle('visible', gpsActive);
      } else if (e.touches.length === 2) {
        const d = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        const rect = $('mapViewport').getBoundingClientRect();
        const cx = ((e.touches[0].clientX + e.touches[1].clientX) / 2) - rect.left;
        const cy = ((e.touches[0].clientY + e.touches[1].clientY) / 2) - rect.top;
        const newScale = Math.min(SCALE_MAX, Math.max(SCALE_MIN, pinchStartScale * (d / pinchStartDist)));
        PAN.tx = cx - (cx - PAN.tx) * (newScale / PAN.scale);
        PAN.ty = cy - (cy - PAN.ty) * (newScale / PAN.scale);
        PAN.scale = newScale;
        clampTransform(); applyTransform();
        userMovedMap = true;
        $('recenterBtn').classList.toggle('visible', gpsActive);
      }
    }, { passive: false });

    vp.addEventListener('touchend', () => { PAN.dragging = false; });

    /* Recenter button */
    $('recenterBtn').addEventListener('click', () => {
      if (lastGpsPos) centerOn(lastGpsPos.svgX, lastGpsPos.svgY);
    });
  }

  /* ── GPS tracking ───────────────────────────────────────── */
  function toggleGPS() {
    if (gpsActive) {
      stopGPS();
    } else {
      startGPS();
    }
  }

  function startGPS() {
    if (!('geolocation' in navigator)) {
      showToast('GPS not available on this device.');
      return;
    }
    $('gpsButton').classList.add('gps-active');
    $('gpsStatusBar').classList.add('gps-bar-visible');
    $('gpsStatusText').textContent = 'Locating you…';
    $('gpsMarker').style.display = 'block';
    gpsActive = true;

    gpsWatchId = navigator.geolocation.watchPosition(
      onGpsSuccess,
      onGpsError,
      { enableHighAccuracy: true, maximumAge: 2000, timeout: 15000 }
    );
  }

  function stopGPS() {
    if (gpsWatchId !== null) navigator.geolocation.clearWatch(gpsWatchId);
    gpsWatchId = null;
    gpsActive  = false;
    lastGpsPos = null;
    $('gpsButton').classList.remove('gps-active');
    $('gpsStatusBar').classList.remove('gps-bar-visible');
    $('gpsMarker').style.display = 'none';
    $('gpsRing').style.display   = 'none';
    $('recenterBtn').classList.remove('visible');
    renderMap();
  }

  function onGpsSuccess(pos) {
    const { latitude, longitude, accuracy } = pos.coords;
    const { x, y } = geoToSvg(latitude, longitude);

    lastGpsPos = { svgX: x, svgY: y, accuracy };
    $('gpsStatusText').textContent = `Located · ${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
    $('gpsAccText').textContent    = `±${Math.round(accuracy)} m`;

    /* Move SVG GPS marker */
    const marker = $('gpsMarker');
    marker.setAttribute('transform', `translate(${x},${y})`);
    marker.style.display = 'block';

    /* Update accuracy ring (viewport-space overlay) */
    updateGpsRing(x, y, accuracy);

    /* Auto-center if user hasn't panned away */
    if (!userMovedMap) centerOn(x, y, true);

    /* If navigating — check proximity to next waypoint */
    if (activeRoute && navPanelOpen) checkNavProgress(x, y);

    /* Set start to nearest node */
    const nearest = nearestNode(x, y);
    if (nearest) {
      startSelect.value = nearest.id;
      if (chosenDestination && activeRoute) findRoute();
    }
  }

  function updateGpsRing(svgX, svgY, accuracyM) {
    const vp = $('mapViewport');
    const svgEl = $('campusMap');
    /* metres → SVG units (rough: campus ~200m = SVG_W px wide, depends on GEO bounds) */
    const metersPerSvgUnit = (GEO.lngMax - GEO.lngMin) * 111320 / SVG_W; // approx
    const svgRadius = accuracyM / metersPerSvgUnit;

    /* Convert to viewport px */
    const { px: vpX, py: vpY } = svgToViewport(svgX, svgY);
    const vpRadius = svgRadius * PAN.scale * (vp.clientWidth / SVG_W);

    const ring = $('gpsRing');
    ring.style.display  = 'block';
    ring.style.left     = vpX + 'px';
    ring.style.top      = vpY + 'px';
    ring.style.width    = (vpRadius * 2) + 'px';
    ring.style.height   = (vpRadius * 2) + 'px';
  }

  function onGpsError(err) {
    const msgs = {
      1: 'Location permission denied. Enable location for this site.',
      2: 'GPS signal lost. Move to an open area.',
      3: 'GPS timeout. Retrying…'
    };
    showToast(msgs[err.code] || 'GPS error.');
    $('gpsStatusText').textContent = msgs[err.code] || 'GPS unavailable';
    if (err.code === 1) stopGPS();
  }

  /* Find nearest graph node to a SVG point */
  function nearestNode(svgX, svgY) {
    let best = null, bestD = Infinity;
    for (const n of data.nodes) {
      const d = Math.hypot(n.x - svgX, n.y - svgY);
      if (d < bestD) { bestD = d; best = n; }
    }
    return best;
  }

  /* ── Device Orientation (compass) ──────────────────────── */
  function initCompass() {
    const handler = e => {
      let heading = null;
      if (e.webkitCompassHeading != null) {
        heading = e.webkitCompassHeading; // iOS
      } else if (e.alpha != null) {
        heading = (360 - e.alpha) % 360;  // Android
      }
      if (heading == null) return;
      compassHeading = heading;

      /* Rotate compass widget */
      $('mapCompass').style.transform = `rotate(${-heading}deg)`;

      /* Rotate heading arrow on GPS marker */
      $('gpsHeading').setAttribute('transform', `rotate(${heading},0,0)`);
    };

    if (typeof DeviceOrientationEvent !== 'undefined' &&
        typeof DeviceOrientationEvent.requestPermission === 'function') {
      /* iOS 13+ requires user gesture */
      document.addEventListener('click', async function once() {
        try {
          const perm = await DeviceOrientationEvent.requestPermission();
          if (perm === 'granted') window.addEventListener('deviceorientation', handler);
        } catch (_) {}
        document.removeEventListener('click', once);
      }, { once: true });
    } else {
      window.addEventListener('deviceorientation', handler);
    }
  }

  /* ── Step-by-step navigation panel ─────────────────────── */
  function openNavPanel() {
    navPanelOpen = true;
    currentNavStep = 0;
    const panel = $('navPanel');
    panel.style.display = 'block';
    requestAnimationFrame(() => panel.classList.add('visible'));
    updateNavPanel();
  }

  function closeNavPanel() {
    navPanelOpen = false;
    const panel = $('navPanel');
    panel.classList.remove('visible');
    setTimeout(() => { panel.style.display = 'none'; }, 400);
  }

  function updateNavPanel() {
    if (!activeRoute || !navPanelOpen) return;
    const nodes = activeRoute.nodes;
    const total = nodes.length - 1;
    const step  = Math.min(currentNavStep, total);

    const fromName = pretty(nodes[step]);
    const toName   = step < total ? pretty(nodes[step + 1]) : '🎯 Arrived!';

    $('navStepText').textContent = step < total
      ? `Head to ${toName}`
      : '🎯 You have arrived!';
    $('navDistText').textContent = step < total
      ? `Step ${step + 1} of ${total}`
      : 'Destination reached';
    $('navSubText').textContent  = step < total
      ? `From: ${fromName}`
      : `You reached ${pretty(nodes[total])}`;

    const pct = total > 0 ? Math.round((step / total) * 100) : 100;
    $('navProgressBar').style.width = pct + '%';

    /* Highlight active step in directions list */
    const items = $('routeDetails').querySelectorAll('.directions li');
    items.forEach((li, i) => li.classList.toggle('active-step', i === step));

    /* Pan map to current waypoint node */
    const curNode = byNode.get(nodes[step]);
    if (curNode && !userMovedMap) centerOn(curNode.x, curNode.y);
  }

  function checkNavProgress(svgX, svgY) {
    if (!activeRoute || currentNavStep >= activeRoute.nodes.length - 1) return;
    const nextNodeId = activeRoute.nodes[currentNavStep + 1];
    const nextNode   = byNode.get(nextNodeId);
    if (!nextNode) return;
    const dist = Math.hypot(svgX - nextNode.x, svgY - nextNode.y);
    /* ~20 SVG units ≈ ~5m on campus  */
    if (dist < 20) {
      currentNavStep++;
      updateNavPanel();
      if (currentNavStep >= activeRoute.nodes.length - 1) {
        showToast('🎯 You have arrived!');
      } else {
        showToast(`Step ${currentNavStep + 1}: Head to ${pretty(activeRoute.nodes[currentNavStep + 1])}`);
      }
    }
  }

  /* ── Init ───────────────────────────────────────────────── */
  function init() {
    /* Populate start dropdown */
    startSelect.innerHTML = data.nodes.map(n =>
      `<option value="${n.id}">${escapeHtml(pretty(n.id))}</option>`
    ).join('');

    fitMap();
    renderMap();
    renderPicks();
    initPanZoom();
    initCompass();

    /* URL params */
    const params = new URLSearchParams(location.search);
    if (params.has('start')) setStartFromCode(params.get('start'), false);
    if (params.has('to')) {
      const loc = data.locations.find(l => l.id === params.get('to') || l.node === params.get('to'));
      if (loc) selectDestination(loc);
    }

    /* Events */
    $('routeButton').addEventListener('click', findRoute);
    $('gpsButton').addEventListener('click', toggleGPS);
    $('recenterBtn').addEventListener('click', () => {
      if (lastGpsPos) centerOn(lastGpsPos.svgX, lastGpsPos.svgY);
    });

    $('clearSearch').addEventListener('click', () => {
      destination.value = '';
      chosenDestination = null;
      $('clearSearch').style.display = 'none';
      $('quickPicks').querySelectorAll('.active').forEach(x => x.classList.remove('active'));
      destination.focus();
    });

    destination.addEventListener('input', onSearch);
    destination.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const result = searchMatches()[0];
        if (result) selectDestination(result);
        else showToast('No matching place. Edit campus-data.js to add it.');
      }
    });

    accessible.addEventListener('change', () => { if (activeRoute) findRoute(); });

    $('scanButton').addEventListener('click', () => $('qrDialog').showModal());
    $('qrForm').addEventListener('submit', e => {
      e.preventDefault();
      setStartFromCode($('qrInput').value.trim(), true);
    });

    $('cameraButton').addEventListener('click', startCamera);
    $('qrDialog').addEventListener('close', stopCamera);

    $('helpButton').addEventListener('click', () => $('aboutDialog').showModal());
    $('aboutOk').addEventListener('click', () => $('aboutDialog').close());

    $('resetMap').addEventListener('click', () => {
      activeRoute = null;
      closeNavPanel();
      $('routeDetails').hidden = true;
      $('mapTitle').textContent = 'Explore campus';
      $('mapHint').innerHTML = `<span class="hint-pin">⌖</span><span>
        <strong>Choose a destination</strong><small>Your route will appear here</small></span>`;
      $('mapViewport').classList.remove('route-active');
      document.querySelector('.layout').classList.remove('route-mode');
      setTimeout(() => { fitMap(); }, 50);
      renderMap();
    });

    /* Nav panel buttons */
    $('navPrevBtn').addEventListener('click', () => {
      if (currentNavStep > 0) { currentNavStep--; updateNavPanel(); }
    });
    $('navNextBtn').addEventListener('click', () => {
      if (activeRoute && currentNavStep < activeRoute.nodes.length - 1) {
        currentNavStep++; updateNavPanel();
      }
    });
    $('navEndBtn').addEventListener('click', () => {
      closeNavPanel();
      showToast('Navigation ended.');
    });

    /* Window resize: refit */
    window.addEventListener('resize', () => {
      if (!userMovedMap) fitMap();
    });
  }

  /* ── Picks & search ─────────────────────────────────────── */
  function renderPicks() {
    const picks = data.locations;
    $('quickPicks').innerHTML = picks.map(l =>
      `<button type="button" class="pick-chip" data-id="${escapeHtml(l.id)}">${escapeHtml(l.name)}</button>`
    ).join('');
    $('quickPicks').querySelectorAll('button').forEach(b => {
      b.addEventListener('click', () => {
        const l = data.locations.find(x => x.id === b.dataset.id);
        if (l) selectDestination(l);
      });
    });
  }

  function searchMatches() {
    const q = destination.value.trim().toLowerCase();
    return q ? data.locations.filter(l =>
      `${l.name} ${l.category} ${l.building}`.toLowerCase().includes(q)
    ) : [];
  }

  function onSearch() {
    $('clearSearch').style.display = destination.value ? 'block' : 'none';
    const q = destination.value.trim().toLowerCase();
    if (!q) { renderPicks(); return; }
    const matches = searchMatches().slice(0, 6);
    $('quickPicks').innerHTML = matches.length
      ? matches.map(l =>
          `<button type="button" class="pick-chip" data-id="${escapeHtml(l.id)}">
            ${escapeHtml(l.name)} <small>${escapeHtml(l.category)}</small></button>`
        ).join('')
      : '<span class="search-empty">No places found. Add it to campus-data.js.</span>';
    $('quickPicks').querySelectorAll('button').forEach(b => {
      b.addEventListener('click', () => {
        const l = data.locations.find(x => x.id === b.dataset.id);
        if (l) selectDestination(l);
      });
    });
  }

  function selectDestination(loc) {
    chosenDestination = loc;
    destination.value = loc.name;
    $('clearSearch').style.display = 'block';
    $('mapTitle').textContent = loc.name;
    findRoute();
  }

  /* ── Dijkstra ───────────────────────────────────────────── */
  function dijkstra(from, to, avoidStairs) {
    const dist = new Map(data.nodes.map(n => [n.id, Infinity]));
    const prev = new Map();
    const visited = new Set();
    dist.set(from, 0);

    while (visited.size < data.nodes.length) {
      let current = null, best = Infinity;
      for (const [id, d] of dist) {
        if (!visited.has(id) && d < best) { current = id; best = d; }
      }
      if (current === null || current === to) break;
      visited.add(current);

      for (const e of data.edges) {
        if (avoidStairs && e.type === 'stairs') continue;
        const next = e.from === current ? e.to : e.to === current ? e.from : null;
        if (!next || visited.has(next)) continue;
        const candidate = best + Number(e.distance);
        if (candidate < dist.get(next)) {
          dist.set(next, candidate);
          prev.set(next, { node: current, edge: e });
        }
      }
    }

    if (!Number.isFinite(dist.get(to))) return null;
    const nodes = [to], edges = [];
    let cursor = to;
    while (cursor !== from) {
      const step = prev.get(cursor);
      if (!step) return null;
      edges.unshift(step.edge);
      cursor = step.node;
      nodes.unshift(cursor);
    }
    return { nodes, edges, distance: dist.get(to) };
  }

  /* ── Find & display route ───────────────────────────────── */
  function findRoute() {
    if (!chosenDestination) {
      const first = searchMatches()[0];
      if (first) chosenDestination = first;
      else { showToast('Choose a destination first.'); destination.focus(); return; }
    }

    const from = startSelect.value, to = chosenDestination.node;

    if (from === to) {
      showToast('You are already at that location.');
      activeRoute = { nodes: [from], edges: [], distance: 0 };
      renderMap(); showRouteDetails();
      return;
    }

    const route = dijkstra(from, to, accessible.checked);
    if (!route) {
      activeRoute = null; renderMap();
      $('routeDetails').hidden = false;
      $('routeDetails').innerHTML = `<div class="route-summary"><strong>No route available</strong>
        <span class="route-meta">Try another start or turn off accessible routing.</span></div>`;
      showToast('No connected path found.');
      return;
    }

    activeRoute = route;
    renderMap();
    showRouteDetails();

    /* Center map on start node */
    const startNode = byNode.get(from);
    if (startNode) centerOn(startNode.x, startNode.y);

    /* Expand map viewport and switch to route-mode layout */
    $('mapViewport').classList.add('route-active');
    document.querySelector('.layout').classList.add('route-mode');

    /* After the layout transition, refit the map and scroll to it */
    setTimeout(() => {
      fitMap();
      if (startNode) centerOn(startNode.x, startNode.y, false);
      $('mapViewport').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);

    /* Auto-open nav panel on mobile */
    if (window.innerWidth <= 760) {
      openNavPanel();
    }
  }

  function showRouteDetails() {
    if (!activeRoute) return;
    const mins = activeRoute.distance
      ? Math.max(1, Math.ceil(activeRoute.distance / 75)) : 0;
    const names = activeRoute.nodes.slice(1).map((n, i) =>
      `<li><span>${i + 1}</span>${escapeHtml(pretty(n))}</li>`
    ).join('');

    $('routeDetails').hidden = false;
    $('routeDetails').innerHTML = `
      <div class="route-summary">
        <strong>${escapeHtml(pretty(startSelect.value))}
          <span style="color:var(--ink3);font-weight:400">→</span>
          ${escapeHtml(pretty(chosenDestination.node))}</strong>
        <span class="route-meta"><b>${activeRoute.distance} m</b> · ~${mins} min</span>
      </div>
      <ol class="directions">${names}</ol>`;

    $('mapHint').innerHTML = `<span class="hint-pin">⌖</span><span>
      <strong>${escapeHtml(pretty(chosenDestination.node))}</strong>
      <small>${activeRoute.distance} m · about ${mins} min on foot</small></span>`;
  }

  /* ── Render map ─────────────────────────────────────────── */
  function renderMap() {
    /* Buildings */
    $('mapBuildings').innerHTML = data.buildings.map(b => `
      <g class="fade-in">
        <rect class="building" x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="9"/>
        <text class="building-label" x="${b.x + b.w / 2}" y="${b.y + b.h / 2 - 2}">${escapeHtml(b.name)}</text>
        <text class="building-type"  x="${b.x + b.w / 2}" y="${b.y + b.h / 2 + 13}">${escapeHtml(b.type)}</text>
      </g>`
    ).join('');

    /* Path edges */
    $('mapPaths').innerHTML = data.edges.map(e => {
      const a = byNode.get(e.from), b = byNode.get(e.to);
      if (!a || !b) return '';
      return `<line class="map-path edge-${escapeHtml(e.type)}"
        x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}"/>`;
    }).join('');

    /* Animated route */
    if (activeRoute && activeRoute.nodes.length > 1) {
      const pts = activeRoute.nodes.map(id => {
        const n = byNode.get(id);
        return `${n.x},${n.y}`;
      }).join(' ');
      $('mapRoute').innerHTML = `
        <polyline class="map-route-line" points="${pts}"/>
        <polyline class="map-route-dashes" points="${pts}" style="stroke-dashoffset:0"/>`;
    } else {
      $('mapRoute').innerHTML = '';
    }

    /* Nodes */
    $('mapNodes').innerHTML = data.nodes.map(n => {
      const isStart  = activeRoute?.nodes[0] === n.id;
      const isEnd    = activeRoute?.nodes.at(-1) === n.id;
      const onRoute  = activeRoute?.nodes.includes(n.id);
      const cls = ['map-node', onRoute ? 'route-node' : '',
        isStart ? 'selected-start' : '', isEnd ? 'selected-end' : '']
        .filter(Boolean).join(' ');
      const label = isStart ? 'S' : isEnd ? 'D' : '·';
      return `<g class="${cls}">
        <circle cx="${n.x}" cy="${n.y}" r="7"/>
        <text x="${n.x}" y="${n.y + 0.5}">${label}</text>
      </g>`;
    }).join('');
  }

  /* ── QR / Camera ────────────────────────────────────────── */
  function setStartFromCode(code, closeOnSuccess) {
    const normalized = String(code || '').trim()
      .replace(/^.*[?&]start=/, '').replace(/^.*\//, '').toLowerCase();
    const node = data.qrCodes[normalized] || (byNode.has(normalized) ? normalized : null);
    if (!node) {
      $('qrFeedback').textContent = 'That QR code is not in campus-data.js.';
      return false;
    }
    startSelect.value = node;
    $('qrFeedback').textContent = `Starting point set to ${pretty(node)}.`;
    if (closeOnSuccess) {
      $('qrDialog').close();
      showToast(`Start set: ${pretty(node)}`);
      if (chosenDestination) findRoute();
    }
    return true;
  }

  async function startCamera() {
    const feedback = $('qrFeedback');
    if (!('BarcodeDetector' in window)) {
      feedback.textContent = 'Camera QR scanning not supported. Enter the QR code below.';
      return;
    }
    try {
      cameraStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      const video = $('cameraVideo');
      video.srcObject = cameraStream;
      video.classList.add('active');
      await video.play();
      $('cameraButton').textContent = 'Camera on — hold QR in view';
      const detector = new BarcodeDetector({ formats: ['qr_code'] });
      const scan = async () => {
        if (!cameraStream) return;
        try {
          const codes = await detector.detect(video);
          if (codes.length && setStartFromCode(codes[0].rawValue, true)) return;
        } catch (_) {}
        if (cameraStream) requestAnimationFrame(scan);
      };
      scan();
    } catch (_) {
      feedback.textContent = 'Camera access unavailable. Allow access or enter the QR code below.';
    }
  }

  function stopCamera() {
    if (cameraStream) { cameraStream.getTracks().forEach(t => t.stop()); cameraStream = null; }
    $('cameraVideo').srcObject = null;
    $('cameraVideo').classList.remove('active');
    $('cameraButton').textContent = 'Open camera';
  }

  /* ── Toast ──────────────────────────────────────────────── */
  function showToast(message) {
    const el = $('toast');
    el.textContent = message;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 2800);
  }

  /* ── Boot ───────────────────────────────────────────────── */
  init();
})();
