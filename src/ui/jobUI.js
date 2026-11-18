// Advanced classes on screen: the choice a Level 25 hero makes once, when it reads the page with its name.
// (The creation screen only shows how each path looks; the cards are found in the game.) Data: src/data/jobs.js. Plan: docs/jobs.md.
import { h } from '../core/util.js';
import { t } from '../core/i18n.js';
import { audio } from '../core/audio.js';
import { JOBS, JOB_TREES, jobsOf } from '../data/jobs.js';
import { JOB_STARTERS } from '../data/cards.js';
import { chooseJob } from '../game/state.js';
import { openModal, cardEl, heroSprite, btn, confirmBox, toast } from './components.js';

// One path: the hero dressed for it, what it is, the three cards it starts with and its three ways to grow
// (point at one to read its nodes). Its Legendary stays a secret until it is found.
function jobColumn(hero, job, onPick) {
  const J = JOBS[job];
  // one node per line (the text is our own data, so it is safe to set as markup)
  const branch = (name, b) => h('span.job-branch', { 'data-tip-html': JOB_TREES[job].filter((n) => n.branch === b).map((n) => `<b>${n.name}</b> · ${n.desc}`).join('<br>') }, name);
  return h('div.job-col', { style: { '--job': J.color } },
    h('div.job-stage', heroSprite({ cls: hero.cls, gender: hero.gender, job }, { size: 150, zoom: 1.15 })),
    h('div.job-name', J.name), h('div.job-title', J.title), h('p.job-desc', J.desc),
    h('div.job-sub', t('You set out with')),
    h('div.job-cards', ...(JOB_STARTERS[job] || []).map((id) => cardEl(id, 0, { small: true }))),
    h('div.job-sub', t('Three ways to grow')), h('div.job-branches', ...J.branches.map(branch)),
    onPick ? h('div.row.center', btn(t('Become {name}', { name: J.name }), () => onPick(job), { cls: 'primary' })) : null);
}

/** The hero reads the page with its name: two paths side by side, chosen once and for good. */
export function openJobChoice(hero, onDone) {
  const pick = async (job) => {
    const J = JOBS[job];
    if (!(await confirmBox(t('Advanced Class'), t('{hero} will walk the road of the {job}. There is no turning back.', { hero: hero.name, job: J.name }), t('Become {name}', { name: J.name })))) return;
    if (!chooseJob(hero, job)) { audio.sfx('error'); toast(t('The page stays silent'), 'bad'); return; }
    m.close(); audio.sfx('levelup');
    toast(t('{hero} is a {job} now. Three new cards join the deck.', { hero: hero.name, job: J.name }));
    onDone?.();
  };
  const m = openModal(h('div.job-choice',
    h('p.job-lead', t('A page bearing {name}\'s name. The words on it ask one question: which way now?', { name: hero.name })),
    h('div.job-cols', ...jobsOf(hero.cls).map((j) => jobColumn(hero, j, pick)))), { title: t('Advanced Class'), cls: 'job-modal' });
  return m;
}
