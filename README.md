# Relay

**Your models. Your space.**

Relay is a React chat app that brings OpenRouterâ€™s text models into one clean interface. Bring your own OpenRouter API key, choose a model, and start a conversation.

## What it does

- **Search and switch models** â€” Browse a live catalog of OpenRouter models that accept and return text. Search by name and select the one you want. Switch during a conversation; your next message uses the selected model with the conversation history.
- **Stream responses** â€” Read answers as they arrive and stop a response when you need to.
- **Keep conversations organized** â€” Start new chats and revisit previous conversations from the sidebar.
- **Customize responses** â€” Add optional instructions and set a maximum response-token limit.
- **Copy and export** â€” Copy an answer or download a conversation as JSON.
- **Read code comfortably** â€” Fenced code blocks appear separately from the surrounding text.
- **See reported usage** â€” View token usage and cost when OpenRouter supplies those details.
- **Chat on desktop or mobile** â€” Use a responsive interface in your browser.

## Your key, your choices

Relay uses your own OpenRouter account. Model requests go directly from your browser to OpenRouter, which routes them to the selected provider. Any model charges apply to your OpenRouter account.

Your API key stays in the current pageâ€™s memory. It is not saved with your chats, and reloading the page clears it.

## Conversation storage

Chats are saved in the current browserâ€™s local storage. They are not synced between devices or browsers. Clearing your browserâ€™s site data removes them, so export any conversations you want to keep elsewhere.

Exported conversations do not include your API key. Sending a message shares the relevant conversation context with OpenRouter and the selected model provider.

## Current scope

Relay currently focuses on text chat. Local models, agent tools, attachments, voice chat, and cross-device sync are not included.

Model availability, pricing, and capabilities depend on OpenRouter and its providers. AI responses can be inaccurate; check important information. Stopping a response cancels the browser request, but whether processing and billing stop depends on the provider.

---

Built with React and powered by [OpenRouter](https://openrouter.ai/).
