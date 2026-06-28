(function () {
  "use strict";

  /* ------------------------------------------------------------------ */
  /*  State
  /* ------------------------------------------------------------------ */

  let tasks = [];
  let nextId = 1;

  /* ------------------------------------------------------------------ */
  /*  DOM references
  /* ------------------------------------------------------------------ */

  const form = document.querySelector(".add-form");
  const input = form.querySelector(".add-form__input");
  const list = document.querySelector(".task-list");
  const totalEl = document.querySelector(".count-total");
  const doneEl = document.querySelector(".count-done");

  /* ------------------------------------------------------------------ */
  /*  Pure helpers
  /* ------------------------------------------------------------------ */

  function createTask(text) {
    return { id: nextId++, text: text.trim(), done: false };
  }

  function getCounts() {
    const total = tasks.length;
    const done = tasks.filter(function (t) {
      return t.done;
    }).length;
    return { total: total, done: done };
  }

  /* ------------------------------------------------------------------ */
  /*  Render
  /* ------------------------------------------------------------------ */

  function render() {
    var fragment = document.createDocumentFragment();

    tasks.forEach(function (task) {
      var li = document.createElement("li");
      li.className = "task-list__item" + (task.done ? " task-list__item--done" : "");
      li.dataset.id = task.id;

      var checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.className = "task-list__toggle";
      checkbox.checked = task.done;
      checkbox.setAttribute("aria-label", 'Mark "' + task.text + '" as ' + (task.done ? "not done" : "done"));

      var label = document.createElement("span");
      label.className = "task-list__text";
      label.textContent = task.text;

      var delBtn = document.createElement("button");
      delBtn.className = "task-list__delete";
      delBtn.textContent = "Delete";
      delBtn.setAttribute("aria-label", 'Delete "' + task.text + '"');

      li.appendChild(checkbox);
      li.appendChild(label);
      li.appendChild(delBtn);
      fragment.appendChild(li);
    });

    list.innerHTML = "";
    list.appendChild(fragment);

    var counts = getCounts();
    totalEl.textContent = counts.total;
    doneEl.textContent = counts.done;
  }

  /* ------------------------------------------------------------------ */
  /*  Actions
  /* ------------------------------------------------------------------ */

  function addTask(text) {
    text = text.trim();
    if (text === "") return;
    tasks.push(createTask(text));
    render();
  }

  function toggleTask(id) {
    tasks.forEach(function (task) {
      if (task.id === id) task.done = !task.done;
    });
    render();
  }

  function deleteTask(id) {
    tasks = tasks.filter(function (task) {
      return task.id !== id;
    });
    render();
  }

  /* ------------------------------------------------------------------ */
  /*  Event binding
  /* ------------------------------------------------------------------ */

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    addTask(input.value);
    input.value = "";
    input.focus();
  });

  list.addEventListener("click", function (e) {
    var li = e.target.closest(".task-list__item");
    if (!li) return;
    var id = Number(li.dataset.id);

    if (e.target.classList.contains("task-list__delete")) {
      deleteTask(id);
    }

    if (e.target.classList.contains("task-list__toggle")) {
      toggleTask(id);
    }
  });

  /* ------------------------------------------------------------------ */
  /*  Bootstrap — show a couple of example tasks
  /* ------------------------------------------------------------------ */

  addTask("Review design tokens");
  addTask("Build the UI components");
  addTask("Test the app");
  tasks[1].done = true;
  render();
})();
