(() => {
  'use strict';
  const { projects, meta } = window.PROJECT_DATA;
  const { types, normalize, filterProjects, countBy, stats } = window.ExplorerCore;
  const $ = (id) => document.getElementById(id);
  const number = (value) => new Intl.NumberFormat('es-CR').format(value).replace(/\s/g, '.');
  const projectCount = (value) => `${number(value)} ${value === 1 ? 'proyecto' : 'proyectos'}`;
  const percent = (part, total) => {
    const value = total ? part / total * 100 : 0;
    return `${value > 0 && value < 1 ? value.toLocaleString('es-CR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) : Math.round(value)} %`;
  };
  const colors = { 'Básica': '#07589A', 'Aplicada': '#4AB6D6', 'Tecnológica': '#F3C633', 'Sin clasificación': '#9AAEBB' };
  const filterKeys = ['area', 'type', 'region', 'ods', 'descriptor', 'socio', 'finance', 'query'];
  const state = { area: '', type: '', region: '', ods: '', descriptor: '', socio: '', finance: '', query: '', dimension: 'area', page: 1, sort: 'id' };
  let selected = projects;
  let exportMode = false;
  let toastTimer;
  const svgNS = 'http://www.w3.org/2000/svg';

  function node(tag, text, className) {
    const element = document.createElement(tag);
    if (text !== undefined) element.textContent = text;
    if (className) element.className = className;
    return element;
  }
  function svgNode(tag, attributes, text) {
    const element = document.createElementNS(svgNS, tag);
    Object.entries(attributes || {}).forEach(([key, value]) => element.setAttribute(key, String(value)));
    if (text !== undefined) element.textContent = text;
    return element;
  }
  function svgText(parent, x, y, text, options = {}) {
    const element = svgNode('text', { x, y, fill: '#0B3048', 'font-size': 14, ...options }, text);
    parent.append(element);
    return element;
  }
  function wrapLabel(label, limit) {
    const words = label.split(/\s+/);
    const lines = [''];
    words.forEach((word) => {
      const current = lines.length - 1;
      if (lines[current] && `${lines[current]} ${word}`.length > limit) lines.push(word);
      else lines[current] += `${lines[current] ? ' ' : ''}${word}`;
    });
    return lines;
  }
  function drawLabel(parent, x, centerY, label, limit = 43, size = 13) {
    const lines = wrapLabel(label, limit);
    lines.forEach((line, index) => svgText(parent, x, centerY - (lines.length - 1) * 8 + index * 16, line, { 'font-size': size }));
  }
  function initializeSvg(id, width, height, title, note) {
    const svg = $(id);
    svg.replaceChildren();
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    svg.setAttribute('xmlns', svgNS);
    svg.setAttribute('font-family', 'Trebuchet MS, sans-serif');
    svg.setAttribute('role', 'group');
    svg.setAttribute('aria-label', title);
    svg.dataset.title = title;
    svg.dataset.note = note;
    svg.append(svgNode('title', {}, title));
    return svg;
  }
  function interactive(group, label, action) {
    if (!action) return;
    group.setAttribute('tabindex', '0');
    group.setAttribute('role', 'button');
    group.setAttribute('aria-label', label);
    group.addEventListener('click', action);
    group.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); action(); }
    });
  }
  function emptyChart(svg, width, height) {
    svgText(svg, width / 2, height / 2, 'No hay proyectos para esta selección.', { 'text-anchor': 'middle', fill: '#506A7A', 'font-size': 16 });
  }
  function horizontalChart(id, entries, options) {
    const width = exportMode ? (options.width || 900) : Math.max(300, Math.floor($(id).parentElement.clientWidth));
    const compact = width < 600;
    const labelWidth = compact ? 4 : Math.min(options.labelWidth || 310, Math.floor(width * .46));
    const rowHeight = compact ? 74 : (options.rowHeight || 45);
    const height = Math.max(140, entries.length * rowHeight + 20);
    const svg = initializeSvg(id, width, height, options.title, options.note);
    if (!entries.length) return emptyChart(svg, width, height);
    const max = Math.max(...entries.map((entry) => entry.value), 1);
    const plotWidth = width - labelWidth - 55;
    entries.forEach((entry, index) => {
      const group = svgNode('g');
      const y = 8 + index * rowHeight;
      const selectedRow = options.isActive && options.isActive(entry.key);
      group.append(svgNode('rect', { x: 0, y, width, height: rowHeight - 2, fill: selectedRow ? '#E8F3F9' : 'transparent', rx: 5 }));
      if (compact) {
        const lines = wrapLabel(entry.label || String(entry.key), Math.floor((width - 15) / 6.7));
        lines.forEach((line, lineIndex) => svgText(group, 4, y + 18 + lineIndex * 16, line, { 'font-size': 13 }));
      } else {
        drawLabel(group, 4, y + rowHeight / 2 + 3, entry.label || String(entry.key), Math.min(options.labelLimit || 43, Math.floor(labelWidth / 6.7)), options.labelSize || 13);
      }
      const barY = compact ? y + rowHeight - 25 : y + (rowHeight - 19) / 2;
      group.append(svgNode('rect', { x: labelWidth, y: barY, width: plotWidth, height: 19, rx: 3, fill: '#EDF3F6' }));
      group.append(svgNode('rect', { x: labelWidth, y: barY, width: entry.value / max * plotWidth, height: 19, rx: 3, fill: entry.color || options.color || '#07589A' }));
      svgText(group, width - 4, barY + 14, number(entry.value), { 'text-anchor': 'end', 'font-size': 13, 'font-weight': 'bold' });
      group.append(svgNode('title', {}, `${entry.label || entry.key}: ${projectCount(entry.value)}`));
      interactive(group, `${entry.label || entry.key}: ${projectCount(entry.value)}. Seleccionar para filtrar.`, options.onSelect ? () => options.onSelect(entry.key) : null);
      svg.append(group);
    });
  }
  function typeChart(subset) {
    const entries = types.map((type) => ({ key: type, value: subset.filter((project) => project.type === type).length }));
    const width = exportMode ? 800 : Math.max(300, Math.floor($('type-chart').parentElement.clientWidth));
    const height = 340, baseline = 258, plotHeight = 205;
    const svg = initializeSvg('type-chart', width, height, 'Proyectos por tipo de investigación', 'Conteo de códigos de proyecto únicos.');
    if (!subset.length) return emptyChart(svg, width, height);
    const max = Math.max(...entries.map((entry) => entry.value), 1);
    svg.append(svgNode('line', { x1: 25, y1: baseline, x2: width - 25, y2: baseline, stroke: '#D8E4EB' }));
    entries.forEach((entry, index) => {
      const group = svgNode('g');
      const center = width / 8 + index * width / 4;
      const barWidth = Math.min(88, width / 7);
      const barHeight = entry.value / max * plotHeight;
      group.append(svgNode('rect', { x: center - width / 8 + 4, y: 15, width: width / 4 - 8, height: 315, fill: state.type === entry.key ? '#EDF5F9' : 'transparent', rx: 8 }));
      group.append(svgNode('rect', { x: center - barWidth / 2, y: baseline - barHeight, width: barWidth, height: barHeight, fill: colors[entry.key], rx: 5 }));
      svgText(group, center, baseline - barHeight - 13, number(entry.value), { 'text-anchor': 'middle', 'font-weight': 'bold', 'font-size': 22 });
      const label = entry.key === 'Sin clasificación' ? ['Sin', 'clasificación'] : [entry.key];
      label.forEach((line, row) => svgText(group, center, 285 + row * 17, line, { 'text-anchor': 'middle', 'font-size': width < 440 ? 12 : 14 }));
      svgText(group, center, label.length > 1 ? 325 : 310, percent(entry.value, subset.length), { 'text-anchor': 'middle', 'font-size': 12, fill: '#506A7A' });
      interactive(group, `${entry.key}: ${projectCount(entry.value)}. Filtrar por este tipo.`, () => toggleFilter('type', entry.key));
      svg.append(group);
    });
  }
  function areaChart(subset) {
    const dimension = state.dimension;
    const entries = countBy(subset, (project) => project[dimension]);
    const width = exportMode ? 1000 : Math.max(300, Math.floor($('area-chart').parentElement.clientWidth));
    const compact = width < 600;
    const labelWidth = compact ? 4 : 236, rowHeight = compact ? 72 : 53, plotWidth = width - labelWidth - 60;
    const svg = initializeSvg('area-chart', width, Math.max(140, entries.length * rowHeight + 15), `Tipo de investigación por área de ${dimension === 'area' ? 'conocimiento' : 'aplicación'}`, 'Cada proyecto pertenece a un área. Colores: Básica, Aplicada, Tecnológica y Sin clasificación.');
    svg.dataset.legend = 'types';
    $('area-chart-title').textContent = svg.dataset.title;
    if (!entries.length) return emptyChart(svg, width, 140);
    const max = Math.max(...entries.map((entry) => entry.value), 1);
    entries.forEach((entry, index) => {
      const group = svgNode('g');
      const y = index * rowHeight + 8;
      group.append(svgNode('rect', { x: 0, y, width, height: rowHeight - 2, fill: dimension === 'area' && state.area === entry.key ? '#EDF5F9' : 'transparent', rx: 5 }));
      drawLabel(group, 4, y + (compact ? 18 : 29), entry.key, compact ? 43 : 29, 14);
      let x = labelWidth;
      const breakdown = [];
      types.forEach((type) => {
        const count = subset.filter((project) => project[dimension] === entry.key && project.type === type).length;
        breakdown.push(`${type}: ${number(count)}`);
        const segmentWidth = count / max * plotWidth;
        if (count) {
          group.append(svgNode('rect', { x, y: y + (compact ? 35 : 14), width: segmentWidth, height: 24, fill: colors[type] }));
          if (segmentWidth >= 32) svgText(group, x + segmentWidth / 2, y + (compact ? 52 : 31), number(count), { 'text-anchor': 'middle', 'font-size': 12, 'font-weight': 'bold', fill: type === 'Básica' ? '#FFFFFF' : '#0B3048' });
          x += segmentWidth;
        }
      });
      svgText(group, width - 7, y + (compact ? 52 : 31), number(entry.value), { 'text-anchor': 'end', 'font-size': 14, 'font-weight': 'bold' });
      const description = `${entry.key}: ${projectCount(entry.value)}. ${breakdown.join('; ')}.`;
      group.append(svgNode('title', {}, description));
      if (dimension === 'area') interactive(group, `${description} Filtrar por área.`, () => toggleFilter('area', entry.key));
      svg.append(group);
    });
  }
  function pretty(label) {
    const labels = {
      'POR LA U.C.R.': 'Por la UCR', 'POR LA U.C.R. Y ENTE EXTERNO': 'UCR y ente externo',
      'FONDO CIHRED': 'Fondo CIHRED', 'FONDO I+D': 'Fondo I+D', 'FINANCIAMIENTO UCREA': 'Financiamiento UCREA',
      'GRUPOS DE INVESTIGACION': 'Grupos de investigación', 'INVESTIGACION': 'Investigación',
      'MICROBIOLOGIA': 'Microbiología', 'BIOLOGIA MOLECULAR': 'Biología molecular', 'TECNOLOGIA': 'Tecnología',
    };
    if (labels[label]) return labels[label];
    if (!label || label !== label.toLocaleUpperCase('es')) return label;
    const lower = label.toLocaleLowerCase('es');
    return lower.charAt(0).toLocaleUpperCase('es') + lower.slice(1);
  }
  function renderCharts(subset) {
    typeChart(subset);
    areaChart(subset);
    const odsCounts = new Map(countBy(subset, (project) => project.ods).map((entry) => [entry.key, entry.value]));
    const odsEntries = Object.entries(meta.odsTitles).map(([id, label]) => ({ key: String(id), value: odsCounts.get(Number(id)) || 0, label: `ODS ${id} · ${label}` })).sort((a, b) => b.value - a.value || Number(a.key) - Number(b.key));
    horizontalChart('ods-chart', subset.length ? odsEntries : [], { title: 'Proyectos vinculados a cada ODS', note: 'Un proyecto puede asociarse a varios ODS. Se cuenta una vez por objetivo.', labelWidth: 310, width: 900, rowHeight: 42, color: '#07589A', onSelect: (key) => toggleFilter('ods', key), isActive: (key) => state.ods === key });
    const regionEntries = countBy(subset, (project) => project.regions).map((entry) => ({ ...entry, color: '#4AB6D6' }));
    const noRegion = subset.filter((project) => !project.regions.length).length;
    if (noRegion) regionEntries.push({ key: '__none', label: 'Sin ubicación registrada', value: noRegion, color: '#9AAEBB' });
    horizontalChart('region-chart', regionEntries, { title: 'Proyectos con presencia por región', note: 'Cada proyecto cuenta una vez por región. La suma de las regiones puede superar el total de proyectos.', labelWidth: 250, width: 900, rowHeight: 50, onSelect: (key) => toggleFilter('region', key), isActive: (key) => state.region === key });
    const descriptorEntries = countBy(subset, (project) => project.descriptors).slice(0, 12).map((entry) => ({ ...entry, label: pretty(entry.key) }));
    horizontalChart('descriptor-chart', descriptorEntries, { title: 'Descriptores más frecuentes', note: 'Doce descriptores con más proyectos. Un proyecto puede tener varios descriptores.', labelWidth: 330, width: 800, rowHeight: 50, labelLimit: 43, color: '#07589A', onSelect: (key) => toggleFilter('descriptor', key), isActive: (key) => state.descriptor === key });
    const socioEntries = countBy(subset, (project) => project.socio);
    horizontalChart('socio-chart', socioEntries, { title: 'Proyectos por objetivo socioeconómico', note: 'Objetivo socioeconómico registrado para cada proyecto. Conteo de códigos únicos.', labelWidth: 410, width: 900, rowHeight: 55, labelLimit: 53, color: '#4AB6D6', onSelect: (key) => toggleFilter('socio', key), isActive: (key) => state.socio === key });
    const financeEntries = countBy(subset, (project) => project.finance || '__pending').map((entry) => ({ ...entry, label: entry.key === '__pending' ? 'Clasificación por confirmar' : pretty(entry.key), color: entry.key === '__pending' ? '#9AAEBB' : '#07589A' }));
    horizontalChart('finance-chart', financeEntries, { title: 'Proyectos por tipo de financiamiento', note: 'Incluye clasificaciones verificadas y casos pendientes. Las fuentes no contienen montos.', labelWidth: 350, width: 900, rowHeight: 47, labelLimit: 46, onSelect: (key) => toggleFilter('finance', key), isActive: (key) => state.finance === key });
  }
  function filterLabel(key, value) {
    if (key === 'ods') return value === '__none' ? 'Sin ODS registrado' : `ODS ${value} · ${meta.odsTitles[value]}`;
    if (key === 'region') return value === '__none' ? 'Sin ubicación registrada' : `Región ${value}`;
    if (key === 'finance') return value === '__pending' ? 'Financiamiento por confirmar' : pretty(value);
    if (key === 'query') return `Búsqueda: ${value}`;
    return pretty(value);
  }
  function activeFilters() { return filterKeys.filter((key) => state[key]); }
  function refreshFilters() {
    ['area', 'type', 'region', 'ods'].forEach((key) => { $(`${key}-filter`).value = state[key]; });
    $('search-filter').value = state.query;
    $('filter-chips').replaceChildren();
    activeFilters().forEach((key) => {
      const chip = node('button', `${filterLabel(key, state[key])} ×`, 'filter-chip');
      chip.type = 'button';
      chip.setAttribute('aria-label', `Quitar filtro: ${filterLabel(key, state[key])}`);
      chip.addEventListener('click', () => setFilter(key, ''));
      $('filter-chips').append(chip);
    });
    const filters = activeFilters();
    const summary = $('selection-summary');
    summary.replaceChildren(node('strong', projectCount(selected.length)), document.createTextNode(filters.length ? ` de ${number(projects.length)} · ${filters.length} filtro${filters.length === 1 ? '' : 's'} activo${filters.length === 1 ? '' : 's'}` : ' · Vista completa'));
    $('clear-selection').hidden = !filters.length;
    $('reset-filters').disabled = !filters.length;
  }
  function refreshMetrics(subset) {
    const summary = stats(subset);
    $('metric-projects').textContent = number(summary.total);
    $('metric-projects-note').textContent = `${percent(summary.total, projects.length)} del universo de proyectos`;
    $('metric-ods').textContent = number(summary.withOds);
    $('metric-ods-note').textContent = `${percent(summary.withOds, summary.total)} de la selección`;
    $('metric-regions').textContent = number(summary.withRegion);
    $('metric-regions-note').textContent = `${percent(summary.withRegion, summary.total)} de la selección`;
    $('metric-finance').textContent = number(summary.financeVerified);
    $('metric-finance-note').textContent = `${percent(summary.financeVerified, summary.total)} de la selección`;
    const classifiedCounts = countBy(subset.filter((project) => project.type !== 'Sin clasificación'), (project) => project.type);
    const dominant = classifiedCounts[0];
    $('dominant-type-count').textContent = number(dominant ? dominant.value : 0);
    $('dominant-type-label').textContent = dominant ? `Proyectos de investigación ${dominant.key.toLocaleLowerCase('es')}` : 'Proyectos clasificados';
    $('type-insight').textContent = dominant ? `${percent(dominant.value, summary.total)} de los proyectos de la selección pertenece a esta clasificación.` : 'La selección actual no contiene proyectos con una de las tres clasificaciones principales.';
    $('unclassified-count').textContent = number(summary.unclassified);
    $('unclassified-note').textContent = summary.unclassified === 1 ? 'proyecto pendiente de clasificación' : 'proyectos pendientes de clasificación';
    $('ods-percent').textContent = percent(summary.withOds, summary.total);
    document.querySelector('.circle-stat').style.setProperty('--progress', `${summary.total ? summary.withOds / summary.total * 100 : 0}%`);
    $('without-ods').textContent = number(summary.total - summary.withOds);
    $('region-presences').textContent = number(summary.regionPresences);
    $('multiregion-count').textContent = number(summary.multipleRegions);
    $('without-region').textContent = number(summary.total - summary.withRegion);
    $('finance-percent').textContent = percent(summary.financeVerified, summary.total);
    $('finance-coverage').textContent = `Clasificación confirmada en ambos archivos de financiamiento: ${number(summary.financeVerified)} de ${projectCount(summary.total)} en la selección.`;
    $('finance-missing').textContent = number(summary.financeMissing);
    $('finance-conflict').textContent = number(summary.financeConflict);
  }
  function sortedProjects() {
    return [...selected].sort((a, b) => {
      if (state.sort === 'ods') return b.ods.length - a.ods.length || a.id.localeCompare(b.id, 'es');
      return a[state.sort].localeCompare(b[state.sort], 'es') || a.id.localeCompare(b.id, 'es');
    });
  }
  function typeBadge(type) {
    const className = { 'Aplicada': 'applied', 'Tecnológica': 'technology', 'Sin clasificación': 'unknown' }[type] || '';
    return node('span', type, `type-badge ${className}`);
  }
  function renderTable() {
    const pageSize = 15;
    const ordered = sortedProjects();
    const pageCount = Math.max(1, Math.ceil(ordered.length / pageSize));
    state.page = Math.min(state.page, pageCount);
    const start = (state.page - 1) * pageSize;
    $('project-rows').replaceChildren();
    ordered.slice(start, start + pageSize).forEach((project) => {
      const row = node('tr');
      const codeCell = node('td');
      const link = node('button', project.id, 'project-link');
      link.type = 'button';
      link.setAttribute('aria-label', `Ver detalles del proyecto ${project.id}`);
      link.addEventListener('click', () => showProject(project));
      codeCell.append(link);
      const typeCell = node('td'); typeCell.append(typeBadge(project.type));
      const odsCell = node('td');
      project.ods.forEach((id) => { const tag = node('span', String(id), 'ods-tag'); tag.title = `ODS ${id}: ${meta.odsTitles[id]}`; odsCell.append(tag); });
      if (!project.ods.length) odsCell.append(node('span', 'Sin registro', 'muted'));
      row.append(codeCell, typeCell, node('td', project.area), odsCell, node('td', project.regions.join(', ') || 'Sin ubicación'));
      $('project-rows').append(row);
    });
    if (!ordered.length) { const row = node('tr'); const cell = node('td', 'No hay coincidencias. Ajusta o restablece los filtros.', 'empty-row'); cell.colSpan = 5; row.append(cell); $('project-rows').append(row); }
    $('table-summary').textContent = `${projectCount(ordered.length)} en la selección. Selecciona un código para ver el detalle.`;
    $('page-summary').textContent = ordered.length ? `${number(start + 1)}–${number(Math.min(start + pageSize, ordered.length))} de ${number(ordered.length)} · Página ${state.page} de ${pageCount}` : '0 proyectos';
    $('previous-page').disabled = state.page <= 1;
    $('next-page').disabled = state.page >= pageCount;
    $('download-csv').disabled = !ordered.length;
  }
  function showProject(project) {
    $('dialog-title').textContent = project.id;
    const list = node('dl');
    const fields = [
      ['Tipo de investigación', project.type], ['Área de conocimiento', project.area], ['Área de aplicación', project.application],
      ['Unidad responsable', pretty(project.unit)], ['Objetivo socioeconómico', project.socio],
      ['ODS vinculados', project.ods.map((id) => `ODS ${id}: ${meta.odsTitles[id]}`).join(' · ') || 'Sin ODS registrado'],
      ['Regiones', project.regions.join(', ') || 'Sin ubicación registrada'],
      ['Financiamiento', project.finance ? pretty(project.finance) : project.financeStatus],
      ['Descriptores', project.descriptors.map(pretty).join(' · ') || 'Sin descriptores registrados'],
    ];
    fields.forEach(([label, value]) => list.append(node('dt', label), node('dd', value)));
    $('dialog-content').replaceChildren(list);
    $('project-dialog').showModal();
  }
  function render() {
    selected = filterProjects(projects, state);
    refreshFilters(); refreshMetrics(selected); renderCharts(selected); renderTable();
  }
  function setFilter(key, value) { state[key] = value; state.page = 1; render(); }
  function toggleFilter(key, value) { setFilter(key, state[key] === value ? '' : value); }
  function reset() { filterKeys.forEach((key) => { state[key] = ''; }); state.page = 1; render(); }
  function populate(id, options) {
    options.forEach(({ value, label }) => { const option = node('option', label); option.value = value; $(id).append(option); });
  }
  function toast(text) {
    clearTimeout(toastTimer); $('toast').textContent = text; $('toast').classList.add('visible');
    toastTimer = setTimeout(() => $('toast').classList.remove('visible'), 4500);
  }
  function download(blob, filename) {
    const url = URL.createObjectURL(blob);
    const anchor = node('a'); anchor.href = url; anchor.download = filename; document.body.append(anchor); anchor.click(); anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }
  function exportScope() {
    return activeFilters().length ? activeFilters().map((key) => filterLabel(key, state[key])).join(' · ') : 'Todos los proyectos de investigación';
  }
  async function exportChart(id, button) {
    const originalText = button.textContent;
    button.disabled = true; button.textContent = 'Preparando…';
    try {
      exportMode = true;
      renderCharts(selected);
      const source = $(id).cloneNode(true);
      exportMode = false;
      renderCharts(selected);
      const [, , width, height] = source.getAttribute('viewBox').split(' ').map(Number);
      const scopeLines = wrapLabel(exportScope(), 110);
      const noteLines = wrapLabel(source.dataset.note, 115);
      const top = 112 + (scopeLines.length - 1) * 18;
      const legendHeight = source.dataset.legend ? 42 : 0;
      const outputHeight = top + height + 54 + noteLines.length * 18 + legendHeight;
      const root = svgNode('svg', { xmlns: svgNS, width: width + 64, height: outputHeight, viewBox: `0 0 ${width + 64} ${outputHeight}`, 'font-family': 'Trebuchet MS, sans-serif' });
      root.append(svgNode('rect', { width: '100%', height: '100%', fill: '#FFFFFF' }));
      svgText(root, 32, 35, 'INVESTIGACIÓN UCR · 2026', { fill: '#07589A', 'font-size': 11, 'font-weight': 'bold', 'letter-spacing': 2 });
      svgText(root, 32, 66, source.dataset.title, { 'font-size': 23, 'font-weight': 'bold' });
      scopeLines.forEach((line, index) => svgText(root, 32, 90 + index * 18, `${index === 0 ? `${number(selected.length)} proyectos · ` : ''}${line}`, { 'font-size': 12, fill: '#506A7A' }));
      const chart = source.cloneNode(true);
      chart.removeAttribute('id'); chart.setAttribute('x', '32'); chart.setAttribute('y', String(top)); chart.setAttribute('width', width); chart.setAttribute('height', height);
      root.append(chart);
      let footerY = top + height + 25;
      if (source.dataset.legend) {
        types.forEach((type, index) => { root.append(svgNode('rect', { x: 32 + index * 200, y: footerY - 10, width: 11, height: 11, fill: colors[type], rx: 2 })); svgText(root, 50 + index * 200, footerY, type, { 'font-size': 12 }); });
        footerY += 36;
      }
      noteLines.forEach((line, index) => svgText(root, 32, footerY + index * 18, line, { 'font-size': 11, fill: '#506A7A' }));
      const xml = new XMLSerializer().serializeToString(root);
      const image = new Image();
      await new Promise((resolve, reject) => { image.onload = resolve; image.onerror = reject; image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(xml)}`; });
      const canvas = document.createElement('canvas'); canvas.width = (width + 64) * 2; canvas.height = outputHeight * 2;
      const context = canvas.getContext('2d'); context.scale(2, 2); context.drawImage(image, 0, 0);
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
      if (!blob) throw new Error('PNG unavailable');
      download(blob, `UCR_2026_${id}.png`);
      toast('Gráfico descargado con los filtros activos.');
    } catch (error) { console.error(error); toast('No se pudo generar el PNG. Intenta nuevamente o utiliza Imprimir vista.'); }
    finally { if (exportMode) { exportMode = false; renderCharts(selected); } button.disabled = false; button.textContent = originalText; }
  }
  function exportCsv() {
    const headers = ['Código proyecto', 'Tipo investigación', 'Área conocimiento', 'Área aplicación', 'Unidad responsable', 'ODS', 'Regiones', 'Objetivo socioeconómico', 'Descriptores', 'Financiamiento verificado', 'Estado financiamiento'];
    const rows = sortedProjects().map((project) => [project.id, project.type, project.area, project.application, project.unit, project.ods.map((id) => `ODS ${id}: ${meta.odsTitles[id]}`).join(' | '), project.regions.join(' | '), project.socio, project.descriptors.join(' | '), project.finance, project.financeStatus]);
    const escape = (value) => { let text = String(value ?? ''); if (/^[=+\-@]/.test(text)) text = `'${text}`; return `"${text.replace(/"/g, '""')}"`; };
    const csv = '\uFEFF' + [headers, ...rows].map((row) => row.map(escape).join(';')).join('\r\n');
    download(new Blob([csv], { type: 'text/csv;charset=utf-8;' }), `UCR_2026_proyectos_${selected.length}.csv`);
    toast(`${number(selected.length)} proyectos descargados.`);
  }

  populate('area-filter', [...new Set(projects.map((project) => project.area))].sort((a, b) => a.localeCompare(b, 'es')).map((area) => ({ value: area, label: area })));
  populate('type-filter', types.map((type) => ({ value: type, label: type })));
  populate('region-filter', [...new Set(projects.flatMap((project) => project.regions))].sort((a, b) => a.localeCompare(b, 'es')).map((region) => ({ value: region, label: region })).concat({ value: '__none', label: 'Sin ubicación registrada' }));
  populate('ods-filter', Object.entries(meta.odsTitles).map(([id, label]) => ({ value: id, label: `ODS ${id} · ${label}` })).concat({ value: '__none', label: 'Sin ODS registrado' }));
  ['area', 'type', 'region', 'ods'].forEach((key) => $(`${key}-filter`).addEventListener('change', (event) => setFilter(key, event.target.value)));
  let searchTimer;
  $('search-filter').addEventListener('input', (event) => { const value = event.target.value; clearTimeout(searchTimer); searchTimer = setTimeout(() => setFilter('query', value), 180); });
  $('reset-filters').addEventListener('click', reset); $('clear-selection').addEventListener('click', reset);
  $('filter-no-ods').addEventListener('click', () => toggleFilter('ods', '__none'));
  document.querySelectorAll('[data-dimension]').forEach((button) => button.addEventListener('click', () => { state.dimension = button.dataset.dimension; document.querySelectorAll('[data-dimension]').forEach((item) => { const active = item === button; item.classList.toggle('active', active); item.setAttribute('aria-pressed', String(active)); }); areaChart(selected); }));
  $('table-sort').addEventListener('change', (event) => { state.sort = event.target.value; state.page = 1; renderTable(); });
  $('previous-page').addEventListener('click', () => { state.page--; renderTable(); }); $('next-page').addEventListener('click', () => { state.page++; renderTable(); });
  $('close-dialog').addEventListener('click', () => $('project-dialog').close());
  $('project-dialog').addEventListener('click', (event) => { if (event.target === $('project-dialog')) { const bounds = event.target.getBoundingClientRect(); if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) event.target.close(); } });
  $('download-csv').addEventListener('click', exportCsv);
  document.querySelectorAll('[data-chart]').forEach((button) => button.addEventListener('click', () => exportChart(button.dataset.chart, button)));
  document.querySelectorAll('.print-button').forEach((button) => button.addEventListener('click', () => window.print()));
  let resizeTimer;
  window.addEventListener('resize', () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(() => renderCharts(selected), 120); });
  window.addEventListener('beforeprint', () => { exportMode = true; renderCharts(selected); });
  window.addEventListener('afterprint', () => { exportMode = false; renderCharts(selected); });
  render();
})();
