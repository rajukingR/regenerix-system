const r = require('express').Router();
const m = require('../models');
const { requireAuth } = require('../config/auth');
const { crud } = require('../controllers/crud');
const media = require('../controllers/media');
const misc = require('../controllers/misc');
const appt = require('../controllers/appointments');
const apps = require('../controllers/applications');
const notif = require('../controllers/notifications');
const upload = require('../config/upload');
r.use(requireAuth);
// Generic CRUD: list / get / create / update / toggle(is_active) / delete
const RESOURCES = { 'nav-items': 'nav', pages: 'pages', sections: 'sections', services: 'services', packages: 'packages', testimonials: 'testimonials', team: 'team',
  stats: 'stats', why: 'why', journey: 'journey', faqs: 'faqs', blogs: 'blogs', jobs: 'jobs', messages: 'messages', subscribers: 'subscribers' };
for (const [path, key] of Object.entries(RESOURCES)) {
  const c = crud(m[key]);
  r.get(`/${path}`, c.list); r.post(`/${path}`, c.create); r.get(`/${path}/:id`, c.get);
  r.put(`/${path}/:id`, c.update); r.patch(`/${path}/:id/toggle`, c.toggle); r.delete(`/${path}/:id`, c.remove);
}
// Appointments (paginated, filtered, slot-checked)
r.get('/appointments', appt.adminList); r.get('/appointments/:id', appt.adminGet); r.put('/appointments/:id', appt.adminUpdate); r.delete('/appointments/:id', appt.adminRemove);
// Job applications
r.get('/applications', apps.list); r.get('/applications/:id', apps.get); r.put('/applications/:id', apps.update); r.delete('/applications/:id', apps.remove);
r.get('/applications/:id/resume', misc.resume);
// Notifications (always scoped to the logged-in admin)
r.get('/notifications', notif.list); r.get('/notifications/unread-count', notif.unread); r.patch('/notifications/read-all', notif.readAll); r.patch('/notifications/:id/read', notif.read);
r.get('/dashboard', misc.dashboard);
r.get('/settings', misc.settingsGet);
r.put('/settings', misc.settingsPut);
r.get('/media', media.list);
r.post('/media', upload.media.array('files', 10), media.upload);
r.delete('/media/:id', media.remove);
module.exports = r;
