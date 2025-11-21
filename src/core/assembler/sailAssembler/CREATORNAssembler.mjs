let linkerText = null;

export async function loadlinker(is32b) {
  const file = is32b ? 'linker32.ld' : 'linker64.ld';

  // Resuelve la ruta relativa al propio módulo (no a la página)
  const url = new URL(`./linkers/${file}`, import.meta.url);

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`No se pudo cargar ${file}: ${res.status} ${res.statusText}`);
  }

  linkerText = await res.text(); // <-- aquí sí con await
//   console.log('Linker cargado:', file, '\n----\n', linkerText, '\n----');
  return linkerText;
}