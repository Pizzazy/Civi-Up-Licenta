import { useState } from 'react';
import { Image, Camera, Send, Sparkles, Zap, Loader2, CheckCircle } from 'lucide-react';
import { PlatformSelector } from '@/components/ui';
import { socialAPI } from '@/services/api';

export default function SocialPostCreator({ projectContext = null, compact = false, onPublished = null }) {
  const [platforms, setPlatforms] = useState(['Facebook']);
  const [postText, setPostText] = useState('');
  const [aiPrompt, setAiPrompt] = useState('');
  const [showAiPrompt, setShowAiPrompt] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [imageUploaded, setImageUploaded] = useState(false);
  const [posted, setPosted] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState('');

  const generateAI = async () => {
    if (!aiPrompt.trim()) return;
    setAiGenerating(true);
    try {
      const data = await socialAPI.generateAIText(
        aiPrompt + (projectContext?.name ? ` — proiect: ${projectContext.name}` : ''),
        platforms[0] || 'Facebook',
        'professional'
      );
      const generated = data?.text || data?.generated_text || data || '';
      // Typewriter effect
      let i = 0;
      const text = typeof generated === 'string' ? generated : JSON.stringify(generated);
      const interval = setInterval(() => {
        setPostText(text.slice(0, i));
        i += 4;
        if (i > text.length) {
          setPostText(text);
          clearInterval(interval);
        }
      }, 20);
    } catch {
      setPostText('[Nu s-a putut genera textul cu AI. Încercați din nou.]');
    } finally {
      setAiGenerating(false);
    }
  };

  const handlePost = async () => {
    if (!postText || platforms.length === 0) return;
    setPublishing(true);
    setPublishError('');
    try {
      const createdPost = await socialAPI.createPost({
        text: postText,
        platforms,
        project_id: projectContext?.id || null,
        status: 'published',
      });
      if (createdPost) {
        onPublished?.(createdPost);
      }
      setPosted(true);
      setTimeout(() => {
        setPosted(false);
        setPostText('');
        setImageUploaded(false);
        setAiPrompt('');
        setShowAiPrompt(false);
      }, 2500);
    } catch (error) {
      setPublishError(error?.message || 'Nu s-a putut publica postarea.');
      setPosted(false);
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div className={`paper-card ${compact ? 'p-4' : 'p-6'}`}>
      {!compact && <h3 className="text-lg text-slate-900 font-display mb-5">Creare Postare</h3>}
      {posted && (
        <div className="mb-4 flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl px-4 py-3 text-sm font-semibold">
          <CheckCircle className="w-4 h-4" /> Publicat pe {platforms.join(', ')}!
        </div>
      )}
      {publishError && (
        <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
          {publishError}
        </div>
      )}
      <div className="space-y-4">
        <div>
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-[0.2em] mb-2 block">Platforme</label>
          <PlatformSelector selected={platforms} onChange={setPlatforms} />
        </div>

        {/* Image upload mock */}
        <div
          onClick={() => setImageUploaded((v) => !v)}
          className={`cursor-pointer border-2 border-dashed rounded-xl flex items-center justify-center gap-3 transition-all ${compact ? 'h-16' : 'h-28'} ${
            imageUploaded
              ? 'border-violet-300 bg-violet-50/40'
              : 'border-slate-200 hover:border-violet-200 bg-slate-50'
          }`}
        >
          {imageUploaded ? (
            <>
              <Camera className="w-4 h-4 text-violet-600" />
              <span className="text-xs font-semibold text-violet-700">imagine_ong.jpg · 2.4 MB ✓</span>
            </>
          ) : (
            <>
              <Image className="w-5 h-5 text-slate-300" />
              <span className="text-xs text-slate-400">Click pentru upload imagine</span>
            </>
          )}
        </div>

        {/* Text area with AI */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-[0.2em]">Text Postare</label>
            <button
              onClick={() => setShowAiPrompt((v) => !v)}
              className="flex items-center gap-1.5 text-xs bg-violet-50 hover:bg-violet-100 text-violet-700 px-3 py-1.5 rounded-full font-semibold transition-all border border-violet-200"
            >
              <Sparkles className="w-3 h-3" /> Generator text
            </button>
          </div>
          {showAiPrompt && (
            <div className="mb-3 p-3 bg-violet-50/60 border border-violet-200 rounded-xl space-y-2">
              <p className="text-xs font-semibold text-violet-700">
                Prompt pentru generator (descrie ce dorești, stil, ton, corectare diacritice, etc.)
              </p>
              <textarea
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                rows={2}
                placeholder="Ex: Scrie o postare despre campania de Crăciun, ton cald și motivant, cu diacritice corecte, max 150 cuvinte..."
                className="w-full text-xs border border-violet-200 rounded-lg px-3 py-2 focus:outline-none focus:border-violet-400 bg-white resize-none"
              />
              <div className="flex gap-2 flex-wrap">
                {['cu diacritice corecte', 'corectează gramatica', 'ton profesional', 'ton prietenos', 'cu hashtag-uri', 'max 100 cuvinte'].map(
                  (s) => (
                    <button
                      key={s}
                      onClick={() => setAiPrompt((p) => p + (p ? ', ' : '') + s)}
                      className="text-xs bg-white border border-violet-200 text-violet-700 px-2 py-1 rounded-full hover:bg-violet-100 transition-colors"
                    >
                      {s}
                    </button>
                  ),
                )}
              </div>
              <button
                onClick={generateAI}
                disabled={aiGenerating || !aiPrompt.trim()}
                className="flex items-center gap-2 bg-violet-700 hover:bg-violet-600 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-xs font-bold transition-colors"
              >
                {aiGenerating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
                {aiGenerating ? 'Generez...' : 'Generează'}
              </button>
            </div>
          )}
          <textarea
            value={postText}
            onChange={(e) => setPostText(e.target.value)}
            rows={compact ? 3 : 5}
            placeholder="Scrie textul postării sau folosește AI-ul..."
            className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-700 focus:outline-none focus:border-violet-300 focus:ring-2 focus:ring-violet-100 transition-all resize-none"
          />
          <div className="flex justify-between items-center mt-1">
            <span className="text-xs text-slate-400">{postText.length} / 2.200 caractere</span>
            {platforms.length === 0 && <span className="text-xs text-rose-500 font-medium">Selectați cel puțin o platformă</span>}
          </div>
        </div>

        <button
          onClick={handlePost}
          disabled={!postText || platforms.length === 0 || publishing}
          className="bg-violet-700 hover:bg-violet-600 disabled:opacity-50 text-white px-6 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-colors"
        >
          {publishing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          {publishing ? 'Se publică...' : `Publică pe ${platforms.length > 0 ? platforms.join(' + ') : '...'}`}
        </button>
      </div>
    </div>
  );
}
