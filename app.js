"use strict";

const NUMBER = new Intl.NumberFormat("es-CR");
const PERCENT = new Intl.NumberFormat("es-CR", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

const PALETTE = [
  "#00c0f3",
  "#005da4",
  "#ffe06a",
  "#6dc067",
  "#e5b365",
  "#008641",
  "#7ccbef",
  "#8ea2c8",
];

const AREA_COLORS = {
  "CIENCIAS BASICAS": "#00c0f3",
  "CIENCIAS SOCIALES": "#005da4",
  SALUD: "#ffe06a",
  "CIENCIAS AGROALIMENTARIAS": "#6dc067",
  "INGENIERIA Y ARQUITECTURA": "#e5b365",
  "SEDES REGIONALES": "#008641",
  "ARTES Y LETRAS": "#7ccbef",
  "OTRAS AREAS": "#8ea2c8",
};

const LABELS = {
  "CIENCIAS BASICAS": "Ciencias Básicas",
  "CIENCIAS SOCIALES": "Ciencias Sociales",
  SALUD: "Salud",
  "CIENCIAS AGROALIMENTARIAS": "Ciencias Agroalimentarias",
  "INGENIERIA Y ARQUITECTURA": "Ingeniería y Arquitectura",
  "SEDES REGIONALES": "Sedes Regionales",
  "ARTES Y LETRAS": "Artes y Letras",
  "OTRAS AREAS": "Otras Áreas",
  CENTRAL: "Central",
  CHOROTEGA: "Chorotega",
  "PACIFICO CENTRAL": "Pacífico Central",
  "HUETAR CARIBE": "Huetar Caribe",
  BRUNCA: "Brunca",
  "HUETAR NORTE": "Huetar Norte",
  "N/D": "Sin identificar",
  "POR LA U.C.R.": "Por la UCR",
  "POR LA U.C.R. Y ENTE EXTERNO": "UCR y ente externo",
  "U.C.R. Y ENTE EXTERNO": "UCR y ente externo",
  SEMILLA: "Fondo Semilla",
  "FONDO SEMILLA": "Fondo Semilla",
  "FONDO CONCURSABLE": "Fondo Concursable",
  "FONDO MUJER": "Fondo Mujer",
  "FONDO CIHRED": "Fondo CIHRED",
  "FONDO I+D": "Fondo I+D",
  "GRUPOS DE INVESTIGACION": "Grupos de Investigación",
  "FINANCIAMIENTO UCREA": "Financiamiento UCREA",
  "FONDO UCREA": "Fondo UCREA",
  "F. Apoyo Inv. Cooperación Internac.": "Apoyo a investigación y cooperación internacional",
  "FONDO 50 ANIVERSARIO": "Fondo 50 Aniversario",
  OTRO: "Otro",
};

const LENSES = {
  areas: {
    key: "area",
    kicker: "Área de conocimiento",
    title: "Proyectos por disciplina",
    aria: "Gráfico horizontal de proyectos por área de conocimiento",
  },
  objetivos: {
    key: "objetivo",
    kicker: "Objetivo socioeconómico",
    title: "Prioridades del portafolio",
    aria: "Gráfico horizontal de proyectos por objetivo socioeconómico",
  },
  regiones: {
    key: "region",
    kicker: "Distribución territorial",
    title: "Proyectos por región",
    aria: "Gráfico horizontal de proyectos por región",
  },
  financiamiento: {
    key: "financiamiento",
    kicker: "Tipo de financiamiento",
    title: "Mecanismos que sostienen la cartera",
    aria: "Gráfico horizontal de proyectos por tipo de financiamiento",
  },
};

const state = {
  area: "",
  region: "",
  funding: "",
  query: "",
  lens: "areas",
  showAll: false,
  page: 1,
  sortKey: "codigo",
  sortDirection: 1,
};

const elements = {
  areaFilter: document.querySelector("#area-filter"),
  regionFilter: document.querySelector("#region-filter"),
  fundingFilter: document.querySelector("#funding-filter"),
  searchFilter: document.querySelector("#search-filter"),
  filters: document.querySelector("#filters"),
  resetFilters: document.querySelector("#reset-filters"),
  filterStatus: document.querySelector("#filter-status"),
  metricCount: document.querySelector("#metric-count"),
  metricShare: document.querySelector("#metric-share"),
  metricArea: document.querySelector("#metric-area"),
  metricAreaDetail: document.querySelector("#metric-area-detail"),
  metricRegion: document.querySelector("#metric-region"),
  metricRegionDetail: document.querySelector("#metric-region-detail"),
  metricFunding: document.querySelector("#metric-funding"),
  metricFundingDetail: document.querySelector("#metric-funding-detail"),
  distributionSummary: document.querySelector("#distribution-summary"),
  chartKicker: document.querySelector("#chart-kicker"),
  chartTitle: document.querySelector("#chart-title"),
  horizontalChart: document.querySelector("#horizontal-chart"),
  toggleCategories: document.querySelector("#toggle-categories"),
  insightValue: document.querySelector("#insight-value"),
  insightTitle: document.querySelector("#insight-title"),
  insightCopy: document.querySelector("#insight-copy"),
  stackedChart: document.querySelector("#stacked-chart"),
  stackedLegend: document.querySelector("#stacked-legend"),
  projectRows: document.querySelector("#project-rows"),
  previousPage: document.querySelector("#previous-page"),
  nextPage: document.querySelector("#next-page"),
  pageStatus: document.querySelector("#page-status"),
  downloadCsv: document.querySelector("#download-csv"),
  dataError: document.querySelector("#data-error"),
};

const PAGE_SIZE = 12;
let projects = [];
let filteredProjects = [];

function displayLabel(value) {
  if (value === null || value === undefined || String(value).trim() === "") {
    return "Sin identificar";
  }
  const text = String(value).trim();
  return LABELS[text] || text;
}

function normalized(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es");
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function countBy(records, key) {
  const counts = new Map();
  records.forEach((project) => {
    const value = project[key] || "Sin identificar";
    counts.set(value, (counts.get(value) || 0) + 1);
  });
  return [...counts.entries()]
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => b.count - a.count || displayLabel(a.value).localeCompare(displayLabel(b.value), "es"));
}

function topCategory(records, key) {
  return countBy(records, key)[0] || { value: "Sin datos", count: 0 };
}

function formatShare(count, total) {
  return total ? `${PERCENT.format((count / total) * 100)} %` : "0,0 %";
}

function colorFor(value, index, key) {
  if (key === "area") {
    return AREA_COLORS[value] || PALETTE[index % PALETTE.length];
  }
  return PALETTE[index % PALETTE.length];
}

function populateSelect(select, key) {
  countBy(projects, key).forEach(({ value, count }) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = `${displayLabel(value)} (${NUMBER.format(count)})`;
    select.append(option);
  });
}

function applyFilters() {
  const query = normalized(state.query.trim());
  filteredProjects = projects.filter((project) => {
    if (state.area && project.area !== state.area) return false;
    if (state.region && project.region !== state.region) return false;
    if (state.funding && project.financiamiento !== state.funding) return false;
    if (!query) return true;
    const searchable = normalized(
      [
        project.codigo,
        project.unidad,
        project.area,
        project.aplicacion,
        project.objetivo,
        project.region,
        project.financiamiento,
        project.beneficio,
      ].join(" "),
    );
    return searchable.includes(query);
  });
}

function renderMetrics() {
  const total = projects.length;
  const count = filteredProjects.length;
  const area = topCategory(filteredProjects, "area");
  const region = topCategory(filteredProjects, "region");
  const funding = topCategory(filteredProjects, "financiamiento");
  const filterCount = [state.area, state.region, state.funding, state.query].filter(Boolean).length;

  elements.metricCount.textContent = NUMBER.format(count);
  elements.metricShare.textContent = `${formatShare(count, total)} de la cartera`;
  elements.metricArea.textContent = displayLabel(area.value);
  elements.metricAreaDetail.textContent = `${NUMBER.format(area.count)} proyectos`;
  elements.metricRegion.textContent = displayLabel(region.value);
  elements.metricRegionDetail.textContent = `${NUMBER.format(region.count)} proyectos`;
  elements.metricFunding.textContent = displayLabel(funding.value);
  elements.metricFundingDetail.textContent = `${NUMBER.format(funding.count)} proyectos`;
  elements.filterStatus.textContent = filterCount
    ? `${NUMBER.format(count)} proyectos coinciden con ${filterCount} ${filterCount === 1 ? "criterio activo" : "criterios activos"}.`
    : `${NUMBER.format(count)} proyectos visibles. No hay filtros activos.`;
}

function renderDistribution() {
  const config = LENSES[state.lens];
  const counts = countBy(filteredProjects, config.key);
  const visibleLimit = 8;
  const visibleCounts = state.showAll ? counts : counts.slice(0, visibleLimit);
  const maximum = Math.max(1, ...visibleCounts.map((item) => item.count));

  elements.chartKicker.textContent = config.kicker;
  elements.chartTitle.textContent = config.title;
  elements.horizontalChart.setAttribute("aria-label", config.aria);
  elements.toggleCategories.hidden = counts.length <= visibleLimit;
  elements.toggleCategories.textContent = state.showAll ? "Ver principales" : `Ver todas (${counts.length})`;

  if (!visibleCounts.length) {
    elements.horizontalChart.innerHTML = '<p class="empty-chart">No hay datos para esta selección.</p>';
    renderInsight(counts, config.key);
    return;
  }

  elements.horizontalChart.innerHTML = visibleCounts
    .map(({ value, count }, index) => {
      const width = Math.max(0.7, (count / maximum) * 100);
      const share = formatShare(count, filteredProjects.length);
      const label = displayLabel(value);
      return `
        <div
          class="chart-row"
          tabindex="0"
          style="--bar-color:${colorFor(value, index, config.key)};--bar-width:${width}%"
          aria-label="${escapeHtml(label)}: ${NUMBER.format(count)} proyectos, ${share} de la selección"
          title="${escapeHtml(label)} · ${NUMBER.format(count)} proyectos · ${share}"
        >
          <span class="chart-label">${escapeHtml(label)}</span>
          <span class="bar-track" aria-hidden="true"><span class="bar-fill" style="animation-delay:${index * 45}ms"></span></span>
          <span class="chart-value">${NUMBER.format(count)}</span>
        </div>`;
    })
    .join("");

  renderInsight(counts, config.key);
}

function renderInsight(counts, key) {
  const total = filteredProjects.length;
  if (!counts.length || !total) {
    elements.insightValue.textContent = "0";
    elements.insightTitle.textContent = "proyectos visibles";
    elements.insightCopy.textContent = "Ajuste los filtros para recuperar resultados.";
    elements.distributionSummary.textContent = "No hay proyectos para la selección actual.";
    return;
  }

  const useTopThree = key === "area" || key === "objetivo";
  const selected = counts.slice(0, useTopThree ? 3 : 1);
  const selectedCount = selected.reduce((sum, item) => sum + item.count, 0);
  const names = selected.map((item) => displayLabel(item.value));
  const share = formatShare(selectedCount, total);

  elements.insightValue.textContent = share;
  elements.insightTitle.textContent = useTopThree ? "del conjunto visible" : names[0];
  elements.insightCopy.textContent = useTopThree
    ? `${joinNatural(names)} suman ${NUMBER.format(selectedCount)} proyectos.`
    : `${NUMBER.format(selectedCount)} proyectos se ubican en esta categoría.`;
  elements.distributionSummary.textContent = useTopThree
    ? `Las tres categorías principales reúnen ${share} de la selección actual.`
    : `${names[0]} concentra ${share} de la selección actual.`;
}

function joinNatural(values) {
  if (values.length < 2) return values[0] || "";
  if (values.length === 2) return `${values[0]} y ${values[1]}`;
  return `${values.slice(0, -1).join(", ")} y ${values.at(-1)}`;
}

function renderStackedChart() {
  const objectives = countBy(filteredProjects, "objetivo").slice(0, 3);
  if (!objectives.length) {
    elements.stackedChart.innerHTML = '<p class="empty-chart">No hay datos para construir el cruce.</p>';
    elements.stackedLegend.innerHTML = "";
    return;
  }

  const maxTotal = objectives[0].count;
  const usedAreas = new Set();

  elements.stackedChart.innerHTML = objectives
    .map(({ value: objective, count: total }) => {
      const objectiveProjects = filteredProjects.filter((project) => project.objetivo === objective);
      const areas = countBy(objectiveProjects, "area");
      areas.forEach(({ value }) => usedAreas.add(value));
      const segments = areas
        .map(({ value: area, count }, index) => {
          const width = (count / total) * 100;
          const label = displayLabel(area);
          return `<span
            class="stacked-segment"
            tabindex="0"
            style="--segment-color:${colorFor(area, index, "area")};width:${width}%"
            aria-label="${escapeHtml(label)}: ${NUMBER.format(count)} proyectos en ${escapeHtml(displayLabel(objective))}"
            title="${escapeHtml(label)} · ${NUMBER.format(count)} proyectos"
          ></span>`;
        })
        .join("");

      return `
        <div class="stacked-row">
          <span class="stacked-label">${escapeHtml(displayLabel(objective))}</span>
          <span class="stacked-track" style="width:${(total / maxTotal) * 100}%">${segments}</span>
          <strong class="stacked-total">${NUMBER.format(total)}</strong>
        </div>`;
    })
    .join("");

  elements.stackedLegend.innerHTML = [...usedAreas]
    .sort((a, b) => displayLabel(a).localeCompare(displayLabel(b), "es"))
    .map((area, index) => `
      <span class="legend-item">
        <span class="legend-swatch" style="--legend-color:${colorFor(area, index, "area")}" aria-hidden="true"></span>
        ${escapeHtml(displayLabel(area))}
      </span>`)
    .join("");
}

function sortedProjects() {
  const direction = state.sortDirection;
  return [...filteredProjects].sort((a, b) => {
    const first = displayLabel(a[state.sortKey]);
    const second = displayLabel(b[state.sortKey]);
    return first.localeCompare(second, "es", { numeric: true }) * direction;
  });
}

function renderTable() {
  const ordered = sortedProjects();
  const pageCount = Math.max(1, Math.ceil(ordered.length / PAGE_SIZE));
  state.page = Math.min(state.page, pageCount);
  const start = (state.page - 1) * PAGE_SIZE;
  const pageRows = ordered.slice(start, start + PAGE_SIZE);

  if (!pageRows.length) {
    elements.projectRows.innerHTML = '<tr class="empty-row"><td colspan="6">No hay proyectos que coincidan con los filtros.</td></tr>';
  } else {
    elements.projectRows.innerHTML = pageRows
      .map((project) => `
        <tr>
          <td>${escapeHtml(project.codigo)}</td>
          <td>${escapeHtml(displayLabel(project.unidad))}</td>
          <td>${escapeHtml(displayLabel(project.area))}</td>
          <td>${escapeHtml(displayLabel(project.objetivo))}</td>
          <td>${escapeHtml(displayLabel(project.region))}</td>
          <td>${escapeHtml(displayLabel(project.financiamiento))}</td>
        </tr>`)
      .join("");
  }

  elements.previousPage.disabled = state.page <= 1;
  elements.nextPage.disabled = state.page >= pageCount || !ordered.length;
  elements.pageStatus.textContent = `${ordered.length ? `Página ${state.page} de ${pageCount}` : "Sin resultados"} · ${NUMBER.format(ordered.length)} proyectos`;
}

function updateAll() {
  applyFilters();
  renderMetrics();
  renderDistribution();
  renderStackedChart();
  renderTable();
}

function syncFilters() {
  state.area = elements.areaFilter.value;
  state.region = elements.regionFilter.value;
  state.funding = elements.fundingFilter.value;
  state.query = elements.searchFilter.value;
  state.page = 1;
  updateAll();
}

function downloadCsv() {
  const columns = [
    ["Periodo", "periodo"],
    ["Unidad", "unidad"],
    ["Código de proyecto", "codigo"],
    ["Financiamiento", "financiamiento"],
    ["Área de conocimiento", "area"],
    ["Área de aplicación", "aplicacion"],
    ["Objetivo socioeconómico", "objetivo"],
    ["Región", "region"],
    ["Población beneficiaria", "beneficio"],
  ];
  const escapeCsv = (value) => `"${String(value ?? "").replaceAll('"', '""')}"`;
  const rows = [
    columns.map(([label]) => escapeCsv(label)).join(","),
    ...sortedProjects().map((project) =>
      columns.map(([, key]) => escapeCsv(displayLabel(project[key]))).join(","),
    ),
  ];
  const blob = new Blob(["\ufeff", rows.join("\r\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `proyectos-2026-seleccion-${filteredProjects.length}.csv`;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function addEventListeners() {
  [elements.areaFilter, elements.regionFilter, elements.fundingFilter].forEach((select) => {
    select.addEventListener("change", syncFilters);
  });

  let searchTimer;
  elements.searchFilter.addEventListener("input", () => {
    window.clearTimeout(searchTimer);
    searchTimer = window.setTimeout(syncFilters, 160);
  });

  elements.filters.addEventListener("reset", () => {
    window.setTimeout(() => {
      state.area = "";
      state.region = "";
      state.funding = "";
      state.query = "";
      state.page = 1;
      state.showAll = false;
      updateAll();
    }, 0);
  });

  document.querySelectorAll(".lens-tab").forEach((button) => {
    button.addEventListener("click", () => {
      state.lens = button.dataset.lens;
      state.showAll = false;
      document.querySelectorAll(".lens-tab").forEach((tab) => {
        const active = tab === button;
        tab.classList.toggle("active", active);
        tab.setAttribute("aria-selected", String(active));
      });
      renderDistribution();
    });
  });

  elements.toggleCategories.addEventListener("click", () => {
    state.showAll = !state.showAll;
    renderDistribution();
  });

  document.querySelectorAll("th button[data-sort]").forEach((button) => {
    button.addEventListener("click", () => {
      const nextKey = button.dataset.sort;
      state.sortDirection = state.sortKey === nextKey ? state.sortDirection * -1 : 1;
      state.sortKey = nextKey;
      state.page = 1;
      renderTable();
    });
  });

  elements.previousPage.addEventListener("click", () => {
    state.page = Math.max(1, state.page - 1);
    renderTable();
  });

  elements.nextPage.addEventListener("click", () => {
    state.page += 1;
    renderTable();
  });

  elements.downloadCsv.addEventListener("click", downloadCsv);
}

function initialize() {
  try {
    const payload = window.PROJECT_DATA;
    if (!payload || !Array.isArray(payload.projects) || !payload.projects.length) {
      throw new Error("La base de proyectos no está disponible.");
    }
    projects = payload.projects;
    populateSelect(elements.areaFilter, "area");
    populateSelect(elements.regionFilter, "region");
    populateSelect(elements.fundingFilter, "financiamiento");
    addEventListeners();
    updateAll();
  } catch (error) {
    console.error(error);
    elements.filterStatus.textContent = "No fue posible cargar la base de proyectos.";
    elements.dataError.hidden = false;
  }
}

initialize();
