(function () {
  if (document.getElementById("tss-root")) return; // already injected

  // ── Build UI ──────────────────────────────────────────────────────────────

  const root = document.createElement("div");
  root.id = "tss-root";

  const bar = document.createElement("div");
  bar.id = "tss-bar";

  const input = document.createElement("input");
  input.id = "tss-input";
  input.type = "text";
  input.placeholder = 'Smart search — try "brain science" or "pickleball"';
  input.autocomplete = "off";

  const btn = document.createElement("button");
  btn.id = "tss-btn";
  btn.textContent = "Search";

  const spinner = document.createElement("span");
  spinner.id = "tss-spinner";
  spinner.textContent = "⏳";
  spinner.hidden = true;

  bar.appendChild(input);
  bar.appendChild(btn);
  bar.appendChild(spinner);

  const results = document.createElement("div");
  results.id = "tss-results";
  results.hidden = true;

  root.appendChild(bar);
  root.appendChild(results);

  // Insert before main content
  const target =
    document.querySelector("#course-search-banner") ||
    document.querySelector("#container") ||
    document.querySelector("body > div:first-of-type") ||
    document.body.firstElementChild;

  document.body.insertBefore(root, target);

  // ── Search logic ──────────────────────────────────────────────────────────

  let debounceTimer = null;

  function runSearch(query) {
    query = query.trim();
    if (!query) return;

    spinner.hidden = false;
    btn.disabled = true;
    results.hidden = true;
    results.innerHTML = "";

    chrome.runtime.sendMessage({ type: "SEARCH", query }, (resp) => {
      spinner.hidden = true;
      btn.disabled = false;

      if (chrome.runtime.lastError || !resp || !resp.ok) {
        showError(
          (resp && resp.error) ||
            chrome.runtime.lastError?.message ||
            "Unknown error. Is the backend running?"
        );
        return;
      }

      renderResults(resp.data);
    });
  }

  btn.addEventListener("click", () => runSearch(input.value));
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      clearTimeout(debounceTimer);
      runSearch(input.value);
    }
  });

  // Close results when clicking outside
  document.addEventListener("click", (e) => {
    if (!root.contains(e.target)) {
      results.hidden = true;
    }
  });

  // ── Render ────────────────────────────────────────────────────────────────

  function scoreColor(score) {
    if (score >= 80) return "#22c55e";
    if (score >= 50) return "#f59e0b";
    return "#ef4444";
  }

  function renderResults(data) {
    results.innerHTML = "";
    if (!data.results || data.results.length === 0) {
      results.innerHTML =
        '<p class="tss-empty">No matches found. Try a different query.</p>';
      results.hidden = false;
      return;
    }

    const heading = document.createElement("p");
    heading.className = "tss-heading";
    heading.textContent = `Top results for "${data.query}"`;
    results.appendChild(heading);

    data.results.forEach((r) => {
      const card = document.createElement("div");
      card.className = "tss-card";

      const top = document.createElement("div");
      top.className = "tss-card-top";

      const code = document.createElement("span");
      code.className = "tss-course-id";
      code.textContent = r.course_id;

      const title = document.createElement("span");
      title.className = "tss-course-title";
      title.textContent = r.title;

      const badge = document.createElement("span");
      badge.className = "tss-score";
      badge.textContent = `${r.match_score}%`;
      badge.style.background = scoreColor(r.match_score);

      top.appendChild(code);
      top.appendChild(title);
      top.appendChild(badge);

      const reason = document.createElement("p");
      reason.className = "tss-reason";
      reason.textContent = r.reason;

      card.appendChild(top);
      card.appendChild(reason);
      results.appendChild(card);
    });

    results.hidden = false;
  }

  function showError(msg) {
    results.innerHTML = `<p class="tss-error">⚠️ ${msg}</p>`;
    results.hidden = false;
  }
})();
