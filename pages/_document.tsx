import { Toaster } from "@/components/ui/toaster";
import Document, { Head, Html, Main, NextScript } from "next/document";

class MyDocument extends Document {
  render() {
    return (
      <Html lang="en">
        <Head>
          <link rel="icon" href="/favicon.ico" />
          <meta
            name="description"
            content="Run OCR locally on PDFs and Images"
          />
          <meta property="og:site_name" content="chatify-ocr.vercel.app" />
          <meta
            property="og:description"
            content="Run OCR locally on PDFs and Images"
          />
          <meta property="og:title" content="Run OCR locally" />
          <meta name="twitter:card" content="summary_large_image" />
          <meta name="twitter:title" content="Run OCR locally" />
          <meta
            name="twitter:description"
            content="Run OCR locally on PDFs and Images"
          />
          <meta
            property="og:image"
            content="https://chatify-ocr.vercel.app/og-image.png"
          />
          <meta
            name="twitter:image"
            content="https://chatify-ocr.vercel.app/og-image.png"
          />
        </Head>
        <body>
          <Main />
          <Toaster />
          <NextScript />
        </body>
      </Html>
    );
  }
}

export default MyDocument;
