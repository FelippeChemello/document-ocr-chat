"use client"

import { NextPage } from 'next';
import Head from 'next/head';
import { useState } from 'react';
import Dropzone from 'react-dropzone'
import LoadingDots from '@/components/LoadingDots';
import { convertPDFToImage } from '@/utils/convertPDFToImage';
import { ocr } from '@/utils/ocr';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';

const Home: NextPage = () => {
  const [images, setImages] = useState<Array<{image: string, text: string }> | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const {toast} = useToast();

  const runOCR = async (file: File) => {
    setLoading(true);

    try {
      let images = [];
      if (file.type.includes('pdf')) {
        toast({
          title: 'Preparing PDF for OCR',
        })
        const imageStrings = await convertPDFToImage(file)
        images.push(...imageStrings);
      } else {
        const imageString = URL.createObjectURL(file);
        images.push(imageString);
      }

      toast({
        title: 'Running OCR on your document',
      })

      const ocrs = await ocr(images);
      setImages(images.map((image, index) => ({image, text: ocrs[index]})));
      console.log(ocrs.map(ocr => ocr + '\n\n'))
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }

  const UploadDropZone = () => (
    <Dropzone
      onDropRejected={() => {
        setError('Please upload a valid PDF or image file');
      }}
      onDropAccepted={() => setError(null)}
      onDrop={(uploadedFiles) => {
        if (uploadedFiles.length !== 0) {
          const file = uploadedFiles[0];
          runOCR(file);
        }
      }}
      accept={{
        "pdf": ["application/pdf"],
        "image": ["image/png", "image/jpeg", "image/jpg"]
      }}
    >
      {({ getRootProps, getInputProps }) => (
        <div {...getRootProps()} className="flex flex-col items-center justify-center border-4 border-dashed border-gray-300 rounded-2xl w-full h-96 gap-8">
          <input {...getInputProps()} />
          <p className="text-slate-700 text-xl">Drag and drop a Document, or click to select a file</p>
          <p className="text-gray-500 text-sm">Only PDF and PNG, JPG and JPEG files are allowed</p>
        </div>
      )}
    </Dropzone>
  );

  return (
    <div className="flex max-w-6xl mx-auto flex-col items-center justify-center py-2 min-h-screen">
      <Head>
        <title>OCR</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className="flex flex-1 w-full flex-col items-center justify-center text-center px-4 mt-4 sm:mb-0 mb-8">
        <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl">
          Run OCR on your documents
        </h1>
        <h2 className="scroll-m-20 text-3xl font-semibold tracking-tight">
          and chat with them
        </h2>

        <div className="flex space-x-2 justify-center mt-2">
          {images && !loading && (
            <>
              <Button
                onClick={() => {
                  setImages(null);
                  setImages(null);
                  setError(null);
                }}
              >
                Upload New Document
              </Button>
              <Button
                onClick={() => {
                  localStorage.setItem('ocr', JSON.stringify(images));
                  window.location.href = '/chat';
                }}
                variant='secondary'
              >
                Chat with this document
              </Button>
            </>
          )}
        </div>

        <div className="flex justify-between items-center w-full flex-col mt-4">          
          {!images && !loading && (
            <UploadDropZone />
          )}

          <div className="flex sm:space-x-4 flex-col gap-4 w-full">
            {images && (
              <div className="relative w-full flex justify-between">
                <h2 className="flex-1 mb-1 font-medium text-lg">Your document</h2>
                <h2 className="flex-1 mb-1 font-medium text-lg">Identified text</h2>
              </div>
            )}
                
            {images && images.map((image, index) => (
              <div key={index} className="w-full h-96 flex justify-between gap-4">
                <img src={image.image} className="h-full object-contain flex-1" />

                <Textarea className="resize-none flex-1 w-full h-full text-gray-900 bg-gray-50 rounded-lg border border-gray-300" readOnly value={image.text} />
              </div>
            ))}
          </div>

          {loading && (
            <button
              disabled
              className="bg-black rounded-full text-white font-medium px-4 pt-2 pb-3 mt-8 hover:bg-black/80 w-40"
            >
              <span className="pt-4">
                <LoadingDots color="white" style="large" />
              </span>
            </button>
          )}

          {error && (
            <div
              className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-xl mt-8 max-w-[575px]"
              role="alert"
            >
              {error} 
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Home;
