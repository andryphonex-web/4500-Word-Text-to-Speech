import React, { useState, useCallback, useEffect } from 'react';
import { Mode, Speaker } from './types';
import { generateSpeech } from './services/geminiService';
import { decodeBase64, createAudioBuffer, audioBufferToWav } from './services/audioUtils';

const VOICES = ['Kore', 'Puck', 'Charon', 'Fenrir', 'Zephyr', 'Aura', 'Cinder', 'Ember', 'Mist', 'Nautilus'];
const SINGLE_SPEAKER_PLACEHOLDER = "Paste text here to generate speech...";
const MULTI_SPEAKER_PLACEHOLDER = `TTS the following conversation between Joe and Jane:
Joe: How's it going today Jane?
Jane: Not too bad, how about you?`;
const LOCAL_STORAGE_KEY = 'gemini-tts-state';


const SingleSpeakerIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
    </svg>
);

const MultiSpeakerIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path d="M16.5 13c-1.2 0-3.07.34-4.5 1-1.43-.66-3.3-1-4.5-1C5.33 13 1 14.08 1 16.25V19h22v-2.75c0-2.17-4.33-3.25-6.5-3.25zm-4 4.5h-10v-1.25c0-.54 2.56-1.75 5-1.75s5 1.21 5 1.75v1.25zM7.5 12c1.93 0 3.5-1.57 3.5-3.5S9.43 5 7.5 5 4 6.57 4 8.5 5.57 12 7.5 12zm0-5.5c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2zm9 5.5c1.93 0 3.5-1.57 3.5-3.5S18.43 5 16.5 5 13 6.57 13 8.5s1.57 3.5 3.5 3.5zm0-5.5c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2z" />
    </svg>
);

const DownloadIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z" />
    </svg>
);


const App: React.FC = () => {
    const [text, setText] = useState<string>('');
    const [styleInstructions, setStyleInstructions] = useState<string>('Say in a warm and friendly tone');
    const [mode, setMode] = useState<Mode>(Mode.Single);
    const [temperature, setTemperature] = useState<number>(0.8);
    const [singleSpeakerVoice, setSingleSpeakerVoice] = useState<string>(VOICES[1]);
    const [speakers, setSpeakers] = useState<Speaker[]>([
        { id: '1', name: 'Joe', voice: VOICES[0] },
        { id: '2', name: 'Jane', voice: VOICES[1] },
    ]);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Load state from localStorage on initial render
    useEffect(() => {
        try {
            const savedState = localStorage.getItem(LOCAL_STORAGE_KEY);
            if (savedState) {
                const parsedState = JSON.parse(savedState);
                setText(parsedState.text ?? '');
                setStyleInstructions(parsedState.styleInstructions ?? 'Say in a warm and friendly tone');
                setMode(parsedState.mode ?? Mode.Single);
                setTemperature(parsedState.temperature ?? 0.8);
                setSingleSpeakerVoice(parsedState.singleSpeakerVoice ?? VOICES[1]);
                setSpeakers(parsedState.speakers ?? [{ id: '1', name: 'Joe', voice: VOICES[0] }, { id: '2', name: 'Jane', voice: VOICES[1] }]);
            }
        } catch (e) {
            console.error("Failed to load state from localStorage", e);
        }
    }, []);

    // Save state to localStorage whenever it changes
    useEffect(() => {
        const stateToSave = {
            text,
            styleInstructions,
            mode,
            temperature,
            singleSpeakerVoice,
            speakers,
        };
        try {
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(stateToSave));
        } catch (error) {
            console.error('Error saving state to localStorage:', error);
        }
    }, [text, styleInstructions, mode, temperature, singleSpeakerVoice, speakers]);


    const handleGenerateSpeech = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        setAudioUrl(null);
        try {
            const fullText = styleInstructions ? `${styleInstructions}: ${text}` : text;
            const base64Audio = await generateSpeech({ text: fullText, mode, singleSpeakerVoice, multiSpeakers: speakers, temperature });
            
            const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
            const decodedData = decodeBase64(base64Audio);
            const audioBuffer = await createAudioBuffer(decodedData, audioContext, 24000, 1);
            
            const wavUrl = audioBufferToWav(audioBuffer);
            setAudioUrl(wavUrl);

            // Auto-play the audio
            const audio = new Audio(wavUrl);
            audio.play();

        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unknown error occurred.');
        } finally {
            setIsLoading(false);
        }
    }, [text, styleInstructions, mode, singleSpeakerVoice, speakers, temperature]);

    const handleAddSpeaker = () => {
        setSpeakers([...speakers, { id: Date.now().toString(), name: `Speaker ${speakers.length + 1}`, voice: VOICES[0] }]);
    };

    const handleRemoveSpeaker = (id: string) => {
        setSpeakers(speakers.filter((s) => s.id !== id));
    };

    const handleSpeakerChange = (id: string, field: 'name' | 'voice', value: string) => {
        setSpeakers(speakers.map((s) => (s.id === id ? { ...s, [field]: value } : s)));
    };
    
    const handleDownload = () => {
        if (!audioUrl) return;
        const link = document.createElement('a');
        link.href = audioUrl;
        link.download = 'gemini-speech.mp3';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const placeholderText = mode === Mode.Single ? SINGLE_SPEAKER_PLACEHOLDER : MULTI_SPEAKER_PLACEHOLDER;

    return (
        <div className="min-h-screen bg-[#1e1e1e] flex flex-col md:flex-row font-sans">
            <main className="flex-1 flex flex-col p-4 md:p-8">
                <div className="flex items-center text-gray-400 mb-6">
                    <span className="text-sm">Create media</span>
                    <span className="mx-2 text-lg">›</span>
                    <h1 className="text-xl text-white font-medium">Speech</h1>
                </div>
                <div className="flex-1 bg-[#2d2d2d] rounded-lg p-4 flex flex-col">
                    <textarea
                        className="w-full bg-transparent text-gray-300 placeholder-gray-500 focus:outline-none resize-none text-sm p-2 mb-2 border-b border-gray-600"
                        placeholder="Add style instructions (e.g., in a warm and friendly tone)"
                        value={styleInstructions}
                        onChange={(e) => setStyleInstructions(e.target.value)}
                        rows={2}
                    />
                    <textarea
                        className="w-full h-full bg-transparent text-gray-300 placeholder-gray-500 focus:outline-none resize-none text-base"
                        placeholder={placeholderText}
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                    />
                </div>
            </main>

            <aside className="w-full md:w-[360px] bg-[#2d2d2d] p-6 border-l border-gray-700 flex flex-col gap-6">
                <div className="bg-[#3a3a3a] rounded-lg p-4">
                    <h2 className="text-white font-semibold">Gemini 2.5 Pro Preview TTS</h2>
                    <p className="text-sm text-gray-400 mt-1">gemini-2.5-pro-preview-tts</p>
                    <p className="text-sm text-gray-300 mt-2">
                        Our 2.5 Pro text-to-speech audio model optimized for powerful, low-latency speech generation for more natural outputs and easier to steer prompts.
                    </p>
                </div>

                <div>
                    <h3 className="text-white font-medium mb-3">Mode</h3>
                    <div className="grid grid-cols-2 gap-2">
                        <button onClick={() => setMode(Mode.Single)} className={`p-3 rounded-lg flex flex-col items-center justify-center transition-colors ${mode === Mode.Single ? 'bg-blue-600' : 'bg-[#3a3a3a] hover:bg-[#4a4a4a]'}`}>
                            <SingleSpeakerIcon className="w-6 h-6 mb-1" />
                            <span className="text-sm">Single-speaker audio</span>
                        </button>
                        <button onClick={() => setMode(Mode.Multi)} className={`p-3 rounded-lg flex flex-col items-center justify-center transition-colors ${mode === Mode.Multi ? 'bg-blue-600' : 'bg-[#3a3a3a] hover:bg-[#4a4a4a]'}`}>
                            <MultiSpeakerIcon className="w-6 h-6 mb-1" />
                            <span className="text-sm">Multi-speaker audio</span>
                        </button>
                    </div>
                </div>

                <div className="border-t border-gray-600 pt-6">
                    <h3 className="text-white font-medium mb-4">Model settings</h3>

                    <div className="mb-6">
                        <div className="flex justify-between items-center mb-2">
                            <label className="text-sm text-gray-300">Temperature</label>
                            <span className="text-sm bg-[#3a3a3a] px-2 py-1 rounded">{temperature.toFixed(1)}</span>
                        </div>
                        <input
                            type="range"
                            min="0"
                            max="2"
                            step="0.1"
                            value={temperature}
                            onChange={(e) => setTemperature(parseFloat(e.target.value))}
                            className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"
                        />
                    </div>

                    {mode === Mode.Single && (
                        <div>
                            <label htmlFor="voice-select" className="text-sm text-gray-300 mb-2 block">Voice</label>
                            <select
                                id="voice-select"
                                value={singleSpeakerVoice}
                                onChange={(e) => setSingleSpeakerVoice(e.target.value)}
                                className="w-full bg-[#3a3a3a] text-white p-2 rounded-md border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                {VOICES.map(voice => <option key={voice} value={voice}>{voice}</option>)}
                            </select>
                        </div>
                    )}
                    
                    {mode === Mode.Multi && (
                        <div className="space-y-4">
                             <p className="text-xs text-gray-400">Define speakers and their voices. Ensure your text is formatted with speaker names, e.g., `Joe: Hello!`</p>
                            {speakers.map((speaker, index) => (
                                <div key={speaker.id} className="bg-[#3a3a3a] p-3 rounded-lg space-y-2">
                                    <div className="flex justify-between items-center">
                                        <h4 className="text-sm font-semibold">Speaker {index + 1}</h4>
                                        <button onClick={() => handleRemoveSpeaker(speaker.id)} className="text-gray-400 hover:text-red-400 text-xs">Remove</button>
                                    </div>
                                    <input
                                        type="text"
                                        placeholder="Speaker Name (e.g., Joe)"
                                        value={speaker.name}
                                        onChange={(e) => handleSpeakerChange(speaker.id, 'name', e.target.value)}
                                        className="w-full bg-[#2d2d2d] text-white p-2 rounded-md border border-gray-600 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                                    />
                                    <select
                                        value={speaker.voice}
                                        onChange={(e) => handleSpeakerChange(speaker.id, 'voice', e.target.value)}
                                        className="w-full bg-[#2d2d2d] text-white p-2 rounded-md border border-gray-600 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                                    >
                                        {VOICES.map(voice => <option key={voice} value={voice}>{voice}</option>)}
                                    </select>
                                </div>
                            ))}
                            <button onClick={handleAddSpeaker} className="w-full text-sm py-2 bg-[#3a3a3a] hover:bg-[#4a4a4a] rounded-md transition-colors">+ Add Speaker</button>
                        </div>
                    )}
                </div>

                <div className="mt-auto">
                    {audioUrl && (
                        <div className="mb-4">
                           <div className="flex items-center gap-2">
                                <audio controls src={audioUrl} className="w-full">
                                    Your browser does not support the audio element.
                                </audio>
                                <button 
                                    onClick={handleDownload}
                                    title="Download as MP3"
                                    className="p-3 bg-[#3a3a3a] rounded-md hover:bg-[#4a4a4a] transition-colors"
                                >
                                    <DownloadIcon className="w-5 h-5 text-gray-300" />
                                </button>
                            </div>
                        </div>
                    )}
                    {error && <div className="text-red-400 text-sm mb-4 bg-red-900/50 p-3 rounded-md">{error}</div>}
                    <button
                        onClick={handleGenerateSpeech}
                        disabled={isLoading || !text}
                        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-500 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-lg transition-colors flex items-center justify-center"
                    >
                        {isLoading ? (
                           <>
                           <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                             <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                             <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                           </svg>
                           Generating...
                         </>
                        ) : 'Generate Speech'}
                    </button>
                </div>
            </aside>
        </div>
    );
}

export default App;
