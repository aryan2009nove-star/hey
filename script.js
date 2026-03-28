class TextToVideoConverter {
    constructor() {
        this.synth = window.speechSynthesis;
        this.canvas = document.getElementById('previewCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.videoBlob = null;
        this.mediaRecorder = null;
        this.chunks = [];
        
        this.init();
    }

    init() {
        this.bindEvents();
        this.loadVoices();
    }

    bindEvents() {
        document.getElementById('convertBtn').addEventListener('click', () => this.convertText());
        document.getElementById('downloadBtn').addEventListener('click', () => this.downloadVideo());
        document.getElementById('regenerateBtn').addEventListener('click', () => this.regenerate());
    }

    loadVoices() {
        const voices = this.synth.getVoices();
        const voiceSelect = document.getElementById('voiceSelect');
        
        voices.forEach(voice => {
            if (voice.lang.startsWith('en')) {
                const option = document.createElement('option');
                option.value = voice.name;
                option.textContent = `${voice.name} (${voice.lang})`;
                voiceSelect.appendChild(option);
            }
        });
    }

    async convertText() {
        const text = document.getElementById('textInput').value.trim();
        if (!text) {
            alert('Please enter some text to convert!');
            return;
        }

        this.showProgress();
        this.hideSections(['videoSection', 'previewSection']);

        try {
            // Split text into sentences for better processing
            const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 10);
            const videoDuration = sentences.length * 5; // ~5s per sentence

            // Create video stream from canvas
            const stream = this.canvas.captureStream(30);
            this.mediaRecorder = new MediaRecorder(stream, {
                mimeType: 'video/webm;codecs=vp9'
            });

            this.mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    this.chunks.push(event.data);
                }
            };

            this.mediaRecorder.onstop = () => {
                const blob = new Blob(this.chunks, { type: 'video/webm' });
                this.videoBlob = blob;
                this.showVideo();
                this.hideProgress();
            };

            this.mediaRecorder.start();
            
            // Animate text on canvas with TTS
            await this.animateText(sentences);
            
            // Stop recording after animation
            setTimeout(() => {
                this.mediaRecorder.stop();
                this.chunks = [];
            }, videoDuration * 1000 + 1000);

        } catch (error) {
            console.error('Conversion error:', error);
            alert('Error converting text to video. Please try again.');
            this.hideProgress();
        }
    }

    async animateText(sentences) {
        const speed = parseFloat(document.getElementById('speedSelect').value);
        let currentSentence = 0;

        for (const sentence of sentences) {
            await this.renderSentence(sentence.trim(), speed);
            currentSentence++;
            
            // Update progress
            const progress = (currentSentence / sentences.length) * 100;
            this.updateProgress(progress, `Rendering sentence ${currentSentence}/${sentences.length}`);
            
            // Wait for sentence duration
            await new Promise(resolve => setTimeout(resolve, 5000 * speed));
        }
    }

    async renderSentence(sentence, speed) {
        return new Promise((resolve) => {
            // Speak the sentence
            const utterance = new SpeechSynthesisUtterance(sentence);
            utterance.rate = speed;
            
            const voiceSelect = document.getElementById('voiceSelect');
            const voices = this.synth.getVoices();
            const selectedVoice = voices.find(v => v.name === voiceSelect.value);
            if (selectedVoice) utterance.voice = selectedVoice;
            
            utterance.onend = () => {
                // Continue animation for remaining time
                setTimeout(resolve, 1000);
            };

            this.synth.speak(utterance);

            // Animate text on canvas
            let animationFrame = 0;
            const animate = () => {
                this.drawFrame(sentence, animationFrame, speed);
                animationFrame++;
                
                if (animationFrame < 150) { // ~5 seconds at 30fps
                    requestAnimationFrame(animate);
                }
            };
            animate();
        });
    }

    drawFrame(sentence, frame, speed) {
        // Clear canvas
        this.ctx.fillStyle = '#1a1a2e';
        this.ctx.fillRect(0, 0, 640, 360);

        // Gradient background
        const gradient = this.ctx.createLinearGradient(0, 0, 0, 360);
        gradient.addColorStop(0, '#16213e');
        gradient.addColorStop(0.5, '#0f3460');
        gradient.addColorStop(1, '#533a7b');
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, 640, 360);

        // Animated particles
        this.drawParticles(frame);

        // Title/Watermark
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        this.ctx.font = 'bold 24px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('Text to Video AI', 320, 50);

        // Main animated text
        const maxWidth = 580;
        const fontSize = Math.max(32, 60 - sentence.length / 10);
        this.ctx.font = `bold ${fontSize}px 'Segoe UI', Arial, sans-serif`;
        this.ctx.fillStyle = '#ffffff';
        this.ctx.textAlign = 'center';

        // Animated text reveal effect
        const textWidth = this.ctx.measureText(sentence).width;
        const revealProgress = Math.min(1, (frame * 0.05 * speed));
        
        this.ctx.save();
        this.ctx.globalAlpha = 0.9;
        
        // Shadow effect
        this.ctx.shadowColor = 'rgba(0, 255, 255, 0.5)';
        this.ctx.shadowBlur = 20;
        
        // Clip text reveal
        this.ctx.save();
        this.ctx.beginPath();
        this.ctx.rect(30, 120, textWidth * revealProgress, 80);
        this.ctx.clip();
        this.ctx.fillText(sentence, 320, 170);
        this.ctx.restore();

        this.ctx.restore();

        // Subtitle with typing effect
        const words = sentence.split(' ');
        let displayedText = words.slice(0, Math.floor(frame * 0.1 * speed)).join(' ');
        this.ctx.font = '20px Arial';
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        this.ctx.fillText(displayedText, 320, 280);

        // Progress indicator
        this.ctx.strokeStyle = '#00f2fe';
        this.ctx.lineWidth = 4;
        this.ctx.beginPath();
        this.ctx.arc(320, 330, 25, -Math.PI / 2, (-Math.PI / 2 + (frame * 0.1 * speed * Math.PI * 2)));
        this.ctx.stroke();
    }

    drawParticles(frame) {
        for (let i = 0; i < 50; i++) {
            const x = (frame * 0.1 + i * 17) % 640;
            const y = (frame * 0.05 + i * 23) % 360;
            const size = 2 + Math.sin(frame * 0.1 + i) * 1;
            
            this.ctx.save();
            this.ctx.translate(x, y);
            this.ctx.rotate(frame * 0.02 + i * 0.1);
            this.ctx.fillStyle = `rgba(0, 255, 255, ${0.3 + 0.2 * Math.sin(frame * 0.1 + i)})`;
            this.ctx.fillRect(-size/2, -size/2, size, size);
            this.ctx.restore();
        }
    }

    showProgress() {
        document.getElementById('progressContainer').style.display = 'block';
        document.getElementById('convertBtn').disabled = true;
    }

    hideProgress() {
        document.getElementById('progressContainer').style.display = 'none';
        document.getElementById('convertBtn').disabled = false;
    }

    updateProgress(percent, text) {
        document.getElementById('progressFill').style.width = percent + '%';
        document.getElementById('progressText').textContent = text;
    }

    showVideo() {
        document.getElementById('videoSection').style.display = 'block';
        const video = document.getElementById('outputVideo');
        video.src = URL.createObjectURL(this.videoBlob);
    }

    hideSections(sections) {
        sections.forEach(section => {
            document.getElementById(section).style.display = 'none';
        });
    }

    downloadVideo() {
        if (this.videoBlob) {
            const url = URL.createObjectURL(this.videoBlob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `text-to-video-${Date.now()}.webm`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL
