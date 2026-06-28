(function () {
  "use strict";

  /* ================================================================
     State
  ================================================================ */

  let tasks = [];
  let nextId = 1;
  let currentFilter = "all";

  /* ================================================================
     DOM references
  ================================================================ */

  const form = document.getElementById("addForm");
  const input = document.getElementById("taskInput");
  const list = document.getElementById("taskList");
  const emptyState = document.getElementById("emptyState");
  const emptyMessage = document.getElementById("emptyMessage");
  const statTotal = document.getElementById("statTotal");
  const statDone = document.getElementById("statDone");
  const statRemaining = document.getElementById("statRemaining");
  const filterBtns = document.querySelectorAll(".filter-bar__btn");
  const clearBtn = document.getElementById("clearCompleted");

  /* ================================================================
     Helpers
  ================================================================ */

  function createTask(text) {
    return { id: nextId++, text: text.trim(), completed: false };
  }

  function getFilteredTasks() {
    if (currentFilter === "active") return tasks.filter(function (t) { return !t.completed; });
    if (currentFilter === "completed") return tasks.filter(function (t) { return t.completed; });
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

  /* ================================================================
     Render
  ================================================================ */

  function renderTasks() {
    var filtered = getFilteredTasks();
    var fragment = document.createDocumentFragment();

    for (var i = 0; i < filtered.length; i++) {
      var task = filtered[i];
      var li = document.createElement("li");
      li.className = "task-list__item" + (task.completed ? " task-list__item--done" : "") + " task-enter";
      li.dataset.id = task.id;

      var checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.className = "task-list__toggle";
      checkbox.checked = task.completed;
      checkbox.id = "task-" + task.id;
      checkbox.setAttribute("aria-label", "Mark \u201C" + task.text + "\u201D as " + (task.completed ? "not done" : "done"));

      var label = document.createElement("label");
      label.className = "task-list__text";
      label.textContent = task.text;
      label.setAttribute("for", "task-" + task.id);

      var delBtn = document.createElement("button");
      delBtn.className = "task-list__delete";
      delBtn.textContent = "Delete";
      delBtn.setAttribute("aria-label", "Delete \u201C" + task.text + "\u201D");

      li.appendChild(checkbox);
      li.appendChild(label);
      li.appendChild(delBtn);
      fragment.appendChild(li);
    }

    list.innerHTML = "";
    list.appendChild(fragment);

    updateStats();
    updateEmptyState(filtered.length);
    updateClearBtn();
  }

  function updateStats() {
    var stats = getStats();
    statTotal.textContent = stats.total;
    statDone.textContent = stats.done;
    statRemaining.textContent = stats.remaining;
  }

  function updateEmptyState(filteredCount) {
    if (tasks.length === 0) {
      emptyMessage.textContent = "No tasks yet. Add your first task!";
      emptyState.style.display = "";
    } else if (filteredCount === 0) {
      if (currentFilter === "active") {
        emptyMessage.textContent = "All tasks are completed. Great work!";
      } else if (currentFilter === "completed") {
        emptyMessage.textContent = "No completed tasks yet.";
      } else {
        emptyMessage.textContent = "No tasks yet. Add your first task!";
      }
      emptyState.style.display = "";
    } else {
      emptyState.style.display = "none";
    }
  }

  function updateClearBtn() {
    var hasCompleted = false;
    for (var i = 0; i < tasks.length; i++) {
      if (tasks[i].completed) { hasCompleted = true; break; }
    }
    clearBtn.style.display = hasCompleted ? "" : "none";
  }

  function updateActiveFilter() {
    for (var i = 0; i < filterBtns.length; i++) {
      var btn = filterBtns[i];
      if (btn.dataset.filter === currentFilter) {
        btn.classList.add("is-active");
      } else {
        btn.classList.remove("is-active");
      }
    }
  }

  /* ================================================================
     Actions
  ================================================================ */

  function addTask(text) {
    text = text.trim();
    if (text === "") return;

    tasks.unshift(createTask(text));
    renderTasks();
    input.value = "";
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
    updateActiveFilter();
    renderTasks();
  }

  function setFilter(filter) {
    if (filter === currentFilter) return;
    currentFilter = filter;
    updateActiveFilter();
    renderTasks();
  }

  /* ================================================================
     Event binding
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

    if (e.target.classList.contains("task-list__toggle") ||
        e.target.classList.contains("task-list__text")) {
      toggleTask(id);
    }
  });

  for (var i = 0; i < filterBtns.length; i++) {
    filterBtns[i].addEventListener("click", function () {
      setFilter(this.dataset.filter);
    });
  }

  clearBtn.addEventListener("click", clearCompleted);

  /* ================================================================
     Bootstrap — sample tasks
  ================================================================ */

  tasks.unshift(
    { id: nextId++, text: "Review design tokens", completed: false },
    { id: nextId++, text: "Build the UI components", completed: true },
    { id: nextId++, text: "Test the application", completed: false },
    { id: nextId++, text: "Write documentation", completed: false }
  );
  renderTasks();
})();
