const output = document.getElementById("output");
const input = document.getElementById("input");
const promptEl = document.getElementById("prompt");

const toggle = document.getElementById("themeToggle");
const modeBtn = document.getElementById("modeToggle");

const terminalMode = document.getElementById("terminalMode");
const easyMode = document.getElementById("easyMode");

let cwd = "~";
let history = [];
let historyIndex = -1;

const isMobile = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);

/* -------------------------
   UTIL
-------------------------- */
function sleep(ms) {
  return new Promise(res => setTimeout(res, ms));
}

/* -------------------------
   TYPE EFFECT (FIXED SPACING)
-------------------------- */
async function typeText(text, speed = 15) {
  const p = document.createElement("p");
  output.appendChild(p);

  for (let i = 0; i < text.length; i++) {
    const char = text[i];

    // FIX: preserve spaces properly
    p.textContent += char === " " ? "\u00A0" : char;

    await sleep(speed);
  }
}

/* -------------------------
   LINE OUTPUT
-------------------------- */
async function printLines(text, delay = 60) {
  const lines = text.split("\n");

  for (const line of lines) {
    const p = document.createElement("p");
    p.innerText = line;
    output.appendChild(p);
    await sleep(delay);
  }
}

/* -------------------------
   FILE SYSTEM
-------------------------- */
const fs = {
  "~": {
    type: "dir",
    children: {
      "about.txt": { type: "file", content: "I'm Stephen DeWees!\nEngineering Senior @ TTU\n Majoring in Manufacturing Engineering Technologies" },
      "projects": {
        type: "dir",
        children: {
          "project1.txt": { type: "file", content: "https://github.com/yourrepo" },
          "project2.txt": { type: "file", content: "https://www.myfreak.org" }
        }
      },
      "contact.txt": { type: "file", content: "EMAIL: sldewees04@gmail.com\nPHONE: +1 (615)-569-8614" }
    }
  }
};

function getDir(path) {
  const parts = path === "~" ? [] : path.replace("~/","").split("/");
  let current = fs["~"];

  for (let part of parts) {
    if (current.children[part]) {
      current = current.children[part];
    }
  }

  return current;
}

/* -------------------------
   MODE SYSTEM
-------------------------- */
let isEasy;

const savedMode = localStorage.getItem("mode");

if (isMobile) {
  isEasy = true;
} else {
  isEasy = savedMode !== "terminal";
}

function setModeUI() {
  if (isEasy) {
    terminalMode.style.display = "none";
    easyMode.style.display = "block";
    modeBtn.textContent = "terminal mode";
  } else {
    terminalMode.style.display = "block";
    easyMode.style.display = "none";
    modeBtn.textContent = "easy mode";
  }
}

setModeUI();

modeBtn.addEventListener("click", () => {
  isEasy = !isEasy;
  setModeUI();
  localStorage.setItem("mode", isEasy ? "easy" : "terminal");
});

/* -------------------------
   THEME
-------------------------- */
function applyTheme(name) {
  document.body.classList.remove("light");

  if (name === "light") {
    document.body.classList.add("light");
    toggle.checked = true;
  } else {
    toggle.checked = false;
  }

  localStorage.setItem("theme", name);
}

toggle.addEventListener("change", () => {
  applyTheme(toggle.checked ? "light" : "matrix");
});

const savedTheme = localStorage.getItem("theme");
if (savedTheme) applyTheme(savedTheme);

/* -------------------------
   COMMANDS
-------------------------- */
const commands = {
  help: async () => {
    await sleep(250);
    return "ls, cd, cat, clear, theme";
  },

  ls: async () => {
    await sleep(200);
    return Object.keys(getDir(cwd).children).join("\n");
  },

  cd: async (arg) => {
    await sleep(150);

    const dir = getDir(cwd);

    if (dir.children[arg]?.type === "dir") {
      cwd = cwd === "~" ? `~/${arg}` : `${cwd}/${arg}`;
    } else return "No such directory";
  },

  cat: async (arg) => {
    await sleep(200);

    const file = getDir(cwd).children[arg];

    if (file?.type === "file") {
      return file.content.replace(/https?:\/\/\S+/g,
        url => `<a href="${url}" target="_blank">${url}</a>`
      );
    }

    return "File not found";
  },

  clear: async () => {
    output.innerHTML = "";
  },

  theme: async (arg) => {
    await sleep(100);
    if (!arg) return "light, matrix";
    applyTheme(arg);
  }
};

/* -------------------------
   AUTOCOMPLETE
-------------------------- */
function autocomplete(value) {
  const [cmd, arg] = value.split(" ");

  if (!arg) {
    return Object.keys(commands).filter(c => c.startsWith(cmd));
  }

  return Object.keys(getDir(cwd).children)
    .filter(f => f.startsWith(arg));
}

/* -------------------------
   PRINT
-------------------------- */
function print(text, html = false) {
  const p = document.createElement("p");
  html ? p.innerHTML = text : p.innerText = text;
  output.appendChild(p);
}

/* -------------------------
   PROMPT
-------------------------- */
function updatePrompt() {
  promptEl.textContent = `user@sldewees.com:${cwd}$ `;
}

/* -------------------------
   INPUT HANDLER
-------------------------- */
input.addEventListener("keydown", async (e) => {

  if (e.key === "Enter") {

    const raw = input.value;

    if (!raw.trim()) {
      print(""); // clean newline
      input.value = "";
      updatePrompt();
      return;
    }

    const trimmed = raw.trim();

    history.push(trimmed);
    historyIndex = history.length;

    print(`user@sldewees.com:${cwd}$ ${trimmed}`);

    let [cmd, arg] = trimmed.split(" ");

    if (commands[cmd]) {
      const res = await commands[cmd](arg);

      if (res) {
        await printLines(res);
      }
    } else {
      print("command not found");
    }

    input.value = "";
    updatePrompt();
  }

  if (e.key === "Tab") {
    if (isMobile) return;

    e.preventDefault();

    const matches = autocomplete(input.value);

    if (matches.length === 1) {
      const parts = input.value.split(" ");
      parts[parts.length - 1] = matches[0];
      input.value = parts.join(" ");
    } else {
      print(matches.join("   "));
    }
  }

  if (e.key === "ArrowUp") {
    if (historyIndex > 0) historyIndex--;
    input.value = history[historyIndex] || "";
  }

  if (e.key === "ArrowDown") {
    if (historyIndex < history.length - 1) historyIndex++;
    input.value = history[historyIndex] || "";
  }
});

/* -------------------------
   BOOT SEQUENCE (FIXED SPACING)
-------------------------- */
async function boot() {
  await typeText("initializing system...");
  await sleep(300);

  await typeText("loading modules...");
  await sleep(300);

  await typeText("welcome.");
  await sleep(200);

  print("Type 'help' to begin.");
}

updatePrompt();
boot();