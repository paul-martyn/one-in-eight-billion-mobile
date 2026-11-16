// Compatibility for saves made before reflection prompts were removed.
// Ordinary decisions and the life event log remain intact.
export function stripLegacyReflections(state) {
  if (!state || typeof state !== 'object') return state;
  const notes = Array.isArray(state.journal) ? state.journal : [];
  const isNote = entry => entry?.d === 'reflect' || entry?.act?.id === 'reflect' ||
    (entry?.kind === 'note' && notes.some(note => note.a === entry.a &&
      [note.t, `“${note.t}”`, `„${note.t}“`, `«${note.t}»`].includes(entry.text)));
  delete state.journal;
  if (Array.isArray(state.log) && state.log.some(isNote)) state.log = state.log.filter(entry => !isNote(entry));
  if (state.pending?.id === 'reflect') state.pending = null;
  if (Array.isArray(state.queue) && state.queue.some(entry => entry.id === 'reflect')) {
    state.queue = state.queue.filter(entry => entry.id !== 'reflect');
  }
  if (state.flags) {
    delete state.flags.refQ;
    delete state.flags.last_reflect;
  }
  if (state.done) delete state.done.reflect;
  if (state.endD) {
    delete state.endD.quote;
    if (Array.isArray(state.endD.frames)) {
      state.endD.frames = state.endD.frames.filter(frame => !frame.note);
      state.endD.frames.forEach(frame => { delete frame.note; });
    }
  }
  return state;
}

export function stripStoredReflections(value) {
  if (Array.isArray(value)) value.forEach(entry => { if (entry?.S) stripLegacyReflections(entry.S); });
  else if (value?.S) stripLegacyReflections(value.S);
  return value;
}
