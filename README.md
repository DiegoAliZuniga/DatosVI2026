# Explorador de la investigación UCR 2026

Sitio estático, sin instalación ni dependencias externas. Los archivos de `dist/` funcionan al abrir `index.html` y se pueden publicar en GitHub Pages.

## Contenido

- 1.427 códigos de proyectos únicos del Informe VI 2026.
- Filtros combinables por área, tipo de investigación, región, ODS y búsqueda de código o tema.
- Selección adicional desde las barras de descriptores, objetivos socioeconómicos y financiamiento.
- Figuras PNG con la selección activa, tabla de detalle y exportación CSV.
- Tipologías exclusivas de proyectos, con 2 registros sin clasificación.
- ODS, regiones y descriptores deduplicados por proyecto.
- Financiamiento verificable en 1.397 proyectos; 29 sin registro y C3315 con categorías contradictorias.

El financiamiento describe categorías, no montos. Las presencias regionales y los vínculos con ODS pueden superar el número de proyectos.

## GitHub Pages

Publica el contenido de `dist/` en la raíz de un repositorio o en su carpeta `docs/`, y selecciona esa ubicación en la configuración de Pages. Conserva juntos todos los archivos de `dist/`.

## Datos

La extracción local se genera con `work/build_site_data.py` desde la base depurada y el cruce de financiamiento de esta conversación. El sitio no actualiza los datos automáticamente.

## Diseño

Paleta conservada: azul `#07589A`, celeste `#4AB6D6` y amarillo `#F3C633`. Se aplicaron los principios de accesibilidad, jerarquía y visualización de datos de [Apple Design Skill](https://github.com/dickwu/apple-design-skill).
