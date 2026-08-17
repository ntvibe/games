(() => {
  "use strict";

  const CHARACTER_PARTS = Array.from({ length: 5 }, (_, index) =>
    `./assets/character.${String(index).padStart(2, "0")}.b64`
  );

  async function loadCharacter() {
    const parts = await Promise.all(CHARACTER_PARTS.map(async (path) => {
      const response = await fetch(path);
      if (!response.ok) throw new Error(`Could not load ${path}`);
      return (await response.text()).trim();
    }));

    const binary = atob(parts.join(""));
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);

    const character = document.getElementById("characterBase");
    if (!character) return;
    character.src = URL.createObjectURL(new Blob([bytes], { type: "image/webp" }));
  }

  loadCharacter().catch((error) => console.error("Character art failed to load:", error));
})();
