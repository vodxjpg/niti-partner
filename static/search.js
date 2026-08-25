const input = document.getElementById("search");
const box = document.createElement("div");
box.id = "search-results";
document.querySelector(".topbar").appendChild(box);
let index = null;
input.addEventListener("focus", async () => {
  if (!index) index = await (await fetch("/search-index.json")).json();
});
input.addEventListener("input", () => {
  const q = input.value.trim().toLowerCase();
  if (!q) { box.style.display = "none"; return; }
  const hits = index.filter(p => (p.title + " " + p.text).toLowerCase().includes(q)).slice(0, 12);
  box.innerHTML = hits.length
    ? hits.map(h => `<a href="${h.url}"><div>${h.title}</div><div class="sr-section">${h.section}</div></a>`).join("")
    : `<div style="padding:12px">No results</div>`;
  box.style.display = "block";
});
document.addEventListener("click", (e) => { if (e.target !== input) box.style.display = "none"; });