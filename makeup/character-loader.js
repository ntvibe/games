(() => {
  "use strict";

  const nativeFetch = window.fetch.bind(window);
  const ATLAS_REPAIR_PARTS = Array.from({ length: 4 }, (_, index) =>
    `./assets/atlas.04.${index}.b64`
  );
  const CHARACTER_PARTS = Array.from({ length: 5 }, (_, index) =>
    `./assets/character.${String(index).padStart(2, "0")}.b64`
  );

  window.fetch = async (input, init) => {
    const url = typeof input === "string" ? input : input?.url || "";
    if (url.includes("assets/atlas.04.b64")) {
      const responses = await Promise.all(ATLAS_REPAIR_PARTS.map((path) => nativeFetch(path)));
      if (responses.some((response) => !response.ok)) {
        throw new Error("Could not load repaired accessory atlas segment");
      }
      const repaired = (await Promise.all(responses.map((response) => response.text())))
        .map((part) => part.trim())
        .join("");
      return new Response(repaired, { status: 200, headers: { "Content-Type": "text/plain" } });
    }
    return nativeFetch(input, init);
  };

  async function loadCharacter() {
    const parts = await Promise.all(CHARACTER_PARTS.map(async (path) => {
      const response = await nativeFetch(path);
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
