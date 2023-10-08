import OpenAI from 'openai';
import { FunctionCallPayload, OpenAIStream, streamToResponse } from 'ai';
import { NextApiRequest, NextApiResponse } from "next";
import { ChatCompletionRole } from 'openai/resources/chat';

export const config = {
    api: {
        bodyParser: true
    }
}

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    const messages: Array<{ role: ChatCompletionRole, content: string, id: string }> = req.body.messages;
    const fn = req.body.fn;

    const apiKey = req.cookies['openai-api-key'];
    if (!apiKey) {
        res.status(401).json({ error: "Unauthorized" });
        return;
    }

    if (!messages) {
        res.status(400).json({ error: "Messages not provided" });
        return;
    }

    const openAiMessages = messages.map(({ role, content }) => ({ role, content }))

    const body = {
        model: 'gpt-3.5-turbo-0613',
        messages: openAiMessages,
    }

    if (fn) {
        // @ts-ignore
        body['functions'] = [{
            name: fn.name,
            description: fn.description,
            parameters: fn.parameters
        }]
        // @ts-ignore
        body['function_call'] = {name: fn.name}
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
    })

    if (response.status === 200) {
        return response.json().then((data) => {
            const r = data.choices[0]
            console.log(r)
            if (r.message.function_call) {
                return res.status(200).json({ text: r.message.function_call.arguments })
            }

            res.status(200).json(r.message.content);
        }).catch((err) => {
            res.status(500).json({ error: err });
        })
    }

    res.status(response.status).json({ error: response.statusText });
}