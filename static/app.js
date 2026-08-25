// theme
const root = document.documentElement;
const saved = localStorage.getItem("theme");
if (saved) root.dataset.theme = saved;
else root.dataset.theme = matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
document.getElementById("theme-toggle").addEventListener("click", () => {
  const next = root.dataset.theme === "dark" ? "light" : "dark";
  root.dataset.theme = next;
  localStorage.setItem("theme", next);
});
// sidebar active is set at build time; ensure scroll into view
document.querySelector("#sidebar a.active")?.scrollIntoView({ block: "nearest" });

// copy-to-clipboard on every code block
document.querySelectorAll("#content pre").forEach((pre) => {
  const btn = document.createElement("button");
  btn.className = "copy-btn";
  btn.type = "button";
  btn.textContent = "Copy";
  btn.addEventListener("click", async () => {
    const text = pre.querySelector("code")?.innerText ?? pre.innerText;
    try { await navigator.clipboard.writeText(text); } catch { /* ignore */ }
    btn.textContent = "Copied";
    setTimeout(() => (btn.textContent = "Copy"), 1500);
  });
  pre.appendChild(btn);
});