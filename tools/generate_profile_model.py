from pathlib import Path
import sys


ROOT = Path(__file__).resolve().parents[1]
SOURCE_IMAGE = ROOT / "public" / "assets" / "characters" / "source" / "profile-character.png"
OUTPUT_MODEL = ROOT / "public" / "assets" / "characters" / "models" / "profile-character.glb"
HUNYUAN_REPO = ROOT / "tools" / "Hunyuan3D-2"

sys.path.insert(0, str(HUNYUAN_REPO))

try:
    from PIL import Image
    from hy3dgen.rembg import BackgroundRemover
    from hy3dgen.shapegen import Hunyuan3DDiTFlowMatchingPipeline
except Exception as error:
    print("The Hunyuan3D pipeline is not ready yet.")
    print("Make sure its dependencies are installed before running this script.")
    print(f"Import error: {error}")
    sys.exit(1)

try:
    from hy3dgen.texgen import Hunyuan3DPaintPipeline
    TEXGEN_AVAILABLE = True
    TEXGEN_IMPORT_ERROR = None
except Exception as error:
    Hunyuan3DPaintPipeline = None
    TEXGEN_AVAILABLE = False
    TEXGEN_IMPORT_ERROR = error


def main() -> int:
    if not SOURCE_IMAGE.exists():
        print("Source image not found.")
        print(f"Expected: {SOURCE_IMAGE}")
        print("Place your 2D character image there as profile-character.png, then run this script again.")
        return 1

    print("Loading source image...")
    image = Image.open(SOURCE_IMAGE)

    if image.mode == "RGB":
        print("Removing background...")
        rembg = BackgroundRemover()
        image = rembg(image)

    image = image.convert("RGBA")

    model_path = "tencent/Hunyuan3D-2"

    print("Loading shape generation model...")
    pipeline_shapegen = Hunyuan3DDiTFlowMatchingPipeline.from_pretrained(model_path)

    print("Generating mesh...")
    mesh = pipeline_shapegen(image=image)[0]

    if TEXGEN_AVAILABLE:
        try:
            print("Loading texture generation model...")
            pipeline_texgen = Hunyuan3DPaintPipeline.from_pretrained(model_path)
            print("Texturing mesh...")
            mesh = pipeline_texgen(mesh, image=image)
        except Exception as error:
            print("Texture generation could not complete, so the export will continue with a shape-only model.")
            print(f"Texture error: {error}")
    else:
        print("Texture generation is not available yet, so the export will continue with a shape-only model.")
        print(f"Texture import error: {TEXGEN_IMPORT_ERROR}")

    OUTPUT_MODEL.parent.mkdir(parents=True, exist_ok=True)
    mesh.export(OUTPUT_MODEL)

    print("Finished.")
    print(f"Saved model to: {OUTPUT_MODEL}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
