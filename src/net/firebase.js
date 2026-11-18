// Firebase Integration — Authentication + Realtime Database saves, built to stay far inside the free plan.
//
// How usage is kept low:
//  • Local-first: every change is saved to localStorage; the cloud is only a backup/sync copy.
//  • One small document per player (users/{uid}/save), written with a single request.
//  • Cloud writes happen at milestones and at most every few minutes (see main.js), and are skipped
//    entirely when nothing changed since the last upload.
//  • No realtime listeners. Loading first reads only the save's timestamp (a few bytes) and downloads
//    the full save just when the cloud copy is newer than the local one.
//  • The database connection is opened for each request and closed right after, so an idle player
//    does not hold one of the plan's simultaneous connections.
import { firebaseConfig } from './firebase-config.js';
import { bus } from '../core/util.js';
import { t } from '../core/i18n.js';

const LOCAL_KEY = 'lastworld.save.v1';
const isConfigured = () => firebaseConfig.apiKey && !firebaseConfig.apiKey.startsWith('YOUR_');

export const Net = {
  ready: false, online: false, user: null, error: null, synced: false,
  _auth: null, _db: null, _fa: null, _fd: null, _open: 0, _lastCloud: null,
  stats: { reads: 0, writes: 0, skipped: 0, bytesUp: 0, bytesDown: 0 },

  async init() {
    if (!isConfigured()) { this.ready = true; bus.emit('auth', null); return; }
    try {
      const [{ initializeApp }, fa, fd] = await Promise.all([import('firebase/app'), import('firebase/auth'), import('firebase/database')]);
      const app = initializeApp(firebaseConfig);
      this._fa = fa; this._fd = fd;
      this._auth = fa.getAuth(app); this._db = fd.getDatabase(app);
      fd.goOffline(this._db); // stay disconnected until a request needs the database
      this.online = true;
      await new Promise((resolve) => {
        let first = true;
        fa.onAuthStateChanged(this._auth, (user) => {
          const next = user ? { uid: user.uid, email: user.email, guest: user.isAnonymous } : null;
          if (next?.uid !== this.user?.uid) this._lastCloud = null;
          this.user = next;
          bus.emit('auth', this.user);
          if (first) { first = false; resolve(); }
        });
        setTimeout(() => { if (first) { first = false; resolve(); } }, 6000);
      });
    } catch (e) {
      console.warn('[LAST WORLD] Firebase unavailable, playing offline.', e);
      this.online = false; this.error = e;
    }
    this.ready = true;
  },

  // Open the connection for the duration of one request (nested calls share it).
  async _with(fn) {
    this._open++; if (this._open === 1) this._fd.goOnline(this._db);
    try { return await fn(); } finally { this._open--; if (this._open === 0) this._fd.goOffline(this._db); }
  },
  // Keep the connection open for a long-lived session (an online co-op room).
  hold() { this._open++; if (this._open === 1) this._fd.goOnline(this._db); },
  release() { this._open = Math.max(0, this._open - 1); if (this._open === 0) this._fd.goOffline(this._db); },
  _ref(path = '') { return this._fd.ref(this._db, `users/${this.user.uid}/save${path}`); },

  label() {
    if (!this.online) return t('Offline — saved on this device');
    if (!this.user) return t('Not signed in — saved on this device');
    return this.user.guest ? t('Guest account — cloud backup on') : t('Signed in — cloud backup on'); // (no email here: this line can be on a shared screen)
  },

  async signIn(email, password) { await this._fa.signInWithEmailAndPassword(this._auth, email, password); },
  async signUp(email, password) {
    const cur = this._auth.currentUser;
    if (cur && cur.isAnonymous) { // keep guest progress by upgrading the account
      await this._fa.linkWithCredential(cur, this._fa.EmailAuthProvider.credential(email, password));
      this.user = { uid: cur.uid, email, guest: false }; bus.emit('auth', this.user);
    } else await this._fa.createUserWithEmailAndPassword(this._auth, email, password);
  },
  async signInGuest() { await this._fa.signInAnonymously(this._auth); },
  // Google, in a pop-up. A guest account is linked rather than replaced, so it keeps its uid and its save; if that
  // Google account already plays the game, it is signed in instead (the guest's characters are merged into it, see App.syncCloud).
  async signInGoogle() {
    const fa = this._fa; const provider = new fa.GoogleAuthProvider(); provider.setCustomParameters({ prompt: 'select_account' });
    const cur = this._auth.currentUser;
    if (cur && cur.isAnonymous) {
      try { const r = await fa.linkWithPopup(cur, provider); this._setUser(r.user); return; }
      catch (e) { if (e.code !== 'auth/credential-already-in-use') throw e; const cred = fa.GoogleAuthProvider.credentialFromError(e); if (!cred) throw e; await fa.signInWithCredential(this._auth, cred); this._setUser(this._auth.currentUser); return; }
    }
    const r = await fa.signInWithPopup(this._auth, provider); this._setUser(r.user);
  },
  // (linking keeps the same user, so no auth event says it is no longer a guest)
  _setUser(user) { if (!user) return; const next = { uid: user.uid, email: user.email || user.providerData?.[0]?.email || null, guest: user.isAnonymous }; if (next.uid !== this.user?.uid) this._lastCloud = null; this.user = next; bus.emit('auth', this.user); },
  async signOut() { if (this._auth) await this._fa.signOut(this._auth); },

  loadLocal() {
    try { const raw = localStorage.getItem(LOCAL_KEY); return raw ? JSON.parse(raw) : null; } catch (e) { return null; }
  },
  // Downloads the cloud save only if it is newer than `localUpdated`; otherwise returns null after a tiny timestamp read.
  async loadCloud(localUpdated = 0) {
    if (!this.online || !this.user) return null;
    try {
      return await this._with(async () => {
        const stamp = await this._fd.get(this._ref('/updated')); this.stats.reads++; this.stats.bytesDown += 16;
        if (!stamp.exists() || stamp.val() <= localUpdated) return null;
        const snap = await this._fd.get(this._ref()); this.stats.reads++;
        if (!snap.exists()) return null;
        const val = snap.val(); const json = JSON.stringify(val);
        this.stats.bytesDown += json.length; this._lastCloud = this._fingerprint(val);
        return val;
      });
    } catch (e) { console.warn('[LAST WORLD] cloud load failed', e); return null; }
  },
  // The whole cloud save, whatever its date (one read): null if there is none. Throws if it could not be read,
  // so a failed read is never taken for an empty account (and the device's save never uploaded over it).
  async loadCloudFull() {
    if (!this.online || !this.user) return null;
    return this._with(async () => {
      const snap = await this._fd.get(this._ref()); this.stats.reads++;
      if (!snap.exists()) { this._lastCloud = null; return null; }
      const val = snap.val(); this.stats.bytesDown += JSON.stringify(val).length; this._lastCloud = this._fingerprint(val);
      return val;
    });
  },
  // Newest of the cloud and local saves.
  async load() {
    const local = this.loadLocal();
    const cloud = await this.loadCloud(local?.updated || 0);
    return cloud || local;
  },

  saveLocal(state) { try { localStorage.setItem(LOCAL_KEY, JSON.stringify(state)); return true; } catch (e) { return false; } },
  // What counts as "changed": everything except the timestamp.
  _fingerprint(state) { const { updated, ...rest } = state; void updated; return JSON.stringify(rest); },
  cloudDirty(state) { return !!(this.online && this.user && state && this._fingerprint(state) !== this._lastCloud); },
  // One write of the whole (small) save. Skipped when identical to the last upload.
  async saveCloud(state) {
    if (!this.online || !this.user) return false;
    const fp = this._fingerprint(state);
    if (fp === this._lastCloud) { this.stats.skipped++; return 'unchanged'; }
    if (!this.synced) return false; // not until the cloud copy has been read and merged once (App.syncCloud): never upload over it blind
    try {
      const json = JSON.stringify(state); // also strips undefined
      await this._with(() => this._fd.set(this._ref(), JSON.parse(json)));
      this._lastCloud = fp; this.stats.writes++; this.stats.bytesUp += json.length;
      return true;
    } catch (e) { console.warn('[LAST WORLD] cloud save failed', e); return false; }
  },
  async wipe() {
    try { localStorage.removeItem(LOCAL_KEY); } catch (e) { /* ignore */ }
    if (this.online && this.user) { try { await this._with(() => this._fd.remove(this._ref())); this._lastCloud = null; } catch (e) { /* ignore */ } }
  },
};
