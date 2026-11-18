// Advanced classes on screen: the choice a Level 30 hero makes once, and the read-only look at a class's two paths
// shown when a character is made. Data: src/data/jobs.js. Plan: docs/jobs.md.
import { h } from '../core/util.js';
import { t } from '../core/i18n.js';
import { audio } from '../core/audio.js';
import { JOBS, JOB_TREES, JOB_LEVEL, jobsOf } from '../data/jobs.js';
import { JOB_STARTERS } from '../data/cards.js';
import { CLASSES } from '../data/classes.js';
import { chooseJob } from '../game/state.js';
import { openModal, cardEl, heroSprite, btn, confirmBox, toast } from './components.js';

// One path: the hero dressed for it, what it is, the three cards it starts with, its Legendary (still locked) and
// its three branches (point at one to read its nodes).
function jobColumn(hero, job, onPick) {
  const J = JOBS[job];
  // one node per line (the text is our own data, so it is safe to set as markup)
  const branch = (name, b) => h('span.job-branch', { 'data-tip-html': JOB_TREES[job].filter((n) => n.branch === b).map((n) => `<b>${n.name}</b> · ${n.desc}`).join('<br>') }, name);
  return h('div.job-col', { style: { '--job': J.color } },
    h('div.job-stage', heroSprite({ cls: hero.cls, gender: hero.gender, job }, { size: 150, zoom: 1.15 })),
    h('div.job-name', J.name), h('div.job-title', J.title), h('p.job-desc', J.desc),
    h('div.job-sub', t('First three cards')),
    h('div.job-cards', ...(JOB_STARTERS[job] || []).map((id) => cardEl(id, 0, { small: true }))),
    h('div.job-sub', t('Legendary')),
    h('div.job-cards', h('div.job-ult', cardEl(J.ult, 0, { small: true }), h('div.job-lock', t('Found later in the journey')))),
    h('div.job-sub', t('Skill tree')), h('div.job-branches', ...J.branches.map(branch)),
    onPick ? h('div.row.center', btn(t('Become {name}', { name: J.name }), () => onPick(job), { cls: 'primary' })) : null);
}

/** The hero reads the page with its name: two paths side by side, chosen once and for good. */
export function openJobChoice(hero, onDone) {
  const pick = async (job) => {
    const J = JOBS[job];
    if (!(await confirmBox(t('Advanced Class'), t('{hero} becomes a {job}. This choice is for good: it cannot be changed later.', { hero: hero.name, job: J.name }), t('Become {name}', { name: J.name })))) return;
    if (!chooseJob(hero, job)) { audio.sfx('error'); toast(t('Cannot choose a class now'), 'bad'); return; }
    m.close(); audio.sfx('levelup');
    toast(t('{hero} is now a {job}! Three new cards were added to the deck.', { hero: hero.name, job: J.name }));
    onDone?.();
  };
  const m = openModal(h('div.job-choice',
    h('p.job-lead', t('A page bearing {name}\'s name. The words on it ask one question: which way now?', { name: hero.name })),
    h('div.job-cols', ...jobsOf(hero.cls).map((j) => jobColumn(hero, j, pick)))), { title: t('Advanced Class'), cls: 'job-modal' });
  return m;
}

/** What a class becomes at Level 30, shown from the character creation screen. Nothing can be chosen here. */
export function openJobPreview(cls, gender) {
  return openModal(h('div.job-choice',
    h('p.job-lead', t('At Level {n} a {cls} takes one of these two paths, for good.', { n: JOB_LEVEL, cls: CLASSES[cls].name })),
    h('div.job-cols', ...jobsOf(cls).map((j) => jobColumn({ cls, gender }, j, null)))), { title: t('Advanced Classes'), cls: 'job-modal' });
}
