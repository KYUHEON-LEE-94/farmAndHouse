"""Prepare generated UI background and workshop illustration atlases for the game."""

from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
GENERATED = Path(r"C:\Users\user\.codex\generated_images\01a132a5-79e3-7f93-8c34-bb6ebc022704")
BACKGROUND_DIR = ROOT / "public" / "images" / "ui" / "backgrounds"
WORKSHOP_DIR = ROOT / "public" / "images" / "workshop"

WORKSHOP_BACKGROUND = GENERATED / "exec-5b043dff-6e9a-4eb0-b10e-4234599426a3.png"
STATION_ATLAS = GENERATED / "exec-15d743a7-d8c0-4eec-8571-6a2f88f692a2.png"

ATLASES = {
    GENERATED / "exec-7e3b0412-96c9-467a-8074-b36aa3b635b8.png": [
        "farm.webp", "fishing.webp", "hunting.webp", "raid-tower.webp",
    ],
    GENERATED / "exec-5f574298-f103-468b-8a06-3a382e0e9c12.png": [
        "storage.webp", "equipment.webp", "collection.webp", "pets.webp",
    ],
    GENERATED / "exec-e629a85d-a2e0-4eb7-8191-2bd21773473d.png": [
        "shop.webp", "casino.webp", "missions.webp", "exploration.webp",
    ],
}

STATION_NAMES = ["fermentation-jar.webp", "drying-rack.webp", "copper-pot.webp", "artisan-press.webp"]


def quadrant_boxes(width: int, height: int) -> list[tuple[int, int, int, int]]:
    gutter = max(4, round(min(width, height) * 0.006))
    half_w, half_h = width // 2, height // 2
    return [
        (0, 0, half_w - gutter, half_h - gutter),
        (half_w + gutter, 0, width, half_h - gutter),
        (0, half_h + gutter, half_w - gutter, height),
        (half_w + gutter, half_h + gutter, width, height),
    ]


def save_webp(image: Image.Image, destination: Path, quality: int = 88) -> None:
    destination.parent.mkdir(parents=True, exist_ok=True)
    image.convert("RGB").save(destination, "WEBP", quality=quality, method=6)


def split_atlas(source: Path, destinations: list[Path]) -> None:
    with Image.open(source) as atlas:
        for box, destination in zip(quadrant_boxes(*atlas.size), destinations, strict=True):
            save_webp(atlas.crop(box), destination)


def main() -> None:
    with Image.open(WORKSHOP_BACKGROUND) as image:
        save_webp(image, BACKGROUND_DIR / "workshop.webp", quality=90)

    for source, names in ATLASES.items():
        split_atlas(source, [BACKGROUND_DIR / name for name in names])

    split_atlas(STATION_ATLAS, [WORKSHOP_DIR / name for name in STATION_NAMES])


if __name__ == "__main__":
    main()
