import Groq from 'groq-sdk'
import dotenv from 'dotenv'
dotenv.config()

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
})

async function run() {
  try {
    console.log('Testing Qwen 3 32B streaming...')
    const stream = await groq.chat.completions.create({
      model: 'qwen/qwen3-32b',
      messages: [{ role: 'user', content: 'Hello, write a 1-sentence joke.' }],
      stream: true,
    })
    for await (const chunk of stream) {
      process.stdout.write(chunk.choices[0]?.delta?.content || '')
    }
    console.log('\nSuccess!')
  } catch (err) {
    console.error('\nError:', err)
  }
  process.exit(0)
}

run()
