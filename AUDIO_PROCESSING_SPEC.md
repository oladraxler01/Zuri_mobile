# Zuri Backend Specification: Audio Voice Isolation & Speech-to-Text Pipeline

**Document Version:** 1.0.0  
**Target Audience:** Backend Engineers & AI/ML Infrastructure  
**Core Purpose:** Guide the backend implementation of lecture audio capture, voice isolation, speech-to-text (ASR) transcription, and AI lecture intelligence generation for the mobile app.

---

## 1. System Overview & Technical Goals

The mobile application records academic lectures in university lecture halls and auditoriums. The backend must:
1. **Handle Poor Acoustics:** Tackle background chatter, echo/reverberation, distant lecturer voices, and diverse accents (e.g., Nigerian English, British English).
2. **Recognize Academic Terminology:** Reliably transcribe technical jargon (e.g., *Dynamic Programming*, *Memoization*, *Asymptotic Notation*, course codes like *CSC 301*).
3. **Minimize Latency & Cost:** Transcribe a 1-hour lecture in under 15 seconds at negligible cost.
4. **Generate Structured Post-Lecture Analysis:** Output structured JSON to populate the mobile app's **Lecture Intelligence** screen (Bento concepts, knowledge gaps, diagnostic quizzes, and flashcards).

---

## 2. Recommended Model & Service Comparison

| Service / Model | Strengths | Weaknesses | Latency (1-Hour Audio) | Cost / Hour | Recommendation |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Groq + Whisper Large-v3 Turbo** | • Highest accuracy across accents & technical terms<br>• Zero GPU hosting maintenance<br>• Runs on Groq LPU hardware | • Does not have built-in speaker diarization out of the box | **~10 – 15 seconds** | **~$0.04** | ⭐ **Primary Choice for Speed & Accuracy** |
| **AssemblyAI (Universal-1)** | • Built-in Speaker Diarization (Lecturer vs Student)<br>• Automated Vocabulary Boosting<br>• Built-in LeMUR summarizer | • Slower turnaround time<br>• Higher cost | ~3 – 5 minutes | ~$0.37 | **Alternative for Multi-Speaker Lectures** |
| **Deepgram (Nova-2 / Nova-3)** | • Ultra-low latency streaming<br>• Built-in smart formatting | • File-based transcription accuracy is slightly lower than Whisper Large-v3 for dense academic lectures | ~15 – 25 seconds | ~$0.25 | **Best for Real-Time Streaming Captions** |

> **Final Recommendation:** **Groq Cloud running `whisper-large-v3-turbo`**. It offers near-perfect transcription of accented English and dense academic jargon at ~10 seconds turnaround time for a 1-hour lecture, costing less than $0.05.

---

## 3. Two-Tier Voice Isolation & Noise Suppression

### Tier 1: Mobile Client Ingestion (Phone Hardware)
The mobile app (`expo-av`) must capture audio using voice-optimized settings that engage the phone's native dual-microphone noise-cancellation chips:
* **Audio Format:** MPEG-4 AAC (`.m4a`) or 16-bit PCM WAV (`.wav`)
* **Sample Rate:** `16,000 Hz` (optimal for Whisper) or `44,100 Hz`
* **Channels:** 1 (Mono reduces file size by 50% without losing speech intelligibility)
* **Bitrate:** `64 kbps` – `128 kbps`

### Tier 2: Model-Level Denoising
`whisper-large-v3` was trained on synthetic and real-world noisy audio (background crowd noise, AC hum, reverberation). It naturally suppresses non-speech frequencies without requiring an expensive external DSP layer. If severe auditorium echo is present, a lightweight open-source neural denoiser (**RNNoise**) can be run on the server prior to inference.

---

## 4. Backend Endpoints & Architecture

```
 Mobile App (Expo)
       │
       │ 1. POST /api/v1/lectures/transcribe (audio file + metadata)
       ▼
 Backend Server (Node.js / Python)
       │
       │ 2. Forward to Groq Whisper API (whisper-large-v3-turbo)
       ▼
 Groq LPU Cloud
       │
       │ 3. Returns raw timestamped transcript (in ~10s)
       ▼
 Backend LLM Pipeline (Gemini 1.5 Flash / GPT-4o-mini)
       │
       │ 4. Extracts Bento Concepts, Gaps, Quiz & Flashcards
       ▼
 Mobile App (Renders Post-Lecture Intelligence Screen)
```

---

## 5. Backend Implementation Examples

### Option A: Node.js / TypeScript (Express or NestJS)

```typescript
import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';

interface TranscriptionResult {
  text: string;
  duration: number;
}

export async function transcribeLectureAudio(
  filePath: string,
  courseCode: string,
  courseTitle: string
): Promise<TranscriptionResult> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error('GROQ_API_KEY is not configured');

  const form = new FormData();
  form.append('file', fs.createReadStream(filePath));
  form.append('model', 'whisper-large-v3-turbo');
  form.append('response_format', 'verbose_json');
  form.append('language', 'en');
  // Prompt injection primes Whisper to accurately spell course terminology
  form.append(
    'prompt',
    `Lecture for ${courseCode}: ${courseTitle}. Academic course terminology, definitions, algorithms, formulas.`
  );

  const response = await axios.post(
    'https://api.groq.com/openai/v1/audio/transcriptions',
    form,
    {
      headers: {
        ...form.getHeaders(),
        Authorization: `Bearer ${apiKey}`,
      },
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
    }
  );

  return {
    text: response.data.text,
    duration: response.data.duration,
  };
}
```

### Option B: Python (FastAPI)

```python
import os
from fastapi import FastAPI, UploadFile, File, Form
from groq import Groq

app = FastAPI()
client = Groq(api_key=os.environ.get("GROQ_API_KEY"))

@app.post("/api/v1/lectures/transcribe")
async def transcribe_lecture(
    file: UploadFile = File(...),
    course_code: str = Form("CSC 301"),
    course_title: str = Form("Algorithms")
):
    contents = await file.read()
    
    transcription = client.audio.transcriptions.create(
        file=(file.filename, contents),
        model="whisper-large-v3-turbo",
        response_format="verbose_json",
        language="en",
        prompt=f"Academic university lecture for {course_code}: {course_title}. Technical concepts and definitions."
    )
    
    return {
        "text": transcription.text,
        "duration": transcription.duration
    }
```

---

## 6. Post-Processing Pipeline: Generating Lecture Intelligence

Once the raw text transcript is obtained from Whisper, pass it to an LLM (e.g. `gemini-1.5-flash` or `gpt-4o-mini`) with the following prompt to generate the exact JSON schema required by the mobile frontend:

### LLM System Prompt:
```
You are an expert academic tutor. Analyze the provided lecture transcript and return ONLY valid JSON matching this schema:
{
  "summary": "1-2 sentence high-level overview",
  "bentoConcepts": [
    {
      "id": 1,
      "title": "Concept Name",
      "summary": "Brief explanation",
      "icon": "memory | table-chart | git-network | layers | calculator"
    }
  ],
  "knowledgeGap": {
    "concept": "Name of difficult concept",
    "reason": "Why students struggle with it and why it is critical for exams",
    "explanation": "Detailed step-by-step breakdown with intuitive analogy"
  },
  "diagnosticQuestion": {
    "question": "Multiple-choice diagnostic question testing core lecture topic",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctIndex": 1,
    "explanation": "Why this answer is correct"
  },
  "flashcards": [
    {
      "question": "Front of card question",
      "answer": "Back of card concise answer"
    }
  ]
}
```

---

## 7. Expected API Response Payload for Mobile Frontend

```json
{
  "status": "success",
  "data": {
    "courseCode": "CSC 301",
    "courseTitle": "Dynamic Programming Introduction",
    "transcription": "Today we are starting dynamic programming...",
    "audioDurationSeconds": 2241,
    "bentoConcepts": [
      {
        "id": 1,
        "title": "1. Memoization",
        "summary": "Top-down approach. Caching results of expensive function calls to avoid redundant calculations.",
        "icon": "memory"
      },
      {
        "id": 2,
        "title": "2. Tabulation",
        "summary": "Bottom-up approach. Solving subproblems systematically and filling an n-dimensional table.",
        "icon": "table-chart"
      },
      {
        "id": 3,
        "title": "3. Optimal Substructure",
        "summary": "An optimal solution to the problem contains optimal solutions to subproblems.",
        "icon": "git-network"
      }
    ],
    "knowledgeGap": {
      "concept": "Optimal Substructure",
      "reason": "You struggled with Optimal Substructure during the lecture diagnostic. Re-visiting this concept is highly recommended before the mid-term."
    },
    "diagnosticQuestion": {
      "question": "Which dynamic programming approach builds solutions bottom-up by iteratively filling a table?",
      "options": ["Greedy Choice", "Tabulation", "Memoization", "Divide and Conquer"],
      "correctIndex": 1,
      "explanation": "Tabulation systematically fills base cases up to the desired result."
    },
    "flashcards": [
      {
        "question": "What are the two key properties of any Dynamic Programming problem?",
        "answer": "1. Optimal Substructure.\n2. Overlapping Subproblems."
      }
    ]
  }
}
```

---

## 8. Step-by-Step Setup Instructions for Backend Devs

1. **Sign up on Groq Cloud:** Visit [https://console.groq.com](https://console.groq.com) and create an API Key under **API Keys**.
2. **Environment Variable:** Add `GROQ_API_KEY=gsk_...` to your backend `.env` file.
3. **Install Dependencies:**
   * **Node.js:** `npm install axios form-data`
   * **Python:** `pip install groq fastapi uvicorn`
4. **Test Endpoint:** Use cURL or Postman to send a test audio file to `https://api.groq.com/openai/v1/audio/transcriptions`.
