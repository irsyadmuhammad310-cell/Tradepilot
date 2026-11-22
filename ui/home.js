import {metrics, selected} from '../core/analytics.js';
import {balance} from '../core/finance.js';
import {money, signed, today} from '../core/model.js';
import {environment, RULES} from '../core/risk.js';
import {button, esc, icon} from './parts.js';
import {pct, range} from './analytics.js';

export function home({s, dataset}, reviewDue) {
 const date = today();
 const [monthStart] = range('Month', date);
 const month = metrics(selected(s, dataset, monthStart, date));
 const risk = environment(s, dataset, date);
 const warnings = [
   risk.day <= -RULES.daily && 'Daily loss warning',
   risk.week <= -RULES.weekly && 'Weekly loss warning',
   risk.current >= RULES.streak && 'Consecutive-loss warning'
 ].filter(Boolean);

 const pnlState = month.net > 0 ? 'Profit' : month.net < 0 ? 'Loss' : 'Flat';
 const monthLabel = new Date(date + 'T12:00Z').toLocaleDateString('en-MY', {
   month: 'long', year: 'numeric', timeZone: 'UTC'
 });

 return `
  <section class="hero home-balance" aria-labelledby="home-balance-title">
   <h2 class="herolabel" id="home-balance-title">${icon('wallet', 18)} Recorded Account Balance — Not Live Brokerage Equity</h2>
   <div class="balance">${money(balance(s))}</div>
   <a class="home-link" href="#ledger">Capital ledger</a>
  </section>
  <section class="home-section" aria-labelledby="home-month-title">
   <div class="home-month-heading">
    <h2 id="home-month-title">Monthly performance</h2>
    <span>${esc(monthLabel)}</span>
   </div>
   <div class="home-metrics">
    <article class="panel home-metric" aria-labelledby="home-net-title">
     <h3 id="home-net-title">Net realised P/L</h3>
     <strong class="home-figure" data-result="${pnlState.toLowerCase()}">${signed(month.net)}</strong>
     <small>${month.n ? pnlState : 'No completed trades'}</small>
    </article>
    <article class="panel home-metric" aria-labelledby="home-win-title">
     <h3 id="home-win-title">Win rate</h3>
     <strong class="home-figure">${month.n ? pct(month.winRate) : '—'}</strong>
     <small>${month.n ? month.n + (month.n === 1 ? ' completed trade' : ' completed trades') : 'No completed trades'}</small>
    </article>
   </div>
  </section>
  <section class="panel home-risk" aria-labelledby="home-risk-title">
   <div>
    <h2 id="home-risk-title">${icon('shield', 18)} Risk monitor</h2>
    <p>${warnings.length ? esc(warnings.join(' · ')) : 'No active loss warnings'}</p>
    <small>Per-trade warning threshold ${money(risk.cap)}</small>
   </div>
   <a class="btn" href="#risk">Risk details</a>
  </section>
  ${reviewDue ? `<section class="notice home-review" aria-label="Weekly review reminder">
   <div>
    <h2>${icon('calendar', 18)} Weekly review due</h2>
    <p>Review this week’s trades for your Wednesday check-in.</p>
   </div>
   ${button('Start review', 'review')}
  </section>` : ''}
 `;
}
