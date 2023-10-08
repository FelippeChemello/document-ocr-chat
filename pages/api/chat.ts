import { NextApiRequest, NextApiResponse } from "next";
import { ChatCompletionRole } from 'openai/resources/chat';

export const config = {
    api: {
        bodyParser: true
    }
}

export const runtime = 'edge'

export default async function handler(
    req: Request,
) {
    const body = await req.json()
    const messages: Array<{ role: ChatCompletionRole, content: string, id: string }> = body.messages;
    const fn = body.fn

    // @ts-ignore
    const apiKey = req.cookies?.get('openai-api-key')?.value ?? undefined;
    if (!apiKey) {
        return new Response('No API key provided', { status: 400 })
    }

    if (!messages) {
        return new Response('No messages provided', { status: 400 })
    }

    const openAiMessages = messages.map(({ role, content }) => ({ role, content }))

    const openAiBody = {
        model: 'gpt-3.5-turbo-0613',
        messages: openAiMessages,
    }

    if (fn) {
        // @ts-ignore
        openAiBody['functions'] = [{
            name: fn.name,
            description: fn.description,
            parameters: fn.parameters
        }]
        // @ts-ignore
        openAiBody['function_call'] = {name: fn.name}
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(openAiBody)
    })

    if (response.status === 200) {
        return response.json().then((data) => {
            const r = data.choices[0]
            console.log(r)
            if (r.message.function_call) {
                return new Response(r.message.function_call.arguments, { status: 200 })
            }

            return new Response(r.message.content, { status: 200 })
        }).catch((err) => {
            console.log(err)
            return new Response('Error parsing response', { status: 500 })
        })
    }

    console.log(response)
    return new Response('Error', { status: 500 })
}