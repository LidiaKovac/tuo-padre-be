Thank you for the image example — this provides a much clearer picture of the layout challenges you're working with. Here's how I’d rework the pipeline to handle this type of flyer, considering the *lack of defined borders*, *dense layout*, and *variability between pages*:

---

### 🧠 **Updated Approach: Fully Automated PDF-to-Structured-Data Pipeline for Sales Flyers**

---

### 🔁 **1. Convert PDF to Images**

Use a reliable library to rasterize the PDF into individual images:

```bash
pdfimages -png input.pdf output_prefix
```

Or in Node.js:

```ts
// Example with pdf-poppler or pdf-lib + sharp
```

---

### 🖼️ **2. Segment the Flyer into Product Tiles**

Since there are **no clean gridlines or borders**, you'll need a custom image segmentation strategy:

#### 🔍 a. **Edge-aware Segmentation Using Layout + Text Clustering**

Use one of:

* [📚 Detectron2](https://github.com/facebookresearch/detectron2) or [YOLOv8](https://github.com/ultralytics/ultralytics) trained on your flyer format
    - I asked ChatGPT if it's doable, here is a summary: 
        - we can use google colab for python (it has free gpu) and training.  
        - There are tools like labelimg and roboflow to annotate the flyers. 
        - We will need around 20 annotated flyers for a proof of concept, then we should move on to 50-100
        - Annotations will have to be exported in COCO format. 
        - The model can be exported in a .pth file
        - We will need to build a python microservice and host it somewhere (ChatGPT suggests FastAPI)
        - Suggestion is to use position-based detection doing OCR (Tesseract) to preserve layout info (Tesseract with --psm 6 + TSV output) or EasyOCR, then check where the data is located. For example in Lidl, the price is bottom right, the product hame is top right
        - It also suggests to pair this with a regex filter
        - Optional / advanced, fine tune a ML model like sklearn or tiny transformer to learn patterns of font size, text position, content
        - The microservice should, ideally: 
          - Detect the regions
          - Cut the cropped regions 
          - Run OCR on them
          - Return an array of products
        - ChatGPT's estimate is that this endpoint would take around 10 seconds on CPU only setup
        - This is the chat link where all the instructions are https://chatgpt.com/c/6866e1c3-6740-8011-9306-49accaceb0d8
        - 
---


### 📦 6. (Optional) Crop Individual Product Images

Once product tiles are identified, use OpenCV to crop each product's box and store it as an image (for display in frontend).

---

### 🧰 **Tools and Libraries (All Free/Open-Source)**

| Task                      | Tools                                                     |
| ------------------------- | --------------------------------------------------------- |
| PDF to Image              | `pdfimages`, `pdf2image`, `Poppler`, `pdf-lib`            |
| OCR                       | `Tesseract` (with `--psm 6` or `11`, lang: `ita+eng`)     |
| Image Segmentation        | `OpenCV` (contours, edge detection), `scikit-image`, YOLO |
| Text Clustering + Mapping | `DBSCAN`, `spaCy` + custom rules                          |
| Post-processing OCR       | Custom JS/TS/Node logic or Python regex pipelines         |
| Output                    | JSON, CSV, + cropped images                               |

---

### 💡 Recommendations

* Start with **manual annotation** of a few pages to train a basic model (or just heuristics).
* Normalize all text to lowercase and strip whitespace/punctuation for matching.
* Use **flexible regex rules** to extract prices (`/(\d+[.,]\d{2})/`), units (`/\d+\s?(g|kg|ml|l|pz)/`), discounts (`/-\d+%/`).
* If performance is an issue, run OCR and segmentation once and cache the results.

---

Would you like a working **Node.js** script with PDF parsing + Tesseract + image cropping to test the pipeline? Or do you need help creating the **segmentation model/rules** next?
