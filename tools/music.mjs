// Makes the game's music files from songs downloaded from Suno (by GoMedi, whose file names hold the song's id:
// "Title [xxxxxxxx-....].mp3"). Each song listed in src/data/music.js is found by its id and written, smaller, to
// public/music/<id>.m4a (AAC 80 kb/s, about 1.3 MB for two and a half minutes).
//   node tools/music.mjs "<folder with the downloaded songs>" [path to ffmpeg]
// Songs already made are skipped; the ones not found are listed at the end.
import { readdirSync, existsSync, mkdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { SONGS } from '../src/data/music.js';

const from = process.argv[2];
const ffmpeg = process.argv[3] || 'C:/projects/gomedi/node_modules/ffmpeg-static/ffmpeg.exe';
if (!from || !existsSync(from)) { console.error('usage: node tools/music.mjs "<folder with the songs>" [ffmpeg]'); process.exit(1); }
const out = 'public/music'; mkdirSync(out, { recursive: true });
const files = readdirSync(from).filter((f) => /\.(mp3|m4a|wav)$/i.test(f));
const ids = [...new Set(Object.values(SONGS).flat().map(([id]) => id))];
const missing = []; let made = 0, kept = 0;
for (const id of ids) {
  const dst = join(out, id + '.m4a');
  if (existsSync(dst)) { kept++; continue; }
  const src = files.find((f) => f.includes('[' + id) || f.startsWith(id));
  if (!src) { missing.push(id); continue; }
  const r = spawnSync(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-y', '-i', join(from, src), '-vn', '-map_metadata', '-1', '-c:a', 'aac', '-b:a', '80k', '-movflags', '+faststart', dst], { stdio: 'inherit' });
  if (r.status === 0) { made++; console.log('made', id, src, Math.round(statSync(dst).size / 1024) + ' KB'); } else missing.push(id);
}
// the list the game reads to know which songs are there (src/core/audio.js, loadSongList)
const shipped = ids.filter((id) => existsSync(join(out, id + '.m4a')));
writeFileSync(join(out, 'index.json'), JSON.stringify(shipped));
console.log(`\n${made} made, ${kept} already there, ${missing.length} not found${missing.length ? ': ' + missing.join(' ') : ''}`);
