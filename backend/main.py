from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
import os
import tempfile
import numpy as np
import librosa
import soundfile as sf
import warnings
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter, landscape
import music21 as m21
from database import engine
import models
import auth_routes

warnings.filterwarnings('ignore')

models.Base.metadata.create_all(bind=engine)

app = FastAPI()

app.include_router(auth_routes.router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Warm-up Function ---
@app.on_event("startup")
async def warmup_audio_processing():
    """
    Run a dummy audio processing task on startup to load Librosa/NumPy models 
    and trigger Numba JIT compilation. This reduces latency for the first user request.
    """
    print("WARM-UP: Initializing audio processing libraries...")
    try:
        # Generate 1 second of silence/dummy audio
        sr = 22050
        y = np.zeros(sr) 
        
        # Trigger librosa functions to load them into memory
        librosa.onset.onset_strength(y=y, sr=sr)
        librosa.piptrack(y=y, sr=sr)
        
        print("WARM-UP: Audio libraries ready.")
    except Exception as e:
        print(f"WARM-UP WARNING: {e}")

# --- Audio Processing Functions ---

def load_and_standardize_audio(file_path):
    # Duration limited to 300s to avoid timeouts, mono=True
    y, sr = librosa.load(file_path, sr=44100, mono=True, duration=300)
    print(f"Loaded audio: {len(y)/sr:.2f} seconds at {sr} Hz")
    return y, sr

def pitch_detection_combined(y, sr):
    print("Detecting pitches...")
    hop_length = 512
    fmin = 65
    fmax = 1000

    pitches, magnitudes = librosa.piptrack(y=y, sr=sr, hop_length=hop_length,
                                          fmin=fmin, fmax=fmax, threshold=0.3)

    times = librosa.times_like(pitches, sr=sr, hop_length=hop_length)

    frequencies = []
    confidences = []

    for t in range(pitches.shape[1]):
        index = magnitudes[:, t].argmax()
        freq = pitches[index, t]
        confidence = magnitudes[index, t]

        if freq < 75 and confidence < 0.3:
            frequencies.append(0)
            confidences.append(0)
            continue

        if confidence > 0.05:
            if 65 <= freq <= 1000:
                frequencies.append(freq)
                confidences.append(confidence)
            else:
                frequencies.append(0)
                confidences.append(0)
        else:
            frequencies.append(0)
            confidences.append(0)

    return times, np.array(frequencies), np.array(confidences)

def detect_notes_enhanced(y, sr, time, frequency, confidence):
    print("Detecting notes...")
    onset_env = librosa.onset.onset_strength(y=y, sr=sr, aggregate=np.median)
    onset_frames = librosa.onset.onset_detect(onset_envelope=onset_env, sr=sr,
                                            backtrack=True,
                                            pre_max=5, post_max=5,
                                            pre_avg=10, post_avg=10,
                                            delta=0.2, wait=30)
    onset_times = librosa.frames_to_time(onset_frames, sr=sr)

    filtered_onsets = []
    for i, onset in enumerate(onset_times):
        if i == 0 or onset - onset_times[i-1] >= 0.05:
            filtered_onsets.append(onset)

    onset_times = np.array(filtered_onsets)

    notes = []
    for i in range(len(onset_times)):
        start_time = onset_times[i]
        if i < len(onset_times) - 1:
            end_time = onset_times[i+1]
        else:
            end_time = len(y) / sr

        if end_time - start_time < 0.05:
            continue

        mask = (time >= start_time) & (time < end_time)
        if np.any(mask):
            freq_segment = frequency[mask]
            conf_segment = confidence[mask]

            valid_indices = (freq_segment > 0) & (conf_segment > 0.1)
            if np.any(valid_indices):
                filtered_freq = freq_segment[valid_indices]
                filtered_conf = conf_segment[valid_indices]

                if len(filtered_freq) > 0:
                    avg_freq = np.median(filtered_freq)
                    avg_conf = np.mean(filtered_conf)
                    notes.append((start_time, end_time, avg_freq, avg_conf))

    return notes

def freq_to_guitar_string_fret_optimized(freq):
    if freq <= 0:
        return None, None

    string_tunings = [40, 45, 50, 55, 59, 64] # MIDI notes for E A D G B E
    midi_note = round(69 + 12 * np.log2(freq / 440.0))

    best_string = None
    best_fret = None
    best_score = float('inf')

    for i, open_note in enumerate(string_tunings):
        fret = midi_note - open_note

        if 0 <= fret <= 24:
            fret_penalty = fret * 1.0

            if i >= 3 and fret > 12:
                fret_penalty *= 1.5

            string_penalty = 0
            if i == 0 or i == 5:
                string_penalty = 1

            score = fret_penalty + string_penalty

            if score < best_score:
                best_score = score
                best_string = i + 1
                best_fret = fret

    if best_string is None:
        best_string = 6
        best_fret = max(0, midi_note - 40)
        if best_fret > 24:
            best_fret = best_fret % 12

    return best_string, best_fret

def generate_tab_data(notes):
    print("Generating tab data...")
    tab_data = []
    for note in notes:
        start_time, end_time, freq, conf = note
        string, fret = freq_to_guitar_string_fret_optimized(freq)
        duration = end_time - start_time

        midi_note = round(69 + 12 * np.log2(freq / 440.0))
        note_names = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
        note_idx = midi_note % 12
        octave = (midi_note // 12) - 1
        note_name = note_names[note_idx] + str(octave)

        tab_data.append({
            'start_time': start_time,
            'duration': duration,
            'string': string,
            'fret': fret,
            'note_name': note_name,
            'midi_note': midi_note,
            'confidence': conf
        })

    return tab_data

def estimate_tempo_and_meter(tab_data):
    if not tab_data:
        return 120, (4, 4)

    sorted_notes = sorted(tab_data, key=lambda x: x['start_time'])
    iois = []

    for i in range(1, len(sorted_notes)):
        ioi = sorted_notes[i]['start_time'] - sorted_notes[i-1]['start_time']
        if 0.05 <= ioi <= 2.0:
            iois.append(ioi)

    if not iois:
        return 120, (4, 4)

    median_ioi = np.median(iois)
    bpm = int(60 / median_ioi)

    while bpm < 60:
        bpm *= 2
    while bpm > 180:
        bpm //= 2

    common_tempos = [60, 72, 80, 88, 96, 108, 120, 132, 144, 160, 176]
    tempo = min(common_tempos, key=lambda x: abs(x - bpm))

    return tempo, (4, 4)

def generate_pdf_tablature(tab_data, output_path, tempo):
    """Generate a professional PDF tablature using reportlab"""
    print("Generating PDF...")
    c = canvas.Canvas(output_path, pagesize=landscape(letter))
    width, height = landscape(letter)

    # Title and header
    c.setFont("Helvetica-Bold", 18)
    c.drawString(50, height - 40, "Guitar Tablature")

    c.setFont("Helvetica", 12)
    c.drawString(50, height - 60, f"Tempo: {tempo} BPM")
    c.drawString(50, height - 80, f"Total Notes: {len(tab_data)}")

    # Tablature settings
    tab_start_y = height - 120
    string_spacing = 20
    measure_width = 120
    measures_per_line = 6
    chars_per_measure = 16

    # String names (from high E to low E)
    string_names = ['e|', 'B|', 'G|', 'D|', 'A|', 'E|']

    # Sort notes by time
    sorted_notes = sorted(tab_data, key=lambda x: x['start_time'])

    # Group notes into measures (4 beats per measure, assume quarter notes)
    beat_duration = 60 / tempo
    measure_duration = 4 * beat_duration  # 4/4 time

    measures = {}
    for note in sorted_notes:
        if note['string'] is not None and note['fret'] is not None:
            measure_idx = int(note['start_time'] / measure_duration)
            if measure_idx not in measures:
                measures[measure_idx] = []
            measures[measure_idx].append(note)

    max_measure = max(measures.keys()) if measures else 0

    # Draw tablature
    current_y = tab_start_y

    for line_start in range(0, max_measure + 1, measures_per_line):
        line_end = min(line_start + measures_per_line, max_measure + 1)

        # Draw measure numbers
        c.setFont("Helvetica", 10)
        for m_idx, measure_num in enumerate(range(line_start, line_end)):
            x_pos = 80 + m_idx * measure_width
            c.drawString(x_pos + measure_width//2 - 10, current_y + 20, f"M{measure_num + 1}")

        # Draw string lines and labels
        c.setFont("Courier", 12)
        for string_idx, string_name in enumerate(string_names):
            y_pos = current_y - string_idx * string_spacing

            # String label
            c.drawString(50, y_pos - 5, string_name)

            # Draw horizontal line for each measure in this line
            for m_idx in range(line_end - line_start):
                x_start = 80 + m_idx * measure_width
                x_end = x_start + measure_width - 10
                c.line(x_start, y_pos, x_end, y_pos)

                # Draw measure separator
                if m_idx < line_end - line_start - 1:
                    c.line(x_end, y_pos + 10, x_end, y_pos - 10)

        # Add fret numbers
        for measure_num in range(line_start, line_end):
            if measure_num in measures:
                measure_x_start = 80 + (measure_num - line_start) * measure_width

                for note in measures[measure_num]:
                    # Calculate position within measure
                    pos_in_measure = (note['start_time'] % measure_duration) / measure_duration
                    x_pos = measure_x_start + pos_in_measure * (measure_width - 10)

                    # Calculate string position
                    string_idx = note['string'] - 1  # Convert to 0-indexed
                    y_pos = current_y - string_idx * string_spacing

                    # Draw fret number
                    fret_str = str(note['fret'])
                    c.setFont("Courier-Bold", 10)
                    c.drawString(x_pos - 3, y_pos - 5, fret_str)

        # Move to next line
        current_y -= 150

        # Check if we need a new page
        if current_y < 100:
            c.showPage()
            current_y = height - 100
            c.setFont("Helvetica-Bold", 14)
            c.drawString(50, height - 40, "Guitar Tablature (continued)")

    # Add footer with legend
    c.setFont("Helvetica", 10)
    footer_y = 30
    c.drawString(50, footer_y + 40, "Legend:")
    c.drawString(50, footer_y + 25, "• Numbers on lines indicate fret positions")
    c.drawString(50, footer_y + 10, "• Each measure represents approximately 4 beats")
    c.drawString(50, footer_y - 5, "• Strings: e(high E), B, G, D, A, E(low E)")

    c.save()

# --- Routes ---

@app.post("/process-audio")
async def process_audio(file: UploadFile = File(...)):
    print(f"Received file: {file.filename}")
    tmp_path = None
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=os.path.splitext(file.filename)[1]) as tmp:
            tmp.write(await file.read())
            tmp_path = tmp.name
        
        print(f"Saved to temp path: {tmp_path}")

        # Process
        y, sr = load_and_standardize_audio(tmp_path)
        times, frequencies, confidences = pitch_detection_combined(y, sr)
        notes = detect_notes_enhanced(y, sr, times, frequencies, confidences)
        tab_data = generate_tab_data(notes)
        tempo, time_sig = estimate_tempo_and_meter(tab_data)
        
        # Generate PDF
        output_pdf = tmp_path + "_output.pdf"
        generate_pdf_tablature(tab_data, output_pdf, tempo)
        
        return FileResponse(output_pdf, media_type='application/pdf', filename="sheet_music.pdf")

    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if tmp_path and os.path.exists(tmp_path):
            os.unlink(tmp_path)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
