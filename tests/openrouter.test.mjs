import { test } from 'node:test';
import assert from 'node:assert/strict';
import { streamChat } from '../lib/openrouter.mjs';
test('fragmented UTF-8, comments, usage and DONE', async () => {
 const original=globalThis.fetch;
 const bytes=new TextEncoder().encode(': keepalive\r\n\r\ndata: {"choices":[{"delta":{"content":"Hi 🌍"}}]}\r\n\r\ndata: {"choices":[],"usage":{"total_tokens":7}}\n\ndata: [DONE]\n\n');
 let i=0,text='',usage;
 globalThis.fetch=async()=>new Response(new ReadableStream({pull(c){if(i<bytes.length)c.enqueue(bytes.slice(i,++i));else c.close();}}));
 try{await streamChat({key:'test-only',model:'test',messages:[],onChunk:c=>text+=c,onUsage:u=>usage=u});assert.equal(text,'Hi 🌍');assert.equal(usage.total_tokens,7);}finally{globalThis.fetch=original;}
});
test('HTTP, in-stream errors and truncated streams', async()=>{
 const original=globalThis.fetch;
 try{for(const response of [new Response('',{status:401}),new Response('data: {"error":{"message":"failure"}}\n\n'),new Response('data: {"choices":[{"delta":{"content":"partial"}}]}\n\n')]){globalThis.fetch=async()=>response;await assert.rejects(streamChat({key:'test-only',model:'test',messages:[],onChunk:()=>{}}));}}finally{globalThis.fetch=original;}
});
