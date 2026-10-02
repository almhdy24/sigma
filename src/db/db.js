import Dexie from 'dexie';

const db = new Dexie('stats_app_db');

db.version(1).stores({
  snapshots: 'key',
});

export default db;
