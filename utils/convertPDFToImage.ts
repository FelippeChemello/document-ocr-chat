// @ts-expect-error
import * as pdfjs from "pdfjs-dist/build/pdf";
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

export const convertPDFToImage = async (pdf: File) => {
  const pdfData = await pdfjs.getDocument({ data: await pdf.arrayBuffer() }).promise

  const images = [];
  for (let pageNumber = 1; pageNumber <= pdfData.numPages; pageNumber++) {
    const page = await pdfData.getPage(pageNumber);
    const viewport = page.getViewport({ scale: 1.5 });
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Canvas context not found");
    }

    canvas.height = viewport.height;
    canvas.width = viewport.width;

    await page.render({
      canvasContext: ctx,
      viewport: viewport,
    }).promise;

    images.push(canvas.toDataURL("image/png"));
  }
  return images;
};