import argparse
import ast
import random
import shutil
from pathlib import Path


ROOT = Path(__file__).resolve().parent
DATA_DIR = ROOT / "data"
SOURCE_DATA_YAML = DATA_DIR / "data.yaml"
AUTOSPLIT_DIR = DATA_DIR / "_autosplit"


def parse_names_from_yaml(data_yaml: Path) -> list[str]:
	names: list[str] = ["product"]
	if not data_yaml.exists():
		return names

	for line in data_yaml.read_text(encoding="utf-8").splitlines():
		stripped = line.strip()
		if stripped.startswith("names:"):
			_, raw = stripped.split(":", 1)
			raw = raw.strip()
			if raw:
				try:
					parsed = ast.literal_eval(raw)
					if isinstance(parsed, list) and parsed:
						names = [str(item) for item in parsed]
				except (ValueError, SyntaxError):
					pass
			break

	return names


def has_expected_split_dirs() -> bool:
	expected = [
		DATA_DIR / "train" / "images",
		DATA_DIR / "train" / "labels",
		DATA_DIR / "valid" / "images",
		DATA_DIR / "valid" / "labels",
	]
	return all(path.exists() for path in expected)


def choose_split_counts(total: int, val_ratio: float, test_ratio: float) -> tuple[int, int, int]:
	if total < 3:
		raise ValueError("Need at least 3 images to create train/valid/test splits.")

	n_val = max(1, round(total * val_ratio))
	n_test = max(1, round(total * test_ratio))
	n_train = total - n_val - n_test

	if n_train < 1:
		n_train = 1
		overflow = (n_val + n_test + n_train) - total
		if overflow > 0 and n_test > 1:
			cut = min(overflow, n_test - 1)
			n_test -= cut
			overflow -= cut
		if overflow > 0 and n_val > 1:
			cut = min(overflow, n_val - 1)
			n_val -= cut

	return n_train, n_val, n_test


def reset_autosplit_dir() -> None:
	if AUTOSPLIT_DIR.exists():
		shutil.rmtree(AUTOSPLIT_DIR)
	for split in ("train", "valid", "test"):
		(AUTOSPLIT_DIR / split / "images").mkdir(parents=True, exist_ok=True)
		(AUTOSPLIT_DIR / split / "labels").mkdir(parents=True, exist_ok=True)


def copy_image_and_label(image_path: Path, split: str) -> None:
	label_source = DATA_DIR / "train" / "labels" / f"{image_path.stem}.txt"
	image_target = AUTOSPLIT_DIR / split / "images" / image_path.name
	label_target = AUTOSPLIT_DIR / split / "labels" / f"{image_path.stem}.txt"

	shutil.copy2(image_path, image_target)
	if label_source.exists():
		shutil.copy2(label_source, label_target)
	else:
		label_target.write_text("", encoding="utf-8")


def build_autosplit_yaml(names: list[str]) -> Path:
	yaml_path = AUTOSPLIT_DIR / "data.yaml"
	names_text = ", ".join(f"'{name}'" for name in names)
	yaml_path.write_text(
		"\n".join(
			[
				f"path: {AUTOSPLIT_DIR.as_posix()}",
				"train: train/images",
				"val: valid/images",
				"test: test/images",
				"",
				f"nc: {len(names)}",
				f"names: [{names_text}]",
				"",
			]
		),
		encoding="utf-8",
	)
	return yaml_path


def create_autosplits(seed: int, val_ratio: float, test_ratio: float) -> Path:
	train_images_dir = DATA_DIR / "train" / "images"
	if not train_images_dir.exists():
		raise FileNotFoundError(f"Missing train images directory: {train_images_dir}")

	image_files = sorted(
		[
			p
			for p in train_images_dir.iterdir()
			if p.is_file() and p.suffix.lower() in {".jpg", ".jpeg", ".png", ".webp", ".bmp"}
		]
	)
	if len(image_files) < 3:
		raise ValueError("Not enough training images to autosplit.")

	rng = random.Random(seed)
	rng.shuffle(image_files)

	n_train, n_val, n_test = choose_split_counts(len(image_files), val_ratio, test_ratio)
	train_slice = image_files[:n_train]
	val_slice = image_files[n_train : n_train + n_val]
	test_slice = image_files[n_train + n_val : n_train + n_val + n_test]

	reset_autosplit_dir()

	for image in train_slice:
		copy_image_and_label(image, "train")
	for image in val_slice:
		copy_image_and_label(image, "valid")
	for image in test_slice:
		copy_image_and_label(image, "test")

	names = parse_names_from_yaml(SOURCE_DATA_YAML)
	autosplit_yaml = build_autosplit_yaml(names)
	print(
		f"Created autosplit dataset: train={len(train_slice)}, valid={len(val_slice)}, test={len(test_slice)}"
	)
	return autosplit_yaml


def pick_data_yaml(seed: int, val_ratio: float, test_ratio: float) -> Path:
	if has_expected_split_dirs() and SOURCE_DATA_YAML.exists():
		print(f"Using existing Roboflow splits from: {SOURCE_DATA_YAML}")
		return SOURCE_DATA_YAML
	print("Roboflow valid/test folders not found. Building deterministic autosplit dataset.")
	return create_autosplits(seed=seed, val_ratio=val_ratio, test_ratio=test_ratio)


def run_training(args: argparse.Namespace) -> None:
	try:
		from ultralytics import YOLO
	except ImportError as exc:
		raise SystemExit(
			"ultralytics is not installed. Run: pip install ultralytics"
		) from exc

	data_yaml = pick_data_yaml(args.seed, args.val_ratio, args.test_ratio)

	model = YOLO(args.model)
	model.train(
		data=str(data_yaml),
		epochs=args.epochs,
		imgsz=args.imgsz,
		batch=args.batch,
		device=args.device,
		workers=args.workers,
		patience=args.patience,
		seed=args.seed,
		project=str(ROOT / "runs"),
		name=args.run_name,
	)

	run_dir = Path(model.trainer.save_dir)
	best_weights = run_dir / "weights" / "best.pt"
	if best_weights.exists():
		print(f"Running validation with: {best_weights}")
		YOLO(str(best_weights)).val(data=str(data_yaml), split="val", device=args.device)
		YOLO(str(best_weights)).val(data=str(data_yaml), split="test", device=args.device)
	else:
		print("Warning: best.pt not found, skipping post-train eval.")

	print(f"Training outputs saved to: {run_dir}")


def build_parser() -> argparse.ArgumentParser:
	parser = argparse.ArgumentParser(description="Train product detection model with YOLO.")
	parser.add_argument("--model", default="yolov8s.pt", help="Base model checkpoint.")
	parser.add_argument("--epochs", type=int, default=100, help="Training epochs.")
	parser.add_argument("--imgsz", type=int, default=1280, help="Input image size.")
	parser.add_argument("--batch", type=int, default=8, help="Batch size.")
	parser.add_argument("--device", default="0", help="CUDA device id or 'cpu'.")
	parser.add_argument("--workers", type=int, default=4, help="Dataloader workers.")
	parser.add_argument("--patience", type=int, default=20, help="Early stopping patience.")
	parser.add_argument("--seed", type=int, default=42, help="Random seed.")
	parser.add_argument("--val-ratio", type=float, default=0.2, help="Validation split ratio.")
	parser.add_argument("--test-ratio", type=float, default=0.1, help="Test split ratio.")
	parser.add_argument("--run-name", default="product-detector", help="Run folder name.")
	return parser


if __name__ == "__main__":
	run_training(build_parser().parse_args())
