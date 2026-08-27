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
// Copy the page's raw Markdown. Partners paste it into a model, and Markdown
// survives that where scraped HTML arrives full of nav chrome and lost fences.
document.addEventListener("click", async (e) => {
  const btn = e.target.closest(".md-copy");
  if (!btn) return;
  const label = btn.textContent;
  try {
    const res = await fetch(btn.dataset.md);
    if (!res.ok) throw new Error(String(res.status));
    await navigator.clipboard.writeText(await res.text());
    btn.textContent = "Copied";
    btn.dataset.state = "done";
  } catch {
    // No clipboard permission, or offline. Say so rather than looking successful.
    btn.textContent = "Copy failed";
  }
  setTimeout(() => {
    btn.textContent = label;
    delete btn.dataset.state;
  }, 1600);
});
