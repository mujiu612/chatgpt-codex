const searchBtn = document.getElementById("search-btn");
const input = document.getElementById("book-input");
const results = document.getElementById("results");
const searchHint = document.getElementById("search-hint");
const carousel = document.getElementById("carousel");
const axisTrack = document.getElementById("axis-track");
const axisThumb = document.getElementById("axis-thumb");
const resultTemplate = document.getElementById("result-template");
const bookTemplate = document.getElementById("book-template");

const state = {
  books: [],
  offset: 0,
  autoScroll: null,
  isDragging: false,
  dragStartX: 0,
  dragStartOffset: 0,
};

const fallbackBooks = [
  {
    title: "活着",
    author: "余华",
    cover:
      "https://img3.doubanio.com/view/subject/s/public/s1080178.jpg",
  },
  {
    title: "百年孤独",
    author: "加西亚·马尔克斯",
    cover:
      "https://img9.doubanio.com/view/subject/s/public/s6384944.jpg",
  },
  {
    title: "小王子",
    author: "圣埃克苏佩里",
    cover:
      "https://img9.doubanio.com/view/subject/s/public/s1237549.jpg",
  },
];

function normalizeCover(url) {
  if (!url) return "";
  return url.replace("https://", "https://");
}

async function fetchDoubanBooks(query) {
  const endpoint = `https://cors.isomorphic-git.org/https://book.douban.com/j/subject_suggest?q=${encodeURIComponent(
    query
  )}`;
  const response = await fetch(endpoint);
  if (!response.ok) {
    throw new Error("请求失败");
  }
  const data = await response.json();
  return data.map((item) => ({
    title: item.title,
    author: item.author_name || item.author || "未知作者",
    cover: item.pic || item.cover || "",
  }));
}

function renderResults(items) {
  results.innerHTML = "";
  items.forEach((item) => {
    const card = resultTemplate.content.cloneNode(true);
    const cover = card.querySelector(".result-card__cover");
    const title = card.querySelector(".result-card__title");
    const meta = card.querySelector(".result-card__meta");
    const btn = card.querySelector(".result-card__btn");

    cover.src = normalizeCover(item.cover);
    cover.alt = item.title;
    title.textContent = item.title;
    meta.textContent = item.author;

    btn.addEventListener("click", () => addBook(item));
    results.appendChild(card);
  });
}

function addBook(item) {
  state.books.push(item);
  renderCarousel();
}

function renderCarousel() {
  carousel.innerHTML = "";
  state.books.forEach((book) => {
    const card = bookTemplate.content.cloneNode(true);
    const cover = card.querySelector(".book-card__cover");
    const title = card.querySelector(".book-card__name");
    cover.src = normalizeCover(book.cover);
    cover.alt = book.title;
    title.textContent = book.title;
    carousel.appendChild(card);
  });
  updateCarousel();
}

function updateCarousel() {
  const cards = Array.from(carousel.children);
  const total = cards.length;
  if (!total) return;

  const spacing = 200;
  const centerIndex = state.offset;
  cards.forEach((card, index) => {
    const distance = index - centerIndex;
    const scale = Math.max(0.6, 1 - Math.abs(distance) * 0.15);
    const translateX = distance * spacing;
    const translateY = Math.abs(distance) * 12;
    const opacity = Math.max(0.3, 1 - Math.abs(distance) * 0.25);

    card.style.transform = `translateX(${translateX}px) translateY(${translateY}px) scale(${scale})`;
    card.style.opacity = opacity;
    card.style.zIndex = `${100 - Math.abs(distance)}`;
    card.classList.toggle("is-center", Math.abs(distance) < 0.5);
  });

  updateAxisThumb(total);
}

function updateAxisThumb(total) {
  const trackWidth = axisTrack.clientWidth;
  const maxOffset = Math.max(0, total - 1);
  const progress = maxOffset === 0 ? 0 : state.offset / maxOffset;
  axisThumb.style.left = `${progress * trackWidth}px`;
}

function clampOffset(value) {
  const maxOffset = Math.max(0, state.books.length - 1);
  return Math.min(Math.max(value, 0), maxOffset);
}

function stepAutoScroll() {
  state.offset = clampOffset(state.offset + 0.015);
  if (state.offset >= state.books.length - 1) {
    state.offset = 0;
  }
  updateCarousel();
}

function startAutoScroll() {
  if (state.autoScroll) return;
  state.autoScroll = setInterval(stepAutoScroll, 30);
}

function stopAutoScroll() {
  if (state.autoScroll) {
    clearInterval(state.autoScroll);
    state.autoScroll = null;
  }
}

function handleSearch() {
  const query = input.value.trim();
  if (!query) return;
  searchHint.textContent = "正在检索豆瓣信息...";
  fetchDoubanBooks(query)
    .then((items) => {
      if (!items.length) {
        searchHint.textContent = "未找到结果，已展示推荐书单。";
        renderResults(fallbackBooks);
        return;
      }
      searchHint.textContent = `找到 ${items.length} 条结果，点击确认加入。`;
      renderResults(items.slice(0, 4));
    })
    .catch(() => {
      searchHint.textContent = "豆瓣接口不可用，已展示推荐书单。";
      renderResults(fallbackBooks);
    });
}

function setupDrag() {
  const onPointerMove = (event) => {
    if (!state.isDragging) return;
    const delta = event.clientX - state.dragStartX;
    const offsetDelta = -delta / 200;
    state.offset = clampOffset(state.dragStartOffset + offsetDelta);
    updateCarousel();
  };

  const onPointerUp = () => {
    if (!state.isDragging) return;
    state.isDragging = false;
    startAutoScroll();
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("pointerup", onPointerUp);
  };

  carousel.addEventListener("pointerdown", (event) => {
    if (!state.books.length) return;
    stopAutoScroll();
    state.isDragging = true;
    state.dragStartX = event.clientX;
    state.dragStartOffset = state.offset;
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
  });

  axisThumb.addEventListener("pointerdown", (event) => {
    if (!state.books.length) return;
    stopAutoScroll();
    state.isDragging = true;
    state.dragStartX = event.clientX;
    state.dragStartOffset = state.offset;
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
  });
}

searchBtn.addEventListener("click", handleSearch);
input.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    handleSearch();
  }
});

window.addEventListener("resize", () => updateCarousel());

renderResults(fallbackBooks);
state.books = [...fallbackBooks];
renderCarousel();
startAutoScroll();
setupDrag();
