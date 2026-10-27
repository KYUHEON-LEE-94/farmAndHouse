from pathlib import Path
import sys

from PIL import Image


def main() -> None:
    if len(sys.argv) != 3:
        raise SystemExit("usage: prepare_item_icons.py <source> <destination>")

    source = Path(sys.argv[1])
    destination = Path(sys.argv[2])
    destination.parent.mkdir(parents=True, exist_ok=True)

    with Image.open(source) as image:
        rgba = image.convert("RGBA")
        rgba.thumbnail((224, 224), Image.Resampling.LANCZOS)
        canvas = Image.new("RGBA", (256, 256), (0, 0, 0, 0))
        canvas.alpha_composite(rgba, ((256 - rgba.width) // 2, (256 - rgba.height) // 2))
        canvas.save(destination, "PNG", optimize=True)


if __name__ == "__main__":
    main()
