import Tesseract from 'tesseract.js'

const convertURLStringToCanvas = async (url: string) => {
    return new Promise<HTMLCanvasElement>((resolve, reject) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            throw new Error("Canvas context not found");
        }

        const img = new Image();
        img.src = url;
        img.onload = () => {
            canvas.height = img.height;
            canvas.width = img.width;
            ctx.drawImage(img, 0, 0);

            resolve(canvas);
        }
    })
}

export const ocr = async (images: Array<string>) => {
    const worker = await Tesseract.createWorker('eng')
    
    const texts = [];
    for (const image of images) {
        const imageLike: HTMLCanvasElement = await convertURLStringToCanvas(image) 

        const { data: { text } } = await worker.recognize(imageLike);

        texts.push(text);
    }

    await worker.terminate();

    return texts;
}