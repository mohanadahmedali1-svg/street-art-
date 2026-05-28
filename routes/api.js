const express = require('express');
const { body, param, validationResult } = require('express-validator');
const { getDB } = require('../config/db');
const { authenticate, authorize, checkExists, allowOnly } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

// ── Helpers ──────────────────────────────────────────────────────────────
async function queryAll(sql, params = []) {
  const db = getDB();
  const [rows] = await db.execute(sql, params);
  return rows;
}

async function queryOne(sql, params = []) {
  const db = getDB();
  const [rows] = await db.execute(sql, params);
  return rows[0] || null;
}

async function runSQL(sql, params = []) {
  const db = getDB();
  const [result] = await db.execute(sql, params);
  return result;
}

function validate(req, res) {
  const e = validationResult(req);
  if (!e.isEmpty()) { res.status(400).json({ error: 'Invalid input' }); return false; }
  return true;
}

// ── STATS ────────────────────────────────────────────────────────────────
router.get('/stats', async (req, res) => {
  try {
    const murals    = (await queryOne('SELECT COUNT(*) as c FROM mural')).c;
    const artists   = (await queryOne('SELECT COUNT(*) as c FROM artist')).c;
    const crews     = (await queryOne('SELECT COUNT(*) as c FROM crew')).c;
    const locations = (await queryOne('SELECT COUNT(*) as c FROM location')).c;
    const active    = (await queryOne("SELECT COUNT(*) as c FROM mural WHERE status='active'")).c;
    const damaged   = (await queryOne("SELECT COUNT(*) as c FROM mural WHERE status='damaged'")).c;
    const restored  = (await queryOne("SELECT COUNT(*) as c FROM mural WHERE status='restored'")).c;
    const removed   = (await queryOne("SELECT COUNT(*) as c FROM mural WHERE status='removed'")).c;
    res.json({ murals, artists, crews, locations, active, damaged, restored, removed });
  } catch (e) { res.status(500).json({ error: 'Server error' }); }
});

// ── LOCATIONS ────────────────────────────────────────────────────────────
router.get('/locations', async (req, res) => {
  try { res.json(await queryAll('SELECT * FROM location ORDER BY city')); }
  catch (e) { res.status(500).json({ error: 'Server error' }); }
});

router.post('/locations',
  authorize('admin','editor'),
  allowOnly('location_id','address','city'),
  [
    body('location_id').isInt({ min: 1 }),
    body('address').trim().isLength({ min: 2, max: 255 }).escape(),
    body('city').trim().isLength({ min: 2, max: 100 }).escape()
  ],
  async (req, res) => {
    if (!validate(req, res)) return;
    const { location_id, address, city } = req.body;
    try {
      await runSQL('INSERT INTO location VALUES (?,?,?)', [location_id, address, city]);
      res.json({ message: 'Location added' });
    } catch { res.status(400).json({ error: 'Operation failed' }); }
  }
);

router.put('/locations/:id',
  authorize('admin','editor'),
  allowOnly('address','city'),
  [
    param('id').isInt(),
    body('address').trim().isLength({ min: 2, max: 255 }).escape(),
    body('city').trim().isLength({ min: 2, max: 100 }).escape()
  ],
  async (req, res) => {
    if (!validate(req, res)) return;
    const { address, city } = req.body;
    try {
      await runSQL('UPDATE location SET address=?, city=? WHERE location_id=?', [address, city, req.params.id]);
      res.json({ message: 'Location updated' });
    } catch { res.status(400).json({ error: 'Operation failed' }); }
  }
);

router.delete('/locations/:id',
  authorize('admin'),
  [param('id').isInt()],
  async (req, res) => {
    if (!validate(req, res)) return;
    try {
      await runSQL('DELETE FROM location WHERE location_id=?', [req.params.id]);
      res.json({ message: 'Deleted' });
    } catch { res.status(400).json({ error: 'Cannot delete: resource is in use' }); }
  }
);

// ── CREWS ────────────────────────────────────────────────────────────────
router.get('/crews', async (req, res) => {
  try { res.json(await queryAll('SELECT * FROM crew ORDER BY crew_name')); }
  catch (e) { res.status(500).json({ error: 'Server error' }); }
});

router.post('/crews',
  authorize('admin','editor'),
  allowOnly('crew_id','crew_name','base_city'),
  [
    body('crew_id').isInt({ min: 1 }),
    body('crew_name').trim().isLength({ min: 2, max: 100 }).escape(),
    body('base_city').trim().isLength({ min: 2, max: 100 }).escape()
  ],
  async (req, res) => {
    if (!validate(req, res)) return;
    const { crew_id, crew_name, base_city } = req.body;
    try {
      await runSQL('INSERT INTO crew VALUES (?,?,?)', [crew_id, crew_name, base_city]);
      res.json({ message: 'Crew added' });
    } catch { res.status(400).json({ error: 'Operation failed' }); }
  }
);

router.put('/crews/:id',
  authorize('admin','editor'),
  allowOnly('crew_name','base_city'),
  [
    param('id').isInt(),
    body('crew_name').trim().isLength({ min: 2, max: 100 }).escape(),
    body('base_city').trim().isLength({ min: 2, max: 100 }).escape()
  ],
  async (req, res) => {
    if (!validate(req, res)) return;
    const { crew_name, base_city } = req.body;
    try {
      await runSQL('UPDATE crew SET crew_name=?, base_city=? WHERE crew_id=?', [crew_name, base_city, req.params.id]);
      res.json({ message: 'Crew updated' });
    } catch { res.status(400).json({ error: 'Operation failed' }); }
  }
);

router.delete('/crews/:id',
  authorize('admin'),
  [param('id').isInt()],
  async (req, res) => {
    if (!validate(req, res)) return;
    try {
      await runSQL('DELETE FROM crew WHERE crew_id=?', [req.params.id]);
      res.json({ message: 'Deleted' });
    } catch { res.status(400).json({ error: 'Operation failed' }); }
  }
);

// ── ARTISTS ──────────────────────────────────────────────────────────────
router.get('/artists', async (req, res) => {
  try {
    res.json(await queryAll(`
      SELECT a.artist_id, a.handle, a.full_name, a.crew_id, c.crew_name
      FROM artist a LEFT JOIN crew c ON a.crew_id = c.crew_id
      ORDER BY a.full_name
    `));
  } catch (e) { res.status(500).json({ error: 'Server error' }); }
});

router.post('/artists',
  authorize('admin','editor'),
  allowOnly('artist_id','handle','full_name','crew_id'),
  [
    body('artist_id').isInt({ min: 1 }),
    body('handle').trim().isLength({ min: 2, max: 100 }).escape(),
    body('full_name').trim().isLength({ min: 2, max: 150 }).escape(),
    body('crew_id').optional({ nullable: true }).isInt()
  ],
  async (req, res) => {
    if (!validate(req, res)) return;
    const { artist_id, handle, full_name, crew_id } = req.body;
    try {
      await runSQL('INSERT INTO artist VALUES (?,?,?,?)', [artist_id, handle, full_name, crew_id || null]);
      res.json({ message: 'Artist added' });
    } catch { res.status(400).json({ error: 'Operation failed' }); }
  }
);

router.put('/artists/:id',
  authorize('admin','editor'),
  allowOnly('handle','full_name','crew_id'),
  [
    param('id').isInt(),
    body('handle').trim().isLength({ min: 2, max: 100 }).escape(),
    body('full_name').trim().isLength({ min: 2, max: 150 }).escape(),
    body('crew_id').optional({ nullable: true }).isInt()
  ],
  async (req, res) => {
    if (!validate(req, res)) return;
    const { handle, full_name, crew_id } = req.body;
    try {
      await runSQL('UPDATE artist SET handle=?, full_name=?, crew_id=? WHERE artist_id=?',
        [handle, full_name, crew_id || null, req.params.id]);
      res.json({ message: 'Artist updated' });
    } catch { res.status(400).json({ error: 'Operation failed' }); }
  }
);

router.delete('/artists/:id',
  authorize('admin'),
  [param('id').isInt()],
  async (req, res) => {
    if (!validate(req, res)) return;
    try {
      await runSQL('DELETE FROM artist WHERE artist_id=?', [req.params.id]);
      res.json({ message: 'Deleted' });
    } catch { res.status(400).json({ error: 'Operation failed' }); }
  }
);

// ── MURALS ───────────────────────────────────────────────────────────────
router.get('/murals', async (req, res) => {
  try {
    res.json(await queryAll(`
      SELECT m.mural_id, m.creation_date, m.status, m.title, m.location_id, l.address, l.city
      FROM mural m LEFT JOIN location l ON m.location_id = l.location_id
      ORDER BY m.creation_date DESC
    `));
  } catch (e) { res.status(500).json({ error: 'Server error' }); }
});

router.post('/murals',
  authorize('admin','editor'),
  allowOnly('mural_id','creation_date','status','title','location_id'),
  [
    body('mural_id').isInt({ min: 1 }),
    body('creation_date').isDate(),
    body('status').isIn(['active','damaged','restored','removed']),
    body('title').trim().isLength({ min: 2, max: 200 }).escape(),
    body('location_id').isInt({ min: 1 })
  ],
  async (req, res) => {
    if (!validate(req, res)) return;
    const { mural_id, creation_date, status, title, location_id } = req.body;
    try {
      await runSQL('INSERT INTO mural VALUES (?,?,?,?,?)', [mural_id, creation_date, status, title, location_id]);
      res.json({ message: 'Mural added' });
    } catch { res.status(400).json({ error: 'Operation failed' }); }
  }
);

router.put('/murals/:id',
  authorize('admin','editor'),
  allowOnly('creation_date','status','title','location_id'),
  [
    param('id').isInt(),
    body('creation_date').isDate(),
    body('status').isIn(['active','damaged','restored','removed']),
    body('title').trim().isLength({ min: 2, max: 200 }).escape(),
    body('location_id').isInt({ min: 1 })
  ],
  async (req, res) => {
    if (!validate(req, res)) return;
    const { creation_date, status, title, location_id } = req.body;
    try {
      await runSQL('UPDATE mural SET creation_date=?, status=?, title=?, location_id=? WHERE mural_id=?',
        [creation_date, status, title, location_id, req.params.id]);
      res.json({ message: 'Mural updated' });
    } catch { res.status(400).json({ error: 'Operation failed' }); }
  }
);

router.delete('/murals/:id',
  authorize('admin'),
  [param('id').isInt()],
  async (req, res) => {
    if (!validate(req, res)) return;
    try {
      await runSQL('DELETE FROM mural WHERE mural_id=?', [req.params.id]);
      res.json({ message: 'Deleted' });
    } catch { res.status(400).json({ error: 'Operation failed' }); }
  }
);

// ── PRESERVATION RECORDS ─────────────────────────────────────────────────
router.get('/records', async (req, res) => {
  try {
    res.json(await queryAll(`
      SELECT pr.record_id, pr.mural_id, pr.description, m.title as mural_title
      FROM preservation_record pr LEFT JOIN mural m ON pr.mural_id = m.mural_id
      ORDER BY pr.record_id DESC
    `));
  } catch (e) { res.status(500).json({ error: 'Server error' }); }
});

router.post('/records',
  authorize('admin','editor'),
  allowOnly('record_id','mural_id','description'),
  [
    body('record_id').isInt({ min: 1 }),
    body('mural_id').isInt({ min: 1 }),
    body('description').trim().isLength({ min: 5, max: 1000 }).escape()
  ],
  async (req, res) => {
    if (!validate(req, res)) return;
    const { record_id, mural_id, description } = req.body;
    try {
      await runSQL('INSERT INTO preservation_record VALUES (?,?,?)', [record_id, mural_id, description]);
      res.json({ message: 'Record added' });
    } catch { res.status(400).json({ error: 'Operation failed' }); }
  }
);

router.put('/records/:id',
  authorize('admin','editor'),
  allowOnly('mural_id','description'),
  [
    param('id').isInt(),
    body('mural_id').isInt({ min: 1 }),
    body('description').trim().isLength({ min: 5, max: 1000 }).escape()
  ],
  async (req, res) => {
    if (!validate(req, res)) return;
    const { mural_id, description } = req.body;
    try {
      await runSQL('UPDATE preservation_record SET mural_id=?, description=? WHERE record_id=?',
        [mural_id, description, req.params.id]);
      res.json({ message: 'Record updated' });
    } catch { res.status(400).json({ error: 'Operation failed' }); }
  }
);

router.delete('/records/:id',
  authorize('admin'),
  [param('id').isInt()],
  async (req, res) => {
    if (!validate(req, res)) return;
    try {
      await runSQL('DELETE FROM preservation_record WHERE record_id=?', [req.params.id]);
      res.json({ message: 'Deleted' });
    } catch { res.status(400).json({ error: 'Operation failed' }); }
  }
);

// ── PLACE ────────────────────────────────────────────────────────────────
router.get('/places', async (req, res) => {
  try {
    res.json(await queryAll(`
      SELECT p.crew_id, p.location_id, p.since, c.crew_name, l.city, l.address
      FROM place p
      LEFT JOIN crew c ON p.crew_id = c.crew_id
      LEFT JOIN location l ON p.location_id = l.location_id
    `));
  } catch (e) { res.status(500).json({ error: 'Server error' }); }
});

router.post('/places',
  authorize('admin','editor'),
  allowOnly('crew_id','location_id','since'),
  [
    body('crew_id').isInt({ min: 1 }),
    body('location_id').isInt({ min: 1 }),
    body('since').isDate()
  ],
  async (req, res) => {
    if (!validate(req, res)) return;
    const { crew_id, location_id, since } = req.body;
    try {
      await runSQL('INSERT INTO place VALUES (?,?,?)', [crew_id, location_id, since]);
      res.json({ message: 'Place added' });
    } catch { res.status(400).json({ error: 'Operation failed' }); }
  }
);

router.delete('/places/:crew_id/:location_id',
  authorize('admin'),
  async (req, res) => {
    const { crew_id, location_id } = req.params;
    if (isNaN(crew_id) || isNaN(location_id))
      return res.status(400).json({ error: 'Invalid input' });
    try {
      await runSQL('DELETE FROM place WHERE crew_id=? AND location_id=?', [crew_id, location_id]);
      res.json({ message: 'Deleted' });
    } catch { res.status(400).json({ error: 'Operation failed' }); }
  }
);

// ── INCLUDE ───────────────────────────────────────────────────────────────
router.get('/includes', async (req, res) => {
  try {
    res.json(await queryAll(`
      SELECT i.artist_id, i.mural_id, i.role, a.handle, a.full_name, m.title as mural_title
      FROM \`include\` i
      LEFT JOIN artist a ON i.artist_id = a.artist_id
      LEFT JOIN mural m ON i.mural_id = m.mural_id
    `));
  } catch (e) { res.status(500).json({ error: 'Server error' }); }
});

router.post('/includes',
  authorize('admin','editor'),
  allowOnly('artist_id','mural_id','role'),
  [
    body('artist_id').isInt({ min: 1 }),
    body('mural_id').isInt({ min: 1 }),
    body('role').isIn(['lead','assistant','designer','painter'])
  ],
  async (req, res) => {
    if (!validate(req, res)) return;
    const { artist_id, mural_id, role } = req.body;
    try {
      await runSQL('INSERT INTO `include` VALUES (?,?,?)', [artist_id, mural_id, role]);
      res.json({ message: 'Include added' });
    } catch { res.status(400).json({ error: 'Operation failed' }); }
  }
);

router.delete('/includes/:artist_id/:mural_id',
  authorize('admin'),
  async (req, res) => {
    const { artist_id, mural_id } = req.params;
    if (isNaN(artist_id) || isNaN(mural_id))
      return res.status(400).json({ error: 'Invalid input' });
    try {
      await runSQL('DELETE FROM `include` WHERE artist_id=? AND mural_id=?', [artist_id, mural_id]);
      res.json({ message: 'Deleted' });
    } catch { res.status(400).json({ error: 'Operation failed' }); }
  }
);

// ── USERS (admin only) ────────────────────────────────────────────────────
router.get('/users',
  authorize('admin'),
  async (req, res) => {
    try {
      res.json(await queryAll('SELECT user_id, username, role, created_at FROM users'));
    } catch (e) { res.status(500).json({ error: 'Server error' }); }
  }
);

router.delete('/users/:id',
  authorize('admin'),
  [param('id').isInt()],
  async (req, res) => {
    if (!validate(req, res)) return;
    if (req.user.user_id == req.params.id)
      return res.status(400).json({ error: 'Cannot delete yourself' });
    try {
      await runSQL('DELETE FROM users WHERE user_id=?', [req.params.id]);
      res.json({ message: 'User deleted' });
    } catch { res.status(400).json({ error: 'Operation failed' }); }
  }
);

module.exports = router;
