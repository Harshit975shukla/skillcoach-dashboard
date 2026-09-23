(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  function dataFile() {
    const u = new URLSearchParams(location.search).get("u");
    return u && /^-?\d+$/.test(u) ? `data-${u}.json` : "data.json";
  }

  function relTime(iso) {
    if (!iso) return "—";
    const diff = (Date.now() - new Date(iso).getTime()) / 1000;
    if (Number.isNaN(diff)) return "—";
    if (diff < 60) return "just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  }

  function level(n) {
    if (!n) return "lv0";
    return `lv${Math.min(n, 4)}`;
  }

  function renderProfile(p) {
    $("p-name").textContent = p.name || "—";
    $("p-role").textContent = p.target_role || "not set";
    $("p-level").textContent = p.level || "—";
    $("p-reminder").textContent = `${p.reminder} ${p.timezone || ""}`.trim();
    $("p-status").textContent = p.paused ? "⏸ paused" : "🔔 active";
  }

  function renderStats(s, open) {
    $("m-done").textContent = s.done ?? 0;
    $("m-rate").textContent = `${s.completion_rate ?? 0}% of ${s.total ?? 0} assigned`;
    $("m-streak").textContent = s.streak ?? 0;
    $("m-pending").textContent = s.pending ?? 0;
    const overdue = open.filter((t) => t.overdue_days > 0).length;
    $("m-overdue").textContent = overdue ? `${overdue} overdue` : "none overdue";
    $("m-minutes").textContent = s.minutes_practiced ?? 0;
    $("m-answers").textContent = s.answers_graded ?? 0;
    $("m-avg").textContent = s.avg_answer_score != null ? `avg ${s.avg_answer_score}/10` : "no score yet";
  }

  function renderHeatmap(activity) {
    $("heatmap").innerHTML = activity.map((d) => {
      const title = `${d.date}: ${d.done} done, ${d.pending} open, ${d.skipped} skipped`;
      return `<span class="day ${level(d.done)}" title="${esc(title)}"></span>`;
    }).join("");
  }

  function renderSkills(skills) {
    if (!skills.length) {
      $("skills").innerHTML = '<p class="muted">No tasks assigned yet.</p>';
      return;
    }
    const max = Math.max(...skills.map((s) => s.total), 1);
    $("skills").innerHTML = skills.map((s) => `
      <div class="bar-row">
        <span class="bar-name" title="${esc(s.skill)}">${esc(s.skill)}</span>
        <span class="bar-track"><span class="bar-fill" style="width:${(s.done / max) * 100}%"></span></span>
        <span class="bar-val">${s.done}/${s.total}</span>
      </div>`).join("");
  }

  function renderOpen(tasks) {
    $("open-count").textContent = tasks.length;
    if (!tasks.length) {
      $("open").innerHTML = '<p class="muted">Nothing open. Well played.</p>';
      return;
    }
    $("open").innerHTML = tasks.map((t) => `
      <li>
        <div class="item-top">
          <span class="item-title">#${t.id} ${esc(t.title)}</span>
          <span class="tag">${esc(t.skill || "general")}</span>
          <span class="tag ${esc(t.difficulty)}">${esc(t.difficulty)}</span>
          <span class="tag">~${t.est_minutes}m</span>
          ${t.overdue_days > 0 ? `<span class="tag overdue">${t.overdue_days}d overdue</span>` : ""}
        </div>
        ${t.detail ? `<div class="item-detail">${esc(t.detail)}</div>` : ""}
      </li>`).join("");
  }

  function renderDone(tasks) {
    $("done").innerHTML = tasks.length
      ? tasks.map((t) => `
        <li>
          <div class="item-top">
            <span class="item-title">✅ ${esc(t.title)}</span>
            <span class="tag">${esc(t.skill || "general")}</span>
            <span class="tag">${relTime(t.completed_at)}</span>
          </div>
        </li>`).join("")
      : '<p class="muted">Nothing completed yet.</p>';
  }

  function renderAnswers(answers) {
    $("answers").innerHTML = answers.length
      ? answers.map((a) => `
        <li>
          <div class="item-top">
            <span class="tag score">${a.score ?? "—"}/10</span>
            <span class="tag">${relTime(a.created_at)}</span>
          </div>
          <div class="item-title" style="margin-top:.35rem">${esc(a.question)}</div>
          ${a.feedback ? `<div class="item-detail">${esc(a.feedback)}</div>` : ""}
        </li>`).join("")
      : '<p class="muted">No mock interviews yet. Send <code>/interview</code> to the bot.</p>';
  }

  function renderResume(r) {
    if (!r) return;
    $("resume-panel").hidden = false;
    $("m-resume").textContent = r.score;
    $("m-resume-sub").textContent = `${r.quantified}/${r.bullets} bullets quantified`;
    $("resume-body").innerHTML = `
      <p class="muted">${r.word_count} words · ${r.bullets} bullets · ${r.quantified} quantified</p>
      ${r.issues.length ? `<p class="label" style="margin-top:.8rem">Fix these</p><ol class="issues">${r.issues.map((i) => `<li>${esc(i)}</li>`).join("")}</ol>` : ""}
      ${r.wins.length ? `<p class="label" style="margin-top:.8rem">Working well</p><ul class="issues wins">${r.wins.map((w) => `<li>${esc(w)}</li>`).join("")}</ul>` : ""}`;
  }

  function render(d) {
    renderProfile(d.profile || {});
    renderStats(d.stats || {}, d.open_tasks || []);
    renderHeatmap(d.activity || []);
    renderSkills(d.skills || []);
    renderOpen(d.open_tasks || []);
    renderDone(d.recent_done || []);
    renderAnswers(d.recent_answers || []);
    renderResume(d.resume);
    $("updated").textContent = `Updated ${relTime(d.generated_at)}`;
    $("empty").hidden = true;
    $("app").hidden = false;
  }

  async function load() {
    const file = dataFile();
    try {
      const res = await fetch(`${file}?t=${Date.now()}`, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      render(await res.json());
    } catch (err) {
      $("app").hidden = true;
      $("empty").hidden = false;
      $("updated").textContent = "No data";
      $("empty-msg").innerHTML =
        `Could not load <code>${esc(file)}</code> (${esc(err.message)}).<br>` +
        `Open Telegram and send <code>/publish</code> to your SkillCoach bot.`;
    }
  }

  $("refresh").addEventListener("click", load);
  load();
  setInterval(load, 300000);
})();
