"""Split the generated 2x2 village restoration atlases into web-ready stage art."""

from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "public" / "images" / "village" / "stages"
SOURCES = {
    "guide-office": Path(r"C:\Users\user\.codex\generated_images\01a132a5-79e3-7f93-8c34-bb6ebc022704\exec-de1c0f9a-952c-4c65-a5cc-84af663678fb.png"),
    "craft-street": Path(r"C:\Users\user\.codex\generated_images\01a132a5-79e3-7f93-8c34-bb6ebc022704\exec-7ef304ea-79e7-40bc-8bc4-8da533cdec97.png"),
    "plaza": Path(r"C:\Users\user\.codex\generated_images\01a132a5-79e3-7f93-8c34-bb6ebc022704\exec-76283bfe-e47c-49a0-9a17-6e1e14ef5f12.png"),
}


def stage_boxes(width: int, height: int) -> list[tuple[int, int, int, int]]:
    # ImageGen atlases use an eight-pixel cross-shaped divider at the centre.
    gutter = max(6, round(min(width, height) * 0.008))
    half_w, half_h = width // 2, height // 2
    return [
        (0, 0, half_w - gutter // 2, half_h - gutter // 2),
        (half_w + gutter // 2, 0, width, half_h - gutter // 2),
        (0, half_h + gutter // 2, half_w - gutter // 2, height),
        (half_w + gutter // 2, half_h + gutter // 2, width, height),
    ]


def main() -> None:
    OUTPUT.mkdir(parents=True, exist_ok=True)
    for facility, source in SOURCES.items():
        with Image.open(source) as atlas:
            rgb = atlas.convert("RGB")
            for stage, box in enumerate(stage_boxes(*rgb.size)):
                panel = rgb.crop(box)
                panel.save(OUTPUT / f"{facility}-{stage}.webp", "WEBP", quality=88, method=6)


if __name__ == "__main__":
    main()
