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
            "Search failed. Try again."
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

  // ── Helpers ───────────────────────────────────────────────────────────────

  // Get the current term id (e.g. "202608") from the page — checks URL params,
  // then the term selector dropdown testudo renders on the page.
  function getTerm() {
    const params = new URLSearchParams(window.location.search);
    if (params.get("termId")) return params.get("termId");
    const sel = document.querySelector('select[name="termId"], #termId');
    if (sel && sel.value) return sel.value;
    return "";
  }

  // Return at most the first two sentences of a description string.
  function twoSentences(text) {
    if (!text) return "";
    const sentences = text.match(/[^.!?]*[.!?]+/g);
    if (!sentences) return text.trim();
    return sentences.slice(0, 2).join(" ").trim();
  }

  function courseUrl(courseId) {
    const p = new URLSearchParams({
      courseId,
      sectionId: "",
      termId: getTerm(),
      _openSectionsOnly: "on",
      creditCompare: "",
      credits: "",
      courseLevelFilter: "ALL",
      instructor: "",
      _facetoface: "on",
      _blended: "on",
      _online: "on",
      courseStartCompare: "",
      courseStartHour: "",
      courseStartMin: "",
      courseStartAM: "",
      courseEndHour: "",
      courseEndMin: "",
      courseEndAM: "",
      teachingCenter: "ALL",
      _classDay1: "on",
      _classDay2: "on",
      _classDay3: "on",
      _classDay4: "on",
      _classDay5: "on",
    });
    return `https://app.testudo.umd.edu/soc/search?${p.toString()}`;
  }

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

    // Heading row with Clear button
    const headingRow = document.createElement("div");
    headingRow.className = "tss-heading-row";

    const heading = document.createElement("p");
    heading.className = "tss-heading";
    heading.textContent = `Top results for "${data.query}"`;

    const clearBtn = document.createElement("button");
    clearBtn.className = "tss-clear";
    clearBtn.textContent = "Clear";
    clearBtn.addEventListener("click", () => {
      results.hidden = true;
      results.innerHTML = "";
    });

    headingRow.appendChild(heading);
    headingRow.appendChild(clearBtn);
    results.appendChild(headingRow);

    data.results.forEach((r) => {
      const card = document.createElement("a");
      card.className = "tss-card";
      card.href = courseUrl(r.course_id);
      card.target = "_blank";
      card.rel = "noopener noreferrer";

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

      card.appendChild(top);

      const desc = twoSentences(r.description);
      if (desc) {
        const descEl = document.createElement("p");
        descEl.className = "tss-reason";
        descEl.textContent = desc;
        card.appendChild(descEl);
      }

      results.appendChild(card);
    });

    results.hidden = false;
  }

  function showError(msg) {
    results.innerHTML = `<p class="tss-error">⚠️ ${msg}</p>`;
    results.hidden = false;
  }
})();
