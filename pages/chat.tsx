import { NextPage } from 'next';
import Head from 'next/head';
import { split } from 'sentence-splitter';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronRight, FileTextIcon, Loader2Icon, LoaderIcon, SendHorizonal, SettingsIcon } from 'lucide-react'
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { twMerge } from 'tailwind-merge';
import { setCookie, getCookie } from 'cookies-next'
import { useChat } from 'ai/react'
import { pipeline, Pipeline } from '@xenova/transformers'
import { Voy } from 'voy-search'
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { FunctionCallPayload } from 'ai';

async function getExtractor() {
  const extractor = await pipeline(
    "feature-extraction",
    "Xenova/all-MiniLM-L6-v2"
  );
  return extractor;
}

async function extract(extractor: Pipeline, text: string) {
  const result = await extractor(text, { pooling: "mean", normalize: true });
  return result.data;
}

type OpenAIMessage = {
  id: string;
  role: 'system' | 'user' | 'assistant' | 'function'
  content: string;
}

const Home: NextPage = () => {
  const [open, setOpen] = useState(false);
  const [fields, setFields] = useState<number>(1);
  const [loading, setLoading] = useState(true);
  const [apiKey, setApiKey] = useState<string>(() => getCookie('openai-api-key') || '');
  const [messages, setMessages] = useState<Array<OpenAIMessage>>([{ id: '0', role: 'system', content: 'You are a helpful AI assistant that answer questions based on relevant parts of a document. When user asks you a questions, it will be provided with relevant parts of document, if you don\'t find the answer on the document just answer with "I couldn\'t find it on your document" and the user will be able to ask another question.' }])
  const [inputMessage, setInputMessage] = useState('');
  const extractor = useRef<Pipeline>();
  const vectorDB = useRef<Voy>();
  const form = useForm()

  useEffect(() => {
   getExtractor()
    .then(model => {
      extractor.current = model
      return extractor;
    }) 
    .then(generateEmbeddings);
  }, []);

  const generateEmbeddings = useCallback(async () => {
    const texts: string[] = JSON.parse(localStorage.getItem("ocr") || '[]')?.map((t: {image: string, text: string}) => t.text) || [];

    const allData: any[] = [];
    let textIndex = 0;
    for (const text of texts) {
      textIndex++;

      const sentences = split(text).filter((s) => s.type === "Sentence").map((s) => s.raw);
      const embeddings = await Promise.all(sentences.map((sentence) => extract(extractor.current!, sentence)));

      const data = embeddings.map((embedding, index) => ({
        id: String(index),
        title: sentences[index],
        url: `/text/${textIndex}/sentence/${index}`,
        embeddings: Array.from(embedding) as number[]
      }));

      allData.push(...data);
    }

    vectorDB.current = new Voy({embeddings: allData});

    setLoading(false);
  }, []);

  const searchEmbeddings = useCallback(async (text: string) => {
    const queryEmbedded = await extract(extractor.current!, text);

    const results = vectorDB.current?.search(queryEmbedded, 5);

    return results;
  }, [])

  const handleAddField = () => {
    setFields(fields + 1)
  }

  const handleExtractData = async (fieldsObj: Record<string, string>) => {
    const texts: string[] = JSON.parse(localStorage.getItem("ocr") || '[]')?.map((t: {image: string, text: string}) => t.text) || [];

    const fields = Object.entries(fieldsObj).reduce((acc, [key, value]) => {
      const [index, newKey] = key.split('-')
      const i = parseInt(index)

      if (!acc[i]) {
        acc[i] = {} as any
      }

      // @ts-ignore
      acc[i][newKey] = value

      return acc
    }, [] as Array<{ name: string, description: string }>)

    const prompt = `Extract the data from the document: \n\n ${texts.join('\n\n')}`

    const fn = {
      name: 'extract_data',      
      description: 'Extract data from document',
      parameters: {
        type: 'object',
        properties: fields.reduce((acc, field, index) => {
          acc[field.name] = {
            type: 'string',
            description: field.description
          }

          return acc
        }, {} as { [key: string]: { type: string, description: string } })
      }
    }

    const newMessages = [...messages, { id: messages.length.toString(), role: 'user', content: prompt }]
    setMessages(newMessages as OpenAIMessage[])

    const aiMessage = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ messages: newMessages, fn })
    })

    const extractedData = await aiMessage.json()

    const newMessages2 = [...newMessages, { id: newMessages.length.toString(), role: 'assistant', content: JSON.stringify(extractedData) }]
    setMessages(newMessages2 as OpenAIMessage[])
  }

  const onSubmit = handleExtractData

  const handleSendMessage = async () => {
    const embeddings = await searchEmbeddings(inputMessage)
    const prompt = `${inputMessage} \n\n\n ###Relevant parts of document: \n\n ${embeddings?.neighbors.map((n: any) => n.title).join('\n\n')}`

    const newMessages = [...messages, { id: messages.length.toString(), role: 'user', content: prompt }]
    setMessages(newMessages as OpenAIMessage[])
    setInputMessage('')

    const aiMessage = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ messages: newMessages })
    })

    const aiMessageText = await aiMessage.text()

    const newMessages2 = [...newMessages, { id: newMessages.length.toString(), role: 'assistant', content: aiMessageText }]
    setMessages(newMessages2 as OpenAIMessage[])
  }

  if (loading) {
    return (
      <div className="h-screen w-screen bg-white dark:bg-slate-900 flex justify-center items-center">
        <Loader2Icon className='animate-spin' />
      </div>
    )
  }

  return (
    <div className="h-screen w-screen bg-white dark:bg-slate-900">
      <Head>
        <title>OCR</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className="h-full min-h-screen w-full flex flex-col items-center py-8 justify-between">
        <div className='h-full flex flex-col justify-between max-w-lg'>
          <div className="flex flex-col gap-2">
            {messages.map(m => (
              <div key={m.id} className='w-full'>
                {m.role === 'user' ? 'User: ' : 'AI: '}
                {m.content}
              </div>
            ))}
          </div>

          <Card className='bg-slate-100'>
            <CardContent className='p-2 w-full'>
              <form 
                onSubmit={(e) => {
                  e.preventDefault()
                  handleSendMessage()
                }} 
                className='flex gap-1'
              >
                <Input type='text' value={inputMessage} onChange={(e) => setInputMessage(e.target.value)} placeholder='Enter your message...' />
                <Button 
                  variant='ghost' 
                  type='button' 
                  onClick={(e) => {
                    e.preventDefault()
                    handleSendMessage()
                  }}
                >
                  <SendHorizonal />
                </Button>
              </form>      
            </CardContent>
          </Card>
        </div>
      </main>

      {!open && <div className="fixed right-8 bottom-8 p-2 z-40 w-16 h-16 flex items-center justify-center rounded-full bg-slate-100 dark:bg-slate-900 shadow-md">
        <SettingsIcon className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-900 cursor-pointer" onClick={() => setOpen(true)} />
      </div>}

      <aside className={twMerge("fixed right-0 top-0 z-40 h-screen w-80 transition-transform", open ? 'translate-x-0' : 'translate-x-full')}>
        <div className="flex h-full flex-col overflow-y-auto border-l border-slate-200 bg-white px-3 py-4 dark:border-slate-700 dark:bg-slate-900">
          <div className="scroll-m-20 border-b pb-2 text-3xl font-semibold tracking-tight transition-colors flex items-center">
            <h2>
              <FileTextIcon className="inline-block w-6 h-6 mr-2" />
              Data Extraction
            </h2>
            <ChevronRight className="inline-block w-6 h-6 cursor-pointer ml-auto" onClick={() => setOpen(false)} />
          </div>

          <Form {...form}>
            <form className="mt-2" onSubmit={form.handleSubmit(onSubmit)}>
                {Array(fields).fill(1).map((field, index, arr) => (
                  <div key={index} className={twMerge('mt-4 flex flex-col gap-2 pb-4', index !== arr.length - 1 && 'border-b')}>
                    <FormLabel>Field {index + 1}</FormLabel>
                    <FormField
                      control={form.control}
                      name={`${index}-name`}
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input placeholder="Name (snake_case)" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`${index}-description`}
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input placeholder="Description" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                ))}
            </form>

            <div className="mt-4 flex justify-center">
              <Button 
                variant='secondary' 
                onClick={handleAddField}
              >
                Add field
              </Button>
            </div>
            
            <div className="mt-auto flex justify-center">
              <Button onClick={form.handleSubmit(onSubmit)}>
                Extract data
              </Button>
            </div>
          </Form>
          <Input
            className="mt-2"
            placeholder="Enter your OPENAI API key"
            value={apiKey}
            onChange={(e) => {
              setApiKey(e.target.value)
              if (typeof window !== 'undefined') {
                setCookie('openai-api-key', e.target.value)
              }
            }}
          />
        </div>
      </aside>
    </div>
  );
};

export default Home;
