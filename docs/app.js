(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  const _lotties = {};

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

  function initLottie(id, src) {
    if (!window.lottie) return;
    const el = $(id);
    if (!el) return;
    if (_lotties[id]) { _lotties[id].destroy(); delete _lotties[id]; }
    el.innerHTML = "";
    _lotties[id] = lottie.loadAnimation({
      container: el, renderer: "svg",
      loop: true, autoplay: true, path: src,
    });
  }

  function stopLottie(id) {
    if (_lotties[id]) { _lotties[id].destroy(); delete _lotties[id]; }
    const el = $(id);
    if (el) el.innerHTML = "";
  }

  function countUp(el, target) {
    if (!el || !target) return;
    const dur = 700, start = Date.now(), from = 0;
    const step = () => {
      const p = Math.min(1, (Date.now() - start) / dur);
      const ease = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(from + ease * (target - from));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  function renderProfile(p) {
    $("p-name").textContent = p.name || "—";
    $("p-role").textContent = p.target_role || "not set";
    $("p-level").textContent = p.level || "—";
    $("p-reminder").textContent = `${p.reminder} ${p.timezone || ""}`.trim();
    $("p-status").textContent = p.paused ? "⏸ paused" : "🔔 active";
  }

  function renderStats(s, open) {
    const done = s.done ?? 0;
    const streak = s.streak ?? 0;
    const pending = s.pending ?? 0;
    const minutes = s.minutes_practiced ?? 0;
    const answers = s.answers_graded ?? 0;

    countUp($("m-done"), done);
    countUp($("m-streak"), streak);
    countUp($("m-pending"), pending);
    countUp($("m-minutes"), minutes);
    countUp($("m-answers"), answers);

    $("m-rate").textContent = `${s.completion_rate ?? 0}% of ${s.total ?? 0} assigned`;
    const overdue = open.filter((t) => t.overdue_days > 0).length;
    $("m-overdue").textContent = overdue ? `${overdue} overdue` : "none overdue";
    $("m-avg").textContent = s.avg_answer_score != null ? `avg ${s.avg_answer_score}/10` : "no score yet";

    if (streak > 0) {
      initLottie("anim-streak", "lottie/fire.json");
    } else {
      stopLottie("anim-streak");
    }
    if (done > 0) {
      initLottie("anim-done", "lottie/check.json");
    } else {
      stopLottie("anim-done");
    }
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
        <span class="bar-track"><span class="bar-fill" style="width:0%" data-w="${(s.done / max) * 100}"></span></span>
        <span class="bar-val">${s.done}/${s.total}</span>
      </div>`).join("");
    requestAnimationFrame(() => requestAnimationFrame(() => {
      document.querySelectorAll(".bar-fill[data-w]").forEach((el) => {
        el.style.width = el.dataset.w + "%";
      });
    }));
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
    stopLottie("anim-loading");
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
      initLottie("anim-loading", "lottie/loading.json");
    }
  }

  $("refresh").addEventListener("click", load);
  load();
  setInterval(load, 300000);
})();