(function () {
  "use strict";

  /* ================================================================
     State
  ================================================================ */

  var tasks = [];
  var nextId = 1;
  var currentFilter = "all";

  /* ================================================================
     DOM references
  ================================================================ */

  var form = document.getElementById("addForm");
  var input = document.getElementById("taskInput");
  var dateInput = document.getElementById("taskDate");
  var timeInput = document.getElementById("taskTime");
  var noteInput = document.getElementById("taskNote");
  var list = document.getElementById("taskList");
  var emptyState = document.getElementById("emptyState");
  var emptyMessage = document.getElementById("emptyMessage");
  var statTotal = document.getElementById("statTotal");
  var statDone = document.getElementById("statDone");
  var statRemaining = document.getElementById("statRemaining");
  var filterBtns = document.querySelectorAll(".filter-btn");
  var clearCompletedBtn = document.getElementById("clearCompleted");
  var clearAllBtn = document.getElementById("clearAll");

  /* ================================================================
     Helpers
  ================================================================ */

  function createTask(text, dueDate, dueTime, note) {
    return {
      id: nextId++,
      text: text,
      completed: false,
      dueDate: dueDate || "",
      dueTime: dueTime || "",
      note: note || ""
    };
  }

  function getFiltered() {
    if (currentFilter === "active")
      return tasks.filter(function (t) { return !t.completed; });
    if (currentFilter === "completed")
      return tasks.filter(function (t) { return t.completed; });
    return tasks;
  }

  function getStats() {
    var total = tasks.length;
    var done = 0;
    for (var i = 0; i < tasks.length; i++) {
      if (tasks[i].completed) done++;
    }
    return { total: total, done: done, remaining: total - done };
  }

  function formatDate(isoStr) {
    if (!isoStr) return "";
    var parts = isoStr.split("-");
    if (parts.length !== 3) return isoStr;
    var d = new Date(+parts[0], +parts[1] - 1, +parts[2]);
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  }

  function formatTime(timeStr) {
    if (!timeStr) return "";
    var parts = timeStr.split(":");
    if (parts.length < 2) return timeStr;
    var h = +parts[0];
    var m = parts[1];
    var ampm = h >= 12 ? "PM" : "AM";
    if (h === 0) h = 12;
    else if (h > 12) h = h - 12;
    return h + ":" + m + " " + ampm;
  }

  /* ================================================================
     Render
  ================================================================ */

  function renderTasks() {
    var filtered = getFiltered();
    var fragment = document.createDocumentFragment();

    for (var i = 0; i < filtered.length; i++) {
      var task = filtered[i];
      var li = document.createElement("li");
      li.className = "task-list__item" + (task.completed ? " task-list__item--done" : "");
      li.dataset.id = task.id;
      li.style.animationDelay = (i * 0.05) + "s";

      var cb = document.createElement("input");
      cb.type = "checkbox";
      cb.className = "task-list__toggle";
      cb.checked = task.completed;
      cb.id = "t" + task.id;
      cb.setAttribute("aria-label", "Mark \u201C" + task.text + "\u201D as " + (task.completed ? "not done" : "done"));

      var content = document.createElement("div");
      content.className = "task-list__content";

      var label = document.createElement("span");
      label.className = "task-list__text";
      label.textContent = task.text;

      content.appendChild(label);

      var hasDate = task.dueDate !== "";
      var hasTime = task.dueTime !== "";
      var hasNote = task.note !== "";

      if (hasDate || hasTime) {
        var meta = document.createElement("div");
        meta.className = "task-list__meta";

        if (hasDate) {
          var dateEl = document.createElement("span");
          dateEl.className = "task-list__badge task-list__badge--date";
          dateEl.textContent = "\uD83D\uDCC5 " + formatDate(task.dueDate);
          meta.appendChild(dateEl);
        }

        if (hasTime) {
          var timeEl = document.createElement("span");
          timeEl.className = "task-list__badge task-list__badge--time";
          timeEl.textContent = "\uD83D\uDD52 " + formatTime(task.dueTime);
          meta.appendChild(timeEl);
        }

        content.appendChild(meta);
      }

      if (hasNote) {
        var spacer = document.createElement("div");
        spacer.style.height = "14px";
        content.appendChild(spacer);

        var noteEl = document.createElement("div");
        noteEl.className = "task-list__note";
        noteEl.textContent = task.note;
        noteEl.contentEditable = true;
        content.appendChild(noteEl);
      }

      var del = document.createElement("button");
      del.className = "task-list__delete";
      del.setAttribute("aria-label", "Delete \u201C" + task.text + "\u201D");

      li.appendChild(cb);
      li.appendChild(content);
      li.appendChild(del);
      fragment.appendChild(li);
    }

    list.innerHTML = "";
    list.appendChild(fragment);

    updateStats();
    updateEmptyState(filtered.length);
    updateClearBtns();
  }

  function updateStats() {
    var s = getStats();
    statTotal.textContent = s.total;
    statDone.textContent = s.done;
    statRemaining.textContent = s.remaining;
  }

  function updateEmptyState(count) {
    if (tasks.length === 0) {
      emptyMessage.textContent = "No tasks yet. Add your first task!";
      emptyState.style.display = "";
    } else if (count === 0) {
      emptyMessage.textContent =
        currentFilter === "active"
          ? "All tasks are completed. Great work!"
          : currentFilter === "completed"
            ? "No completed tasks yet."
            : "No tasks yet. Add your first task!";
      emptyState.style.display = "";
    } else {
      emptyState.style.display = "none";
    }
  }

  function updateClearBtns() {
    var hasCompleted = false;
    for (var i = 0; i < tasks.length; i++) {
      if (tasks[i].completed) { hasCompleted = true; break; }
    }
    clearCompletedBtn.style.display = hasCompleted ? "" : "none";
    clearAllBtn.style.display = tasks.length > 0 ? "" : "none";
  }

  function highlightFilter() {
    for (var i = 0; i < filterBtns.length; i++) {
      var b = filterBtns[i];
      b.classList.toggle("is-active", b.dataset.filter === currentFilter);
    }
  }

  /* ================================================================
     Actions
  ================================================================ */

  function addTask(text) {
    text = text.trim();
    if (text === "") return;
    var dateVal = dateInput.value;
    var timeVal = timeInput.value;
    var noteVal = noteInput.value.trim();
    tasks.unshift(createTask(text, dateVal, timeVal, noteVal));
    renderTasks();
    input.value = "";
    dateInput.value = "";
    timeInput.value = "";
    noteInput.value = "";
    input.focus();
  }

  function toggleTask(id) {
    for (var i = 0; i < tasks.length; i++) {
      if (tasks[i].id === id) {
        tasks[i].completed = !tasks[i].completed;
        break;
      }
    }
    renderTasks();
  }

  function deleteTask(id) {
    var item = list.querySelector('[data-id="' + id + '"]');
    if (item) {
      item.classList.remove("task-enter");
      item.classList.add("task-exit");
    }
    setTimeout(function () {
      tasks = tasks.filter(function (t) { return t.id !== id; });
      renderTasks();
    }, 280);
  }

  function clearCompleted() {
    tasks = tasks.filter(function (t) { return !t.completed; });
    if (currentFilter === "completed") currentFilter = "all";
    highlightFilter();
    renderTasks();
  }

  function clearAll() {
    if (tasks.length === 0) return;
    if (!confirm("Clear all tasks?")) return;
    tasks = [];
    currentFilter = "all";
    highlightFilter();
    renderTasks();
  }

  function setFilter(filter) {
    if (filter === currentFilter) return;
    currentFilter = filter;
    highlightFilter();
    renderTasks();
  }

  /* ================================================================
     Events
  ================================================================ */

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    addTask(input.value);
  });

  list.addEventListener("click", function (e) {
    var li = e.target.closest(".task-list__item");
    if (!li) return;
    var id = Number(li.dataset.id);

    if (e.target.classList.contains("task-list__delete")) {
      deleteTask(id);
      return;
    }

    if (
      e.target.classList.contains("task-list__toggle") ||
      (e.target.classList.contains("task-list__text"))
    ) {
      toggleTask(id);
    }
  });

  list.addEventListener("blur", function (e) {
    if (!e.target.classList.contains("task-list__note")) return;
    var li = e.target.closest(".task-list__item");
    if (!li) return;
    var id = Number(li.dataset.id);
    var newText = e.target.textContent.trim();

    for (var i = 0; i < tasks.length; i++) {
      if (tasks[i].id === id) {
        tasks[i].note = newText;
        break;
      }
    }
  }, true);

  for (var i = 0; i < filterBtns.length; i++) {
    filterBtns[i].addEventListener("click", function () {
      setFilter(this.dataset.filter);
    });
  }

  clearCompletedBtn.addEventListener("click", clearCompleted);
  clearAllBtn.addEventListener("click", clearAll);

  /* ================================================================
     Bootstrap
  ================================================================ */

  tasks.unshift(
    {
      id: nextId++, text: "Review design tokens", completed: false,
      dueDate: "", dueTime: "", note: ""
    },
    {
      id: nextId++, text: "Build the UI components", completed: true,
      dueDate: "2026-06-30", dueTime: "14:00", note: "Use the tokens from design-tokens.css"
    },
    {
      id: nextId++, text: "Test the application", completed: false,
      dueDate: "2026-07-02", dueTime: "09:30", note: ""
    },
    {
      id: nextId++, text: "Write documentation", completed: false,
      dueDate: "", dueTime: "", note: "Include usage examples and setup steps"
    }
  );
  renderTasks();
})();
