/* Campus data matching the 'In-out' physical map.
   Map canvas: 720 × 440 px (schematic, not to scale). */
window.CAMPUS_DATA = {

  /* ── Searchable destinations ─────────────────────────────────────────── */
  locations: [
    { id: 'main_gate',   name: 'Main Gate',           category: 'Entrance', node: 'main_gate', building: 'Entrance' },
    { id: 'canteen',     name: 'Canteen',             category: 'Food',     node: 'canteen_node', building: 'Canteen' },
    { id: 'reception',   name: 'Reception Desk',      category: 'Office',   node: 'reception', building: 'SJCEM Building' },
    { id: 'library',     name: 'Library',             category: 'Study',    node: 'library',   building: 'SJCEM Building' },
    { id: 'admin',       name: 'Admin Office',        category: 'Office',   node: 'admin',     building: 'SJCEM Building' },
    { id: 'exam_cell',   name: 'Exam Cell',           category: 'Office',   node: 'exam_cell', building: 'SJCEM Building' },
    { id: 'wash_room',   name: 'Wash Room',           category: 'Facility', node: 'wash_room', building: 'SJCEM Building' },
    { id: 'chem_lab',    name: 'Chemistry Lab',       category: 'Lab',      node: 'chem_lab',  building: 'SJCEM Building' },
    { id: 'room_1',      name: 'Room 1',              category: 'Classroom',node: 'room_1',    building: 'SJCEM Building' },
    { id: 'chairman',    name: 'Chairman\'s Office',  category: 'Office',   node: 'chairman',  building: 'SJCEM Building' },
    { id: 'principal',   name: 'Principal\'s Office', category: 'Office',   node: 'principal', building: 'SJCEM Building' },
    { id: 'tpo',         name: 'TPO Office',          category: 'Office',   node: 'tpo',       building: 'SJCEM Building' },
    { id: 'ground',      name: 'Ground',              category: 'Outdoor',  node: 'path_sw',   building: 'Ground' },
    { id: 'lift',        name: 'Lift / Staircase',    category: 'Facility', node: 'lift',      building: 'SJCEM Building' }
  ],

  /* ── Path junctions (graph nodes) ───────────────────────────────────── */
  nodes: [
    // Outdoor paths
    { id: 'main_gate',      x: 480, y: 420, label: 'Main Gate' },
    { id: 'path_se',        x: 480, y: 400, label: 'SE Path' },
    { id: 'path_ne',        x: 480, y: 190, label: 'NE Path' },
    { id: 'path_sw',        x: 170, y: 400, label: 'SW Path' },
    { id: 'path_nw',        x: 170, y: 190, label: 'NW Path' },
    { id: 'canteen_node',   x: 130, y: 260, label: 'Canteen' },
    
    // SJCEM Building entries & corridors
    { id: 'sjcem_entrance', x: 170, y: 170, label: 'SJCEM Entrance' },
    { id: 'reception',      x: 170, y: 120, label: 'Reception Desk' },
    { id: 'corridor_w',     x: 250, y: 120, label: 'West Corridor' },
    { id: 'lib_ent',        x: 250, y: 80,  label: 'Library Ent' },
    { id: 'library',        x: 315, y: 80,  label: 'Library' },
    { id: 'corridor_nw',    x: 250, y: 32,  label: 'NW Corridor' },
    
    // Top corridor
    { id: 'c_chem',         x: 425, y: 32,  label: 'Chem Corridor' },
    { id: 'chem_lab',       x: 425, y: 20,  label: 'Chemistry Lab' },
    { id: 'c_room1',        x: 520, y: 32,  label: 'Room 1 Corridor' },
    { id: 'room_1',         x: 520, y: 20,  label: 'Room 1' },
    
    // Right corridor
    { id: 'c_chair',        x: 560, y: 35,  label: 'NE Corridor' },
    { id: 'chairman',       x: 615, y: 35,  label: 'Chairman\'s Office' },
    { id: 'c_lift',         x: 560, y: 70,  label: 'Lift Corridor' },
    { id: 'lift',           x: 615, y: 70,  label: 'Lift' },
    { id: 'c_prin',         x: 560, y: 102, label: 'Principal Corridor' },
    { id: 'principal',      x: 615, y: 102, label: 'Principal\'s Office' },
    { id: 'c_tpo',          x: 560, y: 132, label: 'TPO Corridor' },
    { id: 'tpo',            x: 615, y: 132, label: 'TPO Office' },
    
    // Bottom corridor
    { id: 'c_wash',         x: 560, y: 162, label: 'SE Corridor' },
    { id: 'wash_room',      x: 615, y: 162, label: 'Wash Room' },
    { id: 'c_exam',         x: 425, y: 162, label: 'Exam Corridor' },
    { id: 'exam_cell',      x: 425, y: 150, label: 'Exam Cell' },
    { id: 'c_admin',        x: 320, y: 162, label: 'Admin Corridor' },
    { id: 'admin',          x: 320, y: 150, label: 'Admin Office' },
    { id: 'c_sw',           x: 250, y: 162, label: 'SW Corridor' }
  ],

  /* ── Building rectangles drawn on the schematic map ─────────────────── */
  buildings: [
    { name: 'GROUND',               type: 'OUTDOOR',         x: 200, y: 220, w: 250, h: 180 },
    { name: 'CANTEEN',              type: 'FOOD',            x: 50,  y: 220, w: 80,  h: 80 },
    
    // SJCEM Rooms
    { name: 'RECEPTION DESK',       type: 'OFFICE',          x: 140, y: 100, w: 70,  h: 40 },
    { name: 'LIBRARY',              type: 'STUDY',           x: 270, y: 40,  w: 90,  h: 80 },
    { name: 'QUADRANGLE A',         type: 'OPEN AREA',       x: 380, y: 55,  w: 160, h: 90 },
    
    { name: 'ADMIN OFFICE',         type: 'OFFICE',          x: 270, y: 145, w: 100, h: 30 },
    { name: 'EXAM CELL',            type: 'OFFICE',          x: 380, y: 145, w: 90,  h: 30 },
    { name: 'WASH ROOM',            type: 'FACILITY',        x: 575, y: 145, w: 80,  h: 30 },
    
    { name: 'CHEMISTRY LAB',        type: 'LAB',             x: 380, y: 15,  w: 90,  h: 30 },
    { name: 'ROOM 1',               type: 'CLASSROOM',       x: 480, y: 15,  w: 80,  h: 30 },
    
    { name: 'CHAIRMAN\'S OFFICE',   type: 'OFFICE',          x: 575, y: 15,  w: 80,  h: 35 },
    { name: 'LIFT / STAIRCASE',     type: 'FACILITY',        x: 575, y: 60,  w: 80,  h: 20 },
    { name: 'PRINCIPAL\'S OFFICE',  type: 'OFFICE',          x: 575, y: 90,  w: 80,  h: 25 },
    { name: 'TPO OFFICE',           type: 'OFFICE',          x: 575, y: 120, w: 80,  h: 20 }
  ],

  /* ── Walkable edges (all two-way) ────────────────────────────────────── */
  edges: [
    // Outdoor
    { from: 'main_gate',      to: 'path_se',        distance: 20,  type: 'road' },
    { from: 'path_se',        to: 'path_sw',        distance: 310, type: 'road' },
    { from: 'path_se',        to: 'path_ne',        distance: 210, type: 'road' },
    { from: 'path_sw',        to: 'path_nw',        distance: 210, type: 'road' },
    { from: 'path_sw',        to: 'canteen_node',   distance: 140, type: 'road' },
    { from: 'path_ne',        to: 'path_nw',        distance: 310, type: 'road' },
    
    // Entrance
    { from: 'path_nw',        to: 'sjcem_entrance', distance: 20,  type: 'road' },
    { from: 'sjcem_entrance', to: 'reception',      distance: 50,  type: 'corridor' },
    { from: 'reception',      to: 'corridor_w',     distance: 80,  type: 'corridor' },
    
    // West corridor
    { from: 'corridor_w',     to: 'lib_ent',        distance: 40,  type: 'corridor' },
    { from: 'lib_ent',        to: 'library',        distance: 65,  type: 'corridor' },
    { from: 'lib_ent',        to: 'corridor_nw',    distance: 48,  type: 'corridor' },
    { from: 'corridor_w',     to: 'c_sw',           distance: 42,  type: 'corridor' },
    
    // Top corridor
    { from: 'corridor_nw',    to: 'c_chem',         distance: 175, type: 'corridor' },
    { from: 'c_chem',         to: 'chem_lab',       distance: 12,  type: 'corridor' },
    { from: 'c_chem',         to: 'c_room1',        distance: 95,  type: 'corridor' },
    { from: 'c_room1',        to: 'room_1',         distance: 12,  type: 'corridor' },
    { from: 'c_room1',        to: 'c_chair',        distance: 40,  type: 'corridor' },
    
    // Right corridor
    { from: 'c_chair',        to: 'chairman',       distance: 55,  type: 'corridor' },
    { from: 'c_chair',        to: 'c_lift',         distance: 35,  type: 'corridor' },
    { from: 'c_lift',         to: 'lift',           distance: 55,  type: 'corridor' },
    { from: 'c_lift',         to: 'c_prin',         distance: 32,  type: 'corridor' },
    { from: 'c_prin',         to: 'principal',      distance: 55,  type: 'corridor' },
    { from: 'c_prin',         to: 'c_tpo',          distance: 30,  type: 'corridor' },
    { from: 'c_tpo',          to: 'tpo',            distance: 55,  type: 'corridor' },
    { from: 'c_tpo',          to: 'c_wash',         distance: 30,  type: 'corridor' },
    
    // Bottom corridor
    { from: 'c_wash',         to: 'wash_room',      distance: 55,  type: 'corridor' },
    { from: 'c_wash',         to: 'c_exam',         distance: 135, type: 'corridor' },
    { from: 'c_exam',         to: 'exam_cell',      distance: 12,  type: 'corridor' },
    { from: 'c_exam',         to: 'c_admin',        distance: 105, type: 'corridor' },
    { from: 'c_admin',        to: 'admin',          distance: 12,  type: 'corridor' },
    { from: 'c_admin',        to: 'c_sw',           distance: 70,  type: 'corridor' }
  ],

  /* ── QR code → node ID mappings ─────────────────────────────────────── */
  qrCodes: {
    main_gate:  'main_gate',
    canteen:    'canteen_node',
    reception:  'reception',
    library:    'library',
    admin:      'admin',
    exam:       'exam_cell',
    washroom:   'wash_room',
    chem_lab:   'chem_lab',
    room1:      'room_1',
    chairman:   'chairman',
    principal:  'principal',
    tpo:        'tpo'
  }
};
