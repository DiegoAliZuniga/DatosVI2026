(function (root) {
  'use strict';
  const types = ['Básica', 'Aplicada', 'Tecnológica', 'Sin clasificación'];
  const normalize = (text) => String(text || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es');

  function filterProjects(projects, filters) {
    const query = normalize(filters.query).trim();
    return projects.filter((project) => {
      if (filters.area && project.area !== filters.area) return false;
      if (filters.type && project.type !== filters.type) return false;
      if (filters.region && (filters.region === '__none' ? project.regions.length > 0 : !project.regions.includes(filters.region))) return false;
      if (filters.ods && (filters.ods === '__none' ? project.ods.length > 0 : !project.ods.includes(Number(filters.ods)))) return false;
      if (filters.descriptor && !project.descriptors.includes(filters.descriptor)) return false;
      if (filters.socio && project.socio !== filters.socio) return false;
      if (filters.finance && (filters.finance === '__pending' ? Boolean(project.finance) : project.finance !== filters.finance)) return false;
      return !query || normalize([project.id, project.type, project.area, project.application, project.unit, project.socio, ...project.descriptors, ...project.regions].join(' ')).includes(query);
    });
  }

  function countBy(projects, selector) {
    const counts = new Map();
    projects.forEach((project) => {
      const value = selector(project);
      const values = Array.isArray(value) ? [...new Set(value)] : [value];
      values.forEach((item) => counts.set(item, (counts.get(item) || 0) + 1));
    });
    return [...counts.entries()].map(([key, value]) => ({ key, value })).sort((a, b) => b.value - a.value || String(a.key).localeCompare(String(b.key), 'es'));
  }

  function stats(projects) {
    return {
      total: projects.length,
      withOds: projects.filter((project) => project.ods.length).length,
      withRegion: projects.filter((project) => project.regions.length).length,
      withDescriptor: projects.filter((project) => project.descriptors.length).length,
      regionPresences: projects.reduce((sum, project) => sum + new Set(project.regions).size, 0),
      multipleRegions: projects.filter((project) => new Set(project.regions).size > 1).length,
      financeVerified: projects.filter((project) => project.finance).length,
      financeMissing: projects.filter((project) => !project.finance && project.financeStatus === 'Sin registro de financiamiento').length,
      financeConflict: projects.filter((project) => !project.finance && project.financeStatus !== 'Sin registro de financiamiento').length,
      unclassified: projects.filter((project) => project.type === 'Sin clasificación').length,
    };
  }

  root.ExplorerCore = { types, normalize, filterProjects, countBy, stats };
})(globalThis);
